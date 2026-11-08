import test from 'node:test';
import assert from 'node:assert/strict';
import {
  offlineCacheKey, cacheManifest, cachedManifest, cachedLatestManifest,
  cacheWorkspace, cachedWorkspace, reconcileOfflineCache, clearOfflineDatabase,
} from '../src/utils/offline-cache.js';

// Small asynchronous IndexedDB fake: exercises storage transactions and the
// newer-cache-wins race, not just static helpers.
function makeIndexedDB() {
  const databases = new Map();
  return {
    open(name) {
      const request = {};
      queueMicrotask(() => {
        let db = databases.get(name);
        const fresh = !db;
        if (!db) {
          const stores = new Map();
          db = {
            objectStoreNames: { contains: key => stores.has(key) },
            createObjectStore(key) { stores.set(key, new Map()); },
            close() {},
            transaction(key) {
              const values = stores.get(key);
              const tx = { pending: 0, completeScheduled: false, oncomplete: null };
              const scheduleComplete = () => {
                if (tx.pending || tx.completeScheduled) return;
                tx.completeScheduled = true;
                queueMicrotask(() => {
                  tx.completeScheduled = false;
                  if (tx.pending === 0) tx.oncomplete?.();
                });
              };
              const request = operation => {
                const req = {};
                tx.pending++;
                queueMicrotask(() => {
                  req.result = operation();
                  req.onsuccess?.();
                  tx.pending--;
                  scheduleComplete();
                });
                return req;
              };
              tx.objectStore = () => ({
                put: value => request(() => { values.set(value.key ?? value.user, structuredClone(value)); return value.key ?? value.user; }),
                get: key => request(() => structuredClone(values.get(key))),
                getAll: () => request(() => [...values.values()].map(x => structuredClone(x))),
                delete: key => request(() => values.delete(key)),
              });
              return tx;
            },
          };
          databases.set(name, db);
        }
        request.result = db;
        if (fresh) request.onupgradeneeded?.();
        request.onsuccess?.();
      });
      return request;
    },
    deleteDatabase(name) {
      const request = {};
      queueMicrotask(() => { databases.delete(name); request.onsuccess?.(); });
      return request;
    },
  };
}

test('offline cache separates user identities and workspace IDs', async () => {
  const original = globalThis.indexedDB;
  globalThis.indexedDB = makeIndexedDB();
  try {
    const a = { categories: [{ category: 'private-A', services: [] }], searchEngines: [] };
    const b = { categories: [{ category: 'private-B', services: [] }], searchEngines: [] };
    await cacheManifest({ user: 'alice', workspaces: [{ id: 'home' }] });
    await cacheManifest({ user: 'bob', workspaces: [{ id: 'home' }] });
    assert.equal((await cachedManifest('alice')).user, 'alice');
    assert.equal((await cachedLatestManifest()).user, 'bob');
    await cacheWorkspace('alice', 'home', a, 'etag-a', { fetchedAt: 100 });
    await cacheWorkspace('bob', 'home', b, 'etag-b', { fetchedAt: 100 });
    await cacheWorkspace('alice', 'home', b, 'stale-etag', { fetchedAt: 50 });
    assert.equal((await cachedWorkspace('alice', 'home')).categories[0].category, 'private-A');
    assert.equal((await cachedWorkspace('bob', 'home')).categories[0].category, 'private-B');
    assert.notEqual(offlineCacheKey('alice', 'home'), offlineCacheKey('bob', 'home'));
    await reconcileOfflineCache('alice', ['renamed'], { home: 'renamed' });
    assert.equal((await cachedWorkspace('alice', 'renamed')).categories[0].category, 'private-A');
    assert.equal(await cachedWorkspace('alice', 'home'), null);
    assert.equal((await cachedWorkspace('bob', 'home')).categories[0].category, 'private-B');
    await clearOfflineDatabase();
    assert.equal(await cachedWorkspace('bob', 'home'), null);
  } finally {
    globalThis.indexedDB = original;
  }
});
