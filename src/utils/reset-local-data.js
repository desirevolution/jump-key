import { migrateConfig, configRequest } from './configuration.js';

const localKeys = new Set([
  'services-cache', 'dashboard_favs', 'dashboard_continue', 'dashboard_grid_view', 'dashboard_timings',
  'jump-key-theme', 'jump-key-install-dismissed', 'jumpkey-workspace-manifest',
  'jumpkey-workspace-preferences-enabled', 'jumpkey-legacy-migrated',
]);
export function isJumpKeyData(key) {
  return localKeys.has(key) || key.startsWith('jumpkey:') || key.startsWith('jumpkey-active:');
}

// Probe the actual landing configuration without cache fallback before deleting anything.
export async function checkResetConnection({ base = '/', workspaceApi = true, fetcher = fetch } = {}) {
  const options = { cache: 'no-store', signal: AbortSignal.timeout(10000) };
  let context = null;
  if (workspaceApi) {
    const response = await fetcher(`${base}api/workspaces`, options);
    if (!response.ok) throw new Error('resetUnavailable');
    const data = await response.json();
    if (typeof data.user !== 'string' || !Array.isArray(data.workspaces)) throw new Error('resetUnavailable');
    const target = data.workspaces.find(w => w.id === 'default') || data.workspaces[0];
    if (!target || typeof target.id !== 'string') throw new Error('resetUnavailable');
    context = { user: data.user, id: target.id };
  }
  const request = configRequest(base, context);
  const response = await fetcher(request.url, { ...options, headers: request.headers });
  if (!response.ok) throw new Error('resetUnavailable');
  migrateConfig(await response.json());
}

export function clearLocalData(storage = localStorage) {
  const entries = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key !== null && isJumpKeyData(key)) entries.push([key, storage.getItem(key)]);
  }
  try { for (const [key] of entries) storage.removeItem(key); }
  catch (error) {
    // Best effort rollback if browser storage becomes unavailable mid-reset.
    for (const [key, value] of entries) { try { storage.setItem(key, value); } catch {} }
    throw error;
  }
}

export function resetDestination(href) {
  const url = new URL(href);
  for (const key of ['workspace', 'share', 'url', 'text', 'title']) url.searchParams.delete(key);
  url.hash = '';
  return url.href;
}
