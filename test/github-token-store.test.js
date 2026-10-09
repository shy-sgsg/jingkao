import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { clearGitHubToken, loadGitHubToken, saveGitHubToken } from '../src/data/githubTokenStore.js';

function makeIndexedDB() {
  const stores = new Map();
  const database = {
    objectStoreNames: { contains: (name) => stores.has(name) },
    createObjectStore(name) { stores.set(name, new Map()); },
    transaction(names) {
      const transaction = {};
      transaction.objectStore = (name) => {
        const values = stores.get(name);
        return {
          get(key) {
            const request = {};
            queueMicrotask(() => { request.result = values.get(key); request.onsuccess?.(); });
            return request;
          },
          put(value, key) {
            const request = {};
            values.set(key, value);
            queueMicrotask(() => request.onsuccess?.());
            return request;
          },
          delete(key) {
            const request = {};
            values.delete(key);
            queueMicrotask(() => request.onsuccess?.());
            return request;
          },
        };
      };
      return transaction;
    },
    close() {},
  };
  return {
    stores,
    indexedDB: {
      open() {
        const request = {};
        queueMicrotask(() => {
          request.result = database;
          request.onupgradeneeded?.({ target: { result: database } });
          request.onsuccess?.();
        });
        return request;
      },
    },
  };
}

test('token uses a non-exportable IndexedDB device key and never persists plaintext', async () => {
  const { indexedDB, stores } = makeIndexedDB();
  const token = 'github_pat_sensitive_example_value';
  const saved = await saveGitHubToken(token, { indexedDBImpl: indexedDB, cryptoApi: webcrypto });
  assert.equal(saved.persistence, 'device');

  const key = stores.get('crypto-keys').get('device-key-v1');
  assert.equal(key.extractable, false);
  const serializedValues = JSON.stringify([...stores.values()].map((store) => [...store.values()]));
  assert.equal(serializedValues.includes(token), false);
  assert.deepEqual(await loadGitHubToken({ indexedDBImpl: indexedDB, cryptoApi: webcrypto }), { token, persistence: 'device' });

  await clearGitHubToken({ indexedDBImpl: indexedDB });
  assert.equal(await loadGitHubToken({ indexedDBImpl: indexedDB, cryptoApi: webcrypto }), null);
});

test('unavailable IndexedDB offers session-only token use without persistent storage', async () => {
  const token = 'github_pat_session_only_value';
  const result = await saveGitHubToken(token, { indexedDBImpl: null, cryptoApi: webcrypto });
  assert.equal(result.persistence, 'session');
  assert.equal(result.token, token);
  assert.equal(await loadGitHubToken({ indexedDBImpl: null, cryptoApi: webcrypto }), null);
});

test('empty tokens are rejected and clearing remains safe without IndexedDB', async () => {
  await assert.rejects(saveGitHubToken('  ', { indexedDBImpl: null, cryptoApi: webcrypto }), /Token/);
  await clearGitHubToken({ indexedDBImpl: null });
});
