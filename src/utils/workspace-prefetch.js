import { configRequest, migrateConfig } from './configuration.js';
import { cacheWorkspace } from './offline-cache.js';
import { workspaceStorage } from './workspace-storage.js';
import { writeJsonStorage } from './storage.js';

// The workspace manifest is the sole authorization source for prefetching.
// No service worker runtime caching of /config or /api is permitted.
export async function prefetchWorkspaces(manifest, {
  base = '/', fetcher = fetch, onProgress = () => {}, concurrency = 2,
} = {}) {
  const { user, workspaces } = manifest;
  if (typeof user !== 'string' || !Array.isArray(workspaces)) throw new Error('Invalid manifest');
  const valid = [...new Set(workspaces.map(w => w.id).filter(id => typeof id === 'string'))];
  let next = 0;
  let available = 0;
  const failures = [];
  onProgress({ available, total: valid.length, failures: [] });
  async function worker() {
    while (next < valid.length) {
      const id = valid[next++];
      try {
        const startedAt = Date.now();
        const request = configRequest(base, { user, id });
        const response = await fetcher(request.url, { headers: request.headers, cache: 'no-store' });
        if (!response.ok || response.headers.get('content-type')?.includes('text/html')) throw new Error(`HTTP ${response.status}`);
        const config = migrateConfig(await response.json());
        // Quota or disabled IndexedDB must not break the dashboard. Preserve
        // the original per-user localStorage fallback as a best effort.
        let persisted;
        try { persisted = await cacheWorkspace(user, id, config, response.headers.get('ETag'), { fetchedAt: startedAt }); }
        catch { persisted = writeJsonStorage(workspaceStorage(user, id).configCache, config); }
        if (!persisted) throw new Error('Offline storage full');
        available++;
      } catch { failures.push(id); }
      onProgress({ available, total: valid.length, failures: [...failures] });
    }
  }
  await Promise.all(Array.from({ length: Math.min(Math.max(1, concurrency), valid.length) }, () => worker()));
  return { available, total: valid.length, failures };
}
