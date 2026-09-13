import assert from 'node:assert/strict';
import { test } from 'node:test';
import { studentAPI } from '../src/api/StudentAPI.js';
import { deferred, json, testStore, waitFor } from './helpers.mjs';

const cachedProfile = (store) =>
  studentAPI.endpoints.getProfile.select()(store.getState()).data.student;

test('saving publishes the server profile before unwrap completes, even while refetch is pending', async (t) => {
  const { store } = testStore(t);
  const refresh = deferred();
  const original = { name: 'Original', tags: ['math'] };
  const saved = { name: 'Normalized by server', tags: ['science'] };
  let reads = 0;
  t.mock.method(globalThis, 'fetch', async (_url, options) => {
    if (options.method === 'PUT') return json({ student: saved });
    return ++reads === 1 ? json({ student: original }) : refresh.promise;
  });
  await store.dispatch(studentAPI.endpoints.getProfile.initiate()).unwrap();
  await store
    .dispatch(
      studentAPI.endpoints.updateProfile.initiate({
        name: 'Draft',
        tags: ['science'],
      })
    )
    .unwrap();
  assert.deepEqual(cachedProfile(store), saved);

  const latest = { name: 'Updated elsewhere', tags: ['art'] };
  refresh.resolve(json({ student: latest }));
  await waitFor(() => cachedProfile(store).name === latest.name);
  assert.deepEqual(cachedProfile(store), latest);
});

test('a failed save leaves the saved profile unchanged', async (t) => {
  const { store } = testStore(t);
  const original = { name: 'Original', tags: ['math'] };
  t.mock.method(globalThis, 'fetch', async (_url, options) =>
    options.method === 'PUT'
      ? json({ error: 'Save failed' }, 500)
      : json({ student: original })
  );
  await store.dispatch(studentAPI.endpoints.getProfile.initiate()).unwrap();
  await assert.rejects(
    store
      .dispatch(
        studentAPI.endpoints.updateProfile.initiate({
          name: 'Unsaved draft',
          tags: [],
        })
      )
      .unwrap(),
    (error) => error.status === 500
  );
  assert.deepEqual(cachedProfile(store), original);
});
