// GitHub Pages demo adapter. The only network requests are for bundled, static
// /config/*.json files; all /api/* and writable config routes are handled here.
// Changes are session-only and disappear on a full page reload.
const bundledWorkspaces = [
  { id: 'default', name: '', file: 'services.json' },
  { id: 'home', name: 'Home', file: 'home.workspace.json' },
  { id: 'work', name: 'Work', file: 'work.workspace.json' },
];

export function createDemoFetch(base, fetcher) {
  // Pages is mounted at /jump-key/, not /jump-key. The trailing slash is
  // essential for resolving config/services.json relative to the app root.
  const root = new URL(base.endsWith('/') ? base : `${base}/`,
    globalThis.location?.href || 'https://demo.invalid/');
  const prefix = root.pathname;
  const workspaces = structuredClone(bundledWorkspaces);
  const configs = new Map();
  const revisions = new Map();
  let orderRevision = 1;

  const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), {
    status, headers: { 'Content-Type': 'application/json', ...headers },
  });
  const fail = (status, message) => json({ error: { message } }, status);
  const configTag = id => `"demo-${id}-${revisions.get(id) || 1}"`;
  const orderTag = () => `"demo-order-${orderRevision}"`;
  const manifest = () => ({
    user: 'demo', readOnly: false, orderETag: orderTag(),
    workspaces: workspaces.map(workspace => ({ ...workspace })),
  });
  const requestHeaders = (input, options) => new Headers(options.headers || (input instanceof Request ? input.headers : undefined));
  const parseBody = async (input, options) => JSON.parse(options.body ?? (input instanceof Request ? await input.text() : ''));
  const load = async (id) => {
    if (configs.has(id)) return configs.get(id);
    const workspace = workspaces.find(item => item.id === id);
    if (!workspace) return null;
    const response = await fetcher(new URL(`config/${workspace.file}`, root).href, { cache: 'no-store' });
    if (!response.ok || !response.headers.get('content-type')?.includes('json')) {
      throw new Error(`Bundled demo configuration unavailable: ${workspace.file}`);
    }
    const config = await response.json();
    configs.set(id, config);
    revisions.set(id, 1);
    return config;
  };
  const verifyRevision = (headers, etag) => {
    const match = headers.get('If-Match');
    if (!match) return fail(428, 'Configuration version missing');
    if (match !== etag) return fail(412, 'Configuration has changed');
    return null;
  };

  return async (input, options = {}) => {
    const url = new URL(input instanceof Request ? input.url : input, root);
    const method = (options.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
    if (url.origin !== root.origin || !url.pathname.startsWith(prefix)) return fetcher(input, options);
    const path = url.pathname.slice(prefix.length);
    const headers = requestHeaders(input, options);

    if (path === 'api/workspaces') {
      if (method === 'GET') return json(manifest(), 200, { ETag: orderTag() });
      if (method !== 'POST') return fail(405, 'Method not allowed');
      let body;
      try { body = await parseBody(input, options); } catch { return fail(400, 'Invalid JSON'); }
      const { id, name, sourceId } = body || {};
      if (typeof id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)
          || id.length > 64 || typeof name !== 'string' || !name.trim()) return fail(400, 'Invalid workspace');
      if (workspaces.some(workspace => workspace.id === id)) return fail(409, 'Workspace exists');
      if (sourceId && !workspaces.some(workspace => workspace.id === sourceId)) return fail(404, 'Source workspace missing');
      let config;
      try { config = sourceId ? structuredClone(await load(sourceId)) : { categories: [], searchEngines: [] }; }
      catch { return fail(503, 'Source configuration unavailable'); }
      configs.set(id, { ...config, workspaceName: name.trim() });
      revisions.set(id, 1);
      workspaces.push({ id, name: name.trim(), file: `${id}.workspace.json` });
      orderRevision++;
      return json({ id, name: name.trim() }, 201);
    }

    if (path === 'api/workspace-order') {
      if (method !== 'PUT') return fail(405, 'Method not allowed');
      const error = verifyRevision(headers, orderTag());
      if (error) return error;
      let body;
      try { body = await parseBody(input, options); } catch { return fail(400, 'Invalid JSON'); }
      if (!Array.isArray(body?.order) || body.order.length !== workspaces.length
        || new Set(body.order).size !== workspaces.length
        || body.order.some(id => !workspaces.some(workspace => workspace.id === id))) return fail(400, 'Invalid order');
      const ordered = body.order.map(id => workspaces.find(workspace => workspace.id === id));
      workspaces.splice(0, workspaces.length, ...ordered);
      orderRevision++;
      return json({ order: body.order }, 200, { ETag: orderTag() });
    }

    if (path.startsWith('api/workspaces/')) {
      const id = decodeURIComponent(path.slice('api/workspaces/'.length));
      const index = workspaces.findIndex(workspace => workspace.id === id);
      if (index < 0) return fail(404, 'Workspace not found');
      if (!['PATCH', 'DELETE'].includes(method)) return fail(405, 'Method not allowed');
      try { await load(id); } catch { return fail(503, 'Configuration unavailable'); }
      const error = verifyRevision(headers, configTag(id));
      if (error) return error;
      if (method === 'DELETE') {
        if (workspaces.length === 1) return fail(409, 'Cannot delete the last workspace');
        workspaces.splice(index, 1);
        configs.delete(id);
        revisions.delete(id);
        orderRevision++;
        return json({ deleted: id });
      }
      let body;
      try { body = await parseBody(input, options); } catch { return fail(400, 'Invalid JSON'); }
      const nextId = body?.id ?? id;
      if (typeof nextId !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(nextId)
        || (nextId !== id && workspaces.some(workspace => workspace.id === nextId))) return fail(409, 'Invalid or duplicate workspace ID');
      const name = typeof body?.name === 'string' ? body.name.trim() : workspaces[index].name;
      if (!name) return fail(400, 'Workspace name required');
      const config = { ...configs.get(id), workspaceName: name };
      configs.delete(id);
      configs.set(nextId, config);
      const revision = (revisions.get(id) || 1) + 1;
      revisions.delete(id);
      revisions.set(nextId, revision);
      workspaces[index] = { id: nextId, name, file: nextId === id ? workspaces[index].file : `${nextId}.workspace.json` };
      orderRevision++;
      return json({ id: nextId, name }, 200, { ETag: configTag(nextId) });
    }

    if (path === 'config/services.json') {
      const id = url.searchParams.get('workspace') || 'default';
      if (!workspaces.some(workspace => workspace.id === id)) return fail(404, 'Unknown workspace');
      if (!['GET', 'PUT'].includes(method)) return fail(405, 'Method not allowed');
      let current;
      try { current = await load(id); } catch { return fail(503, 'Demo configuration unavailable'); }
      if (method === 'GET') return json(current, 200, { ETag: configTag(id) });
      const error = verifyRevision(headers, configTag(id));
      if (error) return error;
      let data;
      try { data = await parseBody(input, options); } catch { return fail(400, 'Invalid JSON'); }
      if (!data || typeof data !== 'object' || !Array.isArray(data.categories) || !Array.isArray(data.searchEngines)) {
        return fail(400, 'Invalid configuration');
      }
      configs.set(id, data);
      revisions.set(id, (revisions.get(id) || 1) + 1);
      return json({ ok: true }, 200, { ETag: configTag(id) });
    }

    // GitHub Pages rewrites missing files to HTML. Never mistake that for a
    // successful API response or accidentally send demo API calls to Pages.
    if (path.startsWith('api/')) return fail(404, 'API endpoint unavailable in demo');
    return fetcher(input, options);
  };
}
