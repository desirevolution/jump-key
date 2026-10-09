// Demo branch only: replace the config API with static files and in-memory saves.
// Keep the two imports in configuration.js/workspaces.js when rebasing.
const workspaces = [
  { id: 'default', name: '', file: 'services.json' },
  { id: 'home', name: 'Home', file: 'home.workspace.json' },
  { id: 'work', name: 'Work', file: 'work.workspace.json' },
];

export function createDemoFetch(base, fetcher) {
  const saved = new Map(); // A page reload discards all demo edits.
  const json = (body, status = 200) => new Response(JSON.stringify(body), {
    status, headers: { 'Content-Type': 'application/json' },
  });
  return async (input, options = {}) => {
    const root = new URL(base, globalThis.location?.href || 'https://demo.invalid/');
    const url = new URL(input instanceof Request ? input.url : input, root);
    const method = (options.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
    if (url.origin !== root.origin) return fetcher(input, options);
    if (url.pathname === `${root.pathname}api/workspaces` && method === 'GET') {
      return json({ user: 'demo', workspaces });
    }
    if (url.pathname !== `${root.pathname}config/services.json`) return fetcher(input, options);
    const id = url.searchParams.get('workspace') || 'default';
    const workspace = workspaces.find(item => item.id === id);
    if (!workspace) return json({ error: 'Unknown workspace' }, 404);
    if (method === 'PUT') {
      try {
        saved.set(id, JSON.parse(options.body ?? await input.text()));
        return json({ ok: true });
      } catch { return json({ error: 'Invalid JSON' }, 400); }
    }
    if (method !== 'GET') return json({ error: 'Method not allowed' }, 405);
    if (saved.has(id)) return json(saved.get(id));
    try {
      return await fetcher(new URL(`config/${workspace.file}`, root).href, { cache: 'no-store' });
    } catch {
      // Do not restore browser-cached edits after a reload, even when offline.
      return json({ error: 'Demo configuration unavailable' }, 503);
    }
  };
}

export const demoFetch = createDemoFetch(import.meta.env?.BASE_URL || '/', (...args) => globalThis.fetch(...args));
