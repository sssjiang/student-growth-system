import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createAppStore } from '../src/store/index.js';
import { readSession, signedIn, signedOut } from '../src/store/authSlice.js';
import { toastShown } from '../src/store/toastSlice.js';
import { authenticatedRequest } from '../src/api/baseApi.js';
import { studentAPI } from '../src/api/StudentAPI.js';
import {
  deferred,
  json,
  memoryStorage,
  session,
  testStore,
  waitFor,
} from './helpers.mjs';

test('restores a complete session and rejects malformed or partial storage', () => {
  const saved = session();
  assert.deepEqual(
    readSession(
      memoryStorage({
        student_token: saved.token,
        student_user: JSON.stringify(saved.user),
      })
    ),
    { ...saved, version: 0 }
  );
  for (const entries of [
    { student_token: 'token', student_user: '{broken' },
    { student_user: JSON.stringify(saved.user) },
    { student_token: 'token', student_user: '{"id":1,"role":"unknown"}' },
  ])
    assert.equal(readSession(memoryStorage(entries)).user, null);
});

test('login persists, logout clears credentials and private query data', async (t) => {
  const { store, storage } = testStore(t);
  t.mock.method(globalThis, 'fetch', async () => json({ student: { id: 1 } }));
  await store.dispatch(studentAPI.endpoints.getProfile.initiate()).unwrap();
  assert.equal(storage.getItem('student_token'), 'token-1');
  store.dispatch(signedOut());
  assert.equal(store.getState().auth.user, null);
  assert.equal(storage.getItem('student_token'), null);
  assert.equal(storage.getItem('student_user'), null);
  assert.deepEqual(store.getState().api.queries, {});
});

test('401 clears Redux auth, persistence and cached data together', async (t) => {
  const { store, storage } = testStore(t);
  t.mock.method(globalThis, 'fetch', async (_url, options) => {
    assert.equal(options.headers.Authorization, 'Bearer token-1');
    return json({ error: '登录已过期，请重新登录' }, 401);
  });
  await store.dispatch(studentAPI.endpoints.getProfile.initiate());
  assert.equal(store.getState().auth.token, null);
  assert.equal(storage.getItem('student_user'), null);
  assert.deepEqual(store.getState().api.queries, {});
});

test('a late response from an old session cannot sign out the new user', async (t) => {
  const { store } = testStore(t);
  const response = deferred();
  t.mock.method(globalThis, 'fetch', () => response.promise);
  const request = authenticatedRequest('/student/profile', store);
  store.dispatch(signedIn(session(2)));
  response.resolve(json({ error: 'expired' }, 401));
  assert.equal((await request).error.status, 'SESSION_CHANGED');
  assert.equal(store.getState().auth.user.id, 2);
});

test('switching accounts aborts active queries and discards late data', async (t) => {
  const { store } = testStore(t);
  const response = deferred();
  let signal;
  t.mock.method(globalThis, 'fetch', (_url, options) => {
    signal = options.signal;
    return response.promise;
  });
  const request = store.dispatch(studentAPI.endpoints.getProfile.initiate());
  store.dispatch(signedIn(session(2)));
  assert.equal(signal.aborted, true);
  response.resolve(json({ student: { id: 1 } }));
  await request;
  assert.equal(store.getState().auth.user.id, 2);
  assert.deepEqual(store.getState().api.queries, {});
});

test('file previews also expire the session without storing Blobs', async (t) => {
  const { store } = testStore(t);
  t.mock.method(globalThis, 'fetch', async () =>
    json({ error: 'expired' }, 401)
  );
  const result = await authenticatedRequest(
    { url: '/files/1', blob: true },
    store
  );
  assert.equal(result.error.status, 401);
  assert.equal(store.getState().auth.user, null);
  assert.deepEqual(store.getState().api.queries, {});
});

test('a new toast gets its full display duration', async () => {
  const store = createAppStore({ storage: memoryStorage(), toastDuration: 60 });
  store.dispatch(toastShown('first'));
  await new Promise((resolve) => setTimeout(resolve, 35));
  store.dispatch(toastShown('second'));
  await new Promise((resolve) => setTimeout(resolve, 35));
  assert.equal(store.getState().toast.message, 'second');
  await waitFor(() => store.getState().toast.message === '');
});
