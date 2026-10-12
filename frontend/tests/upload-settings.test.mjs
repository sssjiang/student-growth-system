import assert from 'node:assert/strict';
import { test } from 'node:test';
import { uploadAPI } from '../src/api/UploadAPI.js';
import { authenticatedRequest } from '../src/api/baseApi.js';
import { errorMessage } from '../src/api/errors.js';
import { fileExceedsLimit } from '../src/utils/files.js';
import { json, testStore, waitFor } from './helpers.mjs';

test('saving upload limits updates shared policy cache and refetches it', async (t) => {
  const { store } = testStore(t);
  let limits = { credential: 10, knowledge: 40, grades: 10 };
  let reads = 0;
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    if (options.method === 'PUT') {
      assert.equal(url, '/api/admin/settings/upload-limits');
      limits = JSON.parse(options.body);
      return json({ upload_limits: limits });
    }
    reads += 1;
    return json({ upload_limits: limits, min_mb: 1, max_mb: 100 });
  });
  await store.dispatch(uploadAPI.endpoints.getUploadLimits.initiate()).unwrap();
  const next = { credential: 2, knowledge: 60, grades: 3 };
  await store
    .dispatch(uploadAPI.endpoints.updateUploadLimits.initiate(next))
    .unwrap();
  assert.deepEqual(
    uploadAPI.endpoints.getUploadLimits.select()(store.getState()).data
      .upload_limits,
    next
  );
  await waitFor(() => reads === 2);
});

test('file-size checks allow the exact boundary and reject one extra byte', () => {
  const mb = 1024 * 1024;
  assert.equal(fileExceedsLimit({ size: 2 * mb }, 2), false);
  assert.equal(fileExceedsLimit({ size: 2 * mb + 1 }, 2), true);
  assert.equal(fileExceedsLimit({ size: 2 * mb + 1 }, 3), false);
  assert.equal(fileExceedsLimit(null, 2), false);
});

test('upload errors preserve the active limit for translated messages', async (t) => {
  const { store } = testStore(t);
  t.mock.method(globalThis, 'fetch', async () =>
    json(
      {
        error: '文件不能超过 25MB',
        code: 'FILE_TOO_LARGE',
        details: { limit_mb: 25, category: 'knowledge' },
      },
      413
    )
  );
  const { error } = await authenticatedRequest('/teacher/knowledge', store);
  const message = errorMessage(
    error,
    (key, values) => `${key}:${values.limit}`
  );
  assert.equal(message, 'apiErrors.fileTooLarge:25');
});
