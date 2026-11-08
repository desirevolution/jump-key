import { getWorkspaceContext, setWorkspaceETag } from './configuration.js';

// User identity is checked by the backend; this header also detects a switched session.
export function workspaceHeaders(user, extra = {}) {
  return { 'Content-Type': 'application/json', 'X-JumpKey-User': user ?? '', ...extra };
}

export function workspaceSlug(value) {
  return value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64);
}

export async function createWorkspaceRequest({ base = '/', user, id, name, sourceId = '', fetcher = fetch }) {
  const response = await fetcher(`${base}api/workspaces`, {
    method: 'POST',
    headers: workspaceHeaders(user, { 'If-None-Match': '*' }),
    body: JSON.stringify({ id, name, ...(sourceId ? { sourceId } : {}) }),
  });
  if (!response.ok) throw await workspaceError(response);
  return response.json();
}

export async function renameWorkspaceRequest({ base = '/', user, id, name, fetcher = fetch }) {
  const context = getWorkspaceContext();
  if (context?.id !== id || context.user !== user || !context.etag) {
    const error = new Error('Current workspace version unavailable'); error.status = 428; throw error;
  }
  const response = await fetcher(`${base}api/workspaces/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: workspaceHeaders(user, { 'If-Match': context.etag }),
    body: JSON.stringify({ name }),
  });
  if (!response.ok) throw await workspaceError(response);
  const etag = response.headers?.get('ETag');
  setWorkspaceETag(etag, { user, id });
  return etag;
}

export async function workspaceError(response) {
  let payload;
  try { payload = await response.json(); } catch {}
  const error = new Error(payload?.error?.message || `Workspace request failed: ${response.status}`);
  error.status = response.status;
  error.code = payload?.error?.code;
  return error;
}

export function validateWorkspaceForm({ id, name, mode }) {
  if (!name || name.length > 64 || /[\x00-\x1f\x7f]/.test(name)) return 'invalid_name';
  if (mode !== 'rename' && (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) || id.length > 64)) return 'invalid_id';
  return null;
}
