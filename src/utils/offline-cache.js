// Phase 4: user-scoped, browser-local copies of workspace JSON. Never use a
// service-worker HTTP cache for authenticated API responses.
const DB_NAME = 'jumpkey-offline-v1';
const DB_VERSION = 1;
let dbPromise;
let lastManifestTimestamp = 0;

function database() {
  if (!globalThis.indexedDB) return Promise.reject(new Error('IndexedDB unavailable'));
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('workspaces')) db.createObjectStore('workspaces', { keyPath: 'key' });
        if (!db.objectStoreNames.contains('manifests')) db.createObjectStore('manifests', { keyPath: 'user' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('Offline database blocked'));
    }).catch(error => { dbPromise = null; throw error; });
  }
  return dbPromise;
}

function work(storeName, mode, operation) {
  return database().then(db => new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const request = operation(transaction.objectStore(storeName));
    let result;
    if (request) {
      const onSuccess = request.onsuccess;
      request.onsuccess = event => { onSuccess?.call(request, event); result = request.result; };
    }
    transaction.oncomplete = () => resolve(result);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error || new Error('Offline transaction aborted'));
  }));
}

export const offlineCacheKey = (user, id) => `${user}\u0000${id}`;

export async function cacheManifest(manifest) {
  if (typeof manifest?.user !== 'string' || !Array.isArray(manifest.workspaces)) return false;
  const cachedAt = Math.max(Date.now(), lastManifestTimestamp + 1);
  lastManifestTimestamp = cachedAt;
  await work('manifests', 'readwrite', store => store.put({ user: manifest.user, data: structuredClone(manifest), cachedAt }));
  return true;
}

export async function cachedManifest(user) {
  const record = await work('manifests', 'readonly', store => store.get(user));
  return record?.data ?? null;
}

export async function cachedLatestManifest() {
  const records = await work('manifests', 'readonly', store => store.getAll());
  return (records || []).sort((a, b) => b.cachedAt - a.cachedAt)[0]?.data ?? null;
}

export async function cacheWorkspace(user, id, config, etag = null, { fetchedAt = Date.now() } = {}) {
  if (typeof user !== 'string' || typeof id !== 'string') return false;
  const key = offlineCacheKey(user, id);
  const record = { key, user, id, config: structuredClone(config), etag, cachedAt: fetchedAt };
  // A slower prefetch response must not overwrite a more recent local save.
  await work('workspaces', 'readwrite', store => {
    const lookup = store.get(key);
    lookup.onsuccess = () => {
      if (!lookup.result || lookup.result.cachedAt <= fetchedAt) store.put(record);
    };
    return lookup;
  });
  return true;
}

export async function cachedWorkspace(user, id) {
  const record = await work('workspaces', 'readonly', store => store.get(offlineCacheKey(user, id)));
  return record?.config ?? null;
}

export async function reconcileOfflineCache(user, ids, renames = {}) {
  const keep = new Set(ids);
  const all = await work('workspaces', 'readonly', store => store.getAll());
  for (const item of all) {
    if (item.user !== user) continue;
    const newId = resolveRename(item.id, renames);
    if (newId !== item.id && keep.has(newId)) {
      const destination = await cachedWorkspace(user, newId);
      if (!destination) await cacheWorkspace(user, newId, item.config, null);
    }
    if (!keep.has(item.id)) await work('workspaces', 'readwrite', store => store.delete(item.key));
  }
}

function resolveRename(id, renames) {
  const seen = new Set();
  while (typeof renames?.[id] === 'string' && !seen.has(id)) {
    seen.add(id);
    id = renames[id];
  }
  return id;
}

// Explicit local-data reset includes IndexedDB; do not delete automatically
// when offline, since the cached configuration may be the only usable copy.
export async function clearOfflineDatabase() {
  if (!globalThis.indexedDB) return;
  const db = await database();
  db.close();
  dbPromise = null;
  await new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Close other JumpKey tabs before resetting offline data'));
  });
}
