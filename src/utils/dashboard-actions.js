import { persistConfig, getWorkspaceContext, setWorkspaceETag, configRequest } from './configuration.js';
import { moveCategory, moveService, categoryCollapseKey, toggleCollapsed } from './reorder.js';
import { readJsonStorage, writeJsonStorage } from './storage.js';

/** State-changing frontend actions, kept separate from Lit templates. */
export async function saveReorderedConfiguration(app, next) {
  if (app.readOnly || app.savingConfig || !next) return;
  const currentId = app.workspaceId;
  app.savingConfig = true;
  try {
    const config = await persistConfig(next, { base: import.meta.env.BASE_URL });
    if (app.workspaceId === currentId) app.applyConfiguration(config);
    app.showToast(app.t('orderSaved'), 'success');
  } catch (error) {
    app.showToast(error.status === 412 ? app.t('configConflict') : app.t('editConfigSaveFailed'), 'error');
  } finally { app.savingConfig = false; }
}

export function reorderCategory(app, index, direction) {
  return saveReorderedConfiguration(app, moveCategory(app.configuration, index, direction));
}

export function reorderService(app, id, direction) {
  return saveReorderedConfiguration(app, moveService(app.configuration, id, direction));
}

export function toggleCategory(app, categoryKey) {
  app.collapsedCategories = toggleCollapsed(app.collapsedCategories, categoryKey);
  writeJsonStorage(categoryCollapseKey(app.workspaceUser, app.workspaceId), app.collapsedCategories);
}

export async function compareServerConfiguration(app) {
  if (!app.showConfigModal || app.workspaceLoading) return;
  const context = getWorkspaceContext();
  if (!context) return;
  try {
    const request = configRequest(import.meta.env.BASE_URL, context);
    const response = await fetch(request.url, { headers: request.headers, cache: 'no-store' });
    if (!response.ok || !response.headers.get('ETag')) throw new Error('Server config unavailable');
    const data = await response.json();
    if (app.workspaceId !== context.id || app.workspaceUser !== context.user) return;
    app.serverSnapshot = { data, etag: response.headers.get('ETag'), id: context.id, user: context.user };
  } catch {
    app.showToast(app.t('workspaceFailed'), 'error');
  }
}

export function acceptServerRevision(app) {
  const snapshot = app.serverSnapshot;
  if (!snapshot || snapshot.id !== app.workspaceId || snapshot.user !== app.workspaceUser) return;
  // User explicitly accepts a new base ETag after comparing, not an automatic overwrite.
  setWorkspaceETag(snapshot.etag, { id: snapshot.id, user: snapshot.user });
  app.serverSnapshot = null;
  app.configSaveError = null;
}
