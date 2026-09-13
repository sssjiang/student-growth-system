import assert from 'node:assert/strict';
import { test } from 'node:test';
import { studentAPI } from '../src/api/StudentAPI.js';
import { teacherAPI } from '../src/api/TeacherAPI.js';
import { errorMessage } from '../src/api/errors.js';
import { deferred, json, testStore, waitFor } from './helpers.mjs';

test('subscribers share one request and a successful mutation refreshes their cache', async (t) => {
  const { store } = testStore(t);
  const firstResponse = deferred();
  let reads = 0;
  t.mock.method(globalThis, 'fetch', async (_url, options) => {
    if (options.method === 'DELETE') return json({ message: 'deleted' });
    reads += 1;
    return reads === 1 ? firstResponse.promise : json({ files: [] });
  });
  const first = store.dispatch(studentAPI.endpoints.getFiles.initiate());
  const second = store.dispatch(studentAPI.endpoints.getFiles.initiate());
  assert.equal(reads, 1);
  firstResponse.resolve(json({ files: [{ id: 1 }] }));
  await Promise.all([first.unwrap(), second.unwrap()]);
  await store.dispatch(studentAPI.endpoints.deleteFile.initiate(1)).unwrap();
  await waitFor(
    () =>
      studentAPI.endpoints.getFiles.select()(store.getState()).data?.files
        .length === 0
  );
  assert.equal(reads, 2);
  first.unsubscribe();
  second.unsubscribe();
});

test('uploads send multipart data with auth and cache only serializable results', async (t) => {
  const { store } = testStore(t);
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, '/api/student/files');
    assert.equal(options.headers.Authorization, 'Bearer token-1');
    assert.equal(options.headers['Content-Type'], undefined);
    assert.ok(options.body instanceof FormData);
    assert.equal(options.body.get('title'), 'Award');
    assert.equal(await options.body.get('file').text(), 'certificate');
    return json({ files: [{ id: 3 }] }, 201);
  });
  await store
    .dispatch(
      studentAPI.endpoints.uploadFile.initiate({
        file: new File(['certificate'], 'award.txt'),
        metadata: { title: 'Award' },
      })
    )
    .unwrap();
  assert.doesNotThrow(() => JSON.stringify(store.getState()));
});

test('review mutations send the expected body and refresh filtered credential queries', async (t) => {
  const { store } = testStore(t);
  let reads = 0;
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    if (options.method === 'PUT') {
      assert.equal(url, '/api/teacher/credentials/7/review');
      assert.deepEqual(JSON.parse(options.body), {
        status: 'rejected',
        comment: 'Unreadable',
      });
      return json({ files: [] });
    }
    assert.equal(url, '/api/teacher/credentials?status=pending');
    reads += 1;
    return json({ credentials: reads === 1 ? [{ id: 7 }] : [], counts: {} });
  });
  await store
    .dispatch(teacherAPI.endpoints.getCredentials.initiate('pending'))
    .unwrap();
  await store
    .dispatch(
      teacherAPI.endpoints.reviewCredential.initiate({
        id: 7,
        status: 'rejected',
        comment: 'Unreadable',
      })
    )
    .unwrap();
  await waitFor(
    () =>
      teacherAPI.endpoints.getCredentials.select('pending')(store.getState())
        .data?.credentials.length === 0
  );
});

test('a new tutor conversation receives the accepted exchange in the query cache', async (t) => {
  const { store } = testStore(t);
  t.mock.method(globalThis, 'fetch', async () =>
    json({
      conversation_id: 9,
      message: { id: 20, role: 'assistant', content: 'Answer', citations: [] },
    })
  );
  await store
    .dispatch(
      studentAPI.endpoints.sendTutorMessage.initiate({
        subject: 'math',
        message: 'Question',
        conversationId: null,
      })
    )
    .unwrap();
  await waitFor(
    () =>
      studentAPI.endpoints.getTutorConversation.select(9)(store.getState()).data
        ?.messages.length === 2
  );
  const data = studentAPI.endpoints.getTutorConversation.select(9)(
    store.getState()
  ).data;
  assert.equal(data.messages[0].content, 'Question');
  assert.equal(data.messages[1].content, 'Answer');
});

test('API errors retain translation keys and readable fallback messages', () => {
  assert.equal(
    errorMessage({ message: '请先登录' }, (key) => key),
    'apiErrors.signInRequired'
  );
  assert.equal(
    errorMessage({ message: 'Custom error' }, (key) => key),
    'Custom error'
  );
  assert.equal(
    errorMessage({}, (key) => key),
    'common.requestFailed'
  );
});
