import assert from 'node:assert/strict';
import { createAppStore } from '../src/store/index.js';
import { signedIn, signedOut } from '../src/store/authSlice.js';

export const session = (id = 1) => ({
  token: `token-${id}`,
  user: { id, name: `User ${id}`, role: 'student' },
});

export function memoryStorage(entries = {}) {
  const values = new Map(Object.entries(entries));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

export function testStore(t, entries) {
  const storage = memoryStorage(entries);
  const store = createAppStore({ storage, toastDuration: 30 });
  t.after(() => store.dispatch(signedOut()));
  store.dispatch(signedIn(session()));
  return { store, storage };
}

export const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export function deferred() {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

export async function waitFor(predicate) {
  const deadline = Date.now() + 1500;
  while (!predicate() && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  assert.ok(predicate(), 'Expected state transition did not complete');
}
