import { demoFetch as fetch } from './demo-backend.js';
let workspaceContext = null;
export function setWorkspaceContext(context) { workspaceContext = context ? { ...context } : null; }
export function getWorkspaceContext() { return workspaceContext ? { ...workspaceContext } : null; }
export function setWorkspaceETag(etag, { user, id }) {
  if (workspaceContext?.user === user && workspaceContext?.id === id) {
    workspaceContext = { ...workspaceContext, etag };
  }
}

export function configRequest(base = '/', context = workspaceContext) {
  return { url: `${base}config/services.json${context ? '?workspace=' + encodeURIComponent(context.id) : ''}`, headers: context ? { 'X-JumpKey-User': context.user } : {} };
}
import { validateConfig } from './config-validator.js';

// Deterministic legacy IDs let offline browsers migrate the same file consistently.
// Once saved, IDs are retained independently of names, URLs and category order.
export function migrateConfig(input) {
  const config = Array.isArray(input) ? { categories: input, searchEngines: [] } : input;
  if (!validateConfig(config)) throw new Error('Invalid configuration');
  const result = structuredClone(config);
  const used = new Set(result.categories.flatMap(c => c.services.map(s => s.id).filter(Boolean)));
  for (const category of result.categories) {
    for (const service of category.services) {
      if (service.id) continue;
      const seed = JSON.stringify([category.category, service.name, service.url]);
      let hash = 14695981039346656037n;
      for (const byte of new TextEncoder().encode(seed)) hash = BigInt.asUintN(64, (hash ^ BigInt(byte)) * 1099511628211n);
      const base = `svc-${hash.toString(16)}`;
      let id = base;
      for (let suffix = 2; used.has(id); suffix++) id = `${base}-${suffix}`;
      service.id = id;
      used.add(id);
    }
  }
  return result;
}

export function migrateReferences(config, favorites, history) {
  const services = config.categories.flatMap(c => c.services);
  const resolve = value => services.find(s => s.id === value)?.id ?? services.find(s => s.name === value)?.id;
  return {
    favorites: Object.fromEntries(Object.entries(favorites && typeof favorites === 'object' && !Array.isArray(favorites) ? favorites : {})
      .filter(([slot]) => /^[0-9]$/.test(slot)).map(([slot, value]) => [slot, resolve(value)]).filter(([, id]) => id)),
    history: [...new Set((Array.isArray(history) ? history : []).map(resolve).filter(Boolean))].slice(0, 10),
  };
}

export async function persistConfig(config, { base = '/', fetcher = fetch } = {}) {
  if (import.meta.env?.VITE_DEMO_MODE === 'true') {
    return migrateConfig(config);
  }
  if (workspaceContext?.readOnly) throw new Error('Read-only configuration');
  const normalized = migrateConfig(config);

  if (!workspaceContext?.etag) throw new Error('Configuration version missing. Reload the workspace before saving.');
  const currentContext = workspaceContext;
  const request = configRequest(base, currentContext);
  const response = await fetcher(request.url, {
    method: 'PUT', headers: { ...request.headers, 'Content-Type': 'application/json', 'If-Match': currentContext.etag },
    body: JSON.stringify(normalized, null, 2),
  });
  if (!response.ok) {
    let payload;
    try { payload = await response.json(); } catch {}
    const error = new Error(payload?.error?.message || `Configuration save failed: ${response.status}`);
    error.status = response.status;
    error.code = payload?.error?.code;
    throw error;
  }
  setWorkspaceETag(response.headers?.get('ETag') || null, currentContext);
  return normalized;
}
