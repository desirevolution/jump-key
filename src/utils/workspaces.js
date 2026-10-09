import { demoFetch as fetch } from './demo-backend.js';
import { loadWorkspacePreferences, effectivePreferencesId } from './workspace-preferences.js';
import { loadTheme, applyTheme } from './theme.js';
import { readJsonStorage, writeJsonStorage } from './storage.js';
import { configRequest, setWorkspaceContext, migrateConfig } from './configuration.js';
import { categoryCollapseKey } from './reorder.js';
import { workspaceStorage } from './workspace-storage.js';
import { migrateWorkspaceIDs, cleanupRemovedWorkspaceCaches } from './workspace-migration.js';
import { cacheManifest, cachedLatestManifest, cachedWorkspace, cacheWorkspace, reconcileOfflineCache } from './offline-cache.js';
import { prefetchWorkspaces } from './workspace-prefetch.js';
export { workspaceStorage, migrateWorkspaceIDs };
const base = import.meta.env.BASE_URL;
export async function initializeWorkspaces(app) {
 let data;
 let offline = false;
 try {
  const response = await fetch(`${base}api/workspaces`, {cache:'no-store'});
  if (response.status === 404 || (response.ok && response.headers.get('content-type')?.includes('text/html'))) return false;
  if (!response.ok) throw new Error('Workspace list unavailable');
  data=await response.json();
  if (typeof data.user !== 'string' || !Array.isArray(data.workspaces)) throw new Error('Invalid workspace list');
  const previousManifest=readJsonStorage('jumpkey-workspace-manifest',null);
  migrateWorkspaceIDs(data.user,data.renames);
  cleanupRemovedWorkspaceCaches(previousManifest,data);
  writeJsonStorage('jumpkey-workspace-manifest',data);
  try { await cacheManifest(data); await reconcileOfflineCache(data.user, data.workspaces.map(w=>w.id), data.renames); }
  catch (error) { console.warn('Offline workspace database unavailable', error); }
 } catch(error) {
  // Only a failed network request may reuse the last known identity offline.
  if (!(error instanceof TypeError)) throw error;
  data=readJsonStorage('jumpkey-workspace-manifest',null);
  if (!data) { try { data=await cachedLatestManifest(); } catch {} }
  if (!data) throw error;
  offline = true;
 }
 app.offlineMode=offline;
 app.serverReadOnly=data.readOnly === true;
 app.readOnly=app.serverReadOnly || offline;
 app.workspaceUser=data.user;
 app.workspaces=data.workspaces;
 app.workspaceOrderETag=data.orderETag || null;
 const explicit=new URLSearchParams(location.search).get('workspace');
 const remembered=readJsonStorage(`jumpkey-active:${data.user}`,null);
 const fallback=data.workspaces.find(w=>w.id==='default')?.id || data.workspaces[0]?.id;
 const id=explicit || (data.workspaces.some(w=>w.id===remembered) ? remembered : fallback);
 await switchWorkspace(app,id,true);
 if (!offline) startWorkspacePrefetch(app, data);
 else app.offlineCacheStatus=await offlineCacheProgress(data);
 return true;
}
export async function switchWorkspace(app,id,initial=false) {
 const target=app.workspaces.find(w=>w.id===id);
 if (!target) { app.showToast(app.t('workspaceFailed'),'error'); return; }
 const token=(app.workspaceLoadToken || 0)+1;
 app.workspaceLoadToken=token;
 app.workspaceLoading=true;
 app.workspaceRequested=id;
 app.cancelPendingAction();
 app.cancelInputResetTimer();
 const keys=workspaceStorage(app.workspaceUser,id);
 try {
  let config;
  let etag = null;
  const request=configRequest(base,{user:app.workspaceUser,id});
  let response;
  try { response=await fetch(request.url,{headers:request.headers,cache:'no-store'}); }
  catch(error) {
    if (!(error instanceof TypeError)) throw error;
    try { config=await cachedWorkspace(app.workspaceUser,id); } catch {}
    config ||= readJsonStorage(keys.configCache,null);
    if (!config) throw error;
    app.offlineMode=true;
    app.readOnly=true;
  }
  if (response) {
    if (!response.ok || response.headers.get('content-type')?.includes('text/html')) throw new Error('Workspace load failed');
    etag=response.headers.get('ETag'); config=await response.json();
    app.offlineMode=false;
    app.readOnly=app.serverReadOnly === true;
  }
  config=migrateConfig(config);
  if (response) { try { await cacheWorkspace(app.workspaceUser,id,config,etag); } catch {} }
  if (app.workspaceLoadToken!==token) return;
  const marker='jumpkey-legacy-migrated';
  if (id==='default' && !readJsonStorage(marker,false)) {
   for (const [key,legacy,fallback] of [['favorites','dashboard_favs',{}],['continueHistory','dashboard_continue',[]]]) {
    if (readJsonStorage(keys[key],null)===null) writeJsonStorage(keys[key],readJsonStorage(legacy,fallback));
   }
   writeJsonStorage(marker,true);
  }
  const settings = loadWorkspacePreferences(app.workspaceUser,effectivePreferencesId(id),{
    theme:loadTheme(), gridView:readJsonStorage('dashboard_grid_view',true), timings:readJsonStorage('dashboard_timings',{})
  });
  keys.preferences=workspaceStorage(app.workspaceUser,effectivePreferencesId(id)).preferences;
  app.storageKeys=keys;
  app.collapsedCategories=readJsonStorage(categoryCollapseKey(app.workspaceUser,id),{});
  app.theme=applyTheme(settings.theme);
  app.isGridView=settings.gridView;
  app.preferences=settings.timings;
  app.favorites=readJsonStorage(keys.favorites,{});
  app.continueHistory=readJsonStorage(keys.continueHistory,[]);
  app.workspaceId=id;
  setWorkspaceContext({user:app.workspaceUser,id,readOnly:app.readOnly,etag});
  app.resetInput(false);
  app.favoriteRecording=null;
  app.applyConfiguration(config);
  writeJsonStorage(`jumpkey-active:${app.workspaceUser}`,id);
  const url=new URL(location.href); url.searchParams.set('workspace',id);
  history.replaceState({},'',url);
 } catch(error) { app.showToast(app.t('workspaceFailed'),'error'); }
 finally { if(app.workspaceLoadToken===token) app.workspaceLoading=false; }
}


export function startWorkspacePrefetch(app, manifest) {
  const identity = manifest.user;
  const generation = (app.workspacePrefetchGeneration || 0) + 1;
  app.workspacePrefetchGeneration = generation;
  // Keep the selected workspace and any pending form draft untouched.
  return prefetchWorkspaces(manifest, {
    base,
    onProgress: progress => {
      if (app.workspacePrefetchGeneration === generation && app.workspaceUser === identity) {
        app.offlineCacheStatus = progress;
        app.requestUpdate?.();
      }
    },
  }).catch(error => console.warn('Workspace offline prefetch failed', error));
}

// Reconcile after connectivity returns; the backend identity must be validated
// before restoring write access or replacing an offline workspace manifest.
export async function reconnectWorkspaces(app) {
  const response = await fetch(`${base}api/workspaces`, { cache: 'no-store' });
  if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) return false;
  const manifest = await response.json();
  if (typeof manifest.user !== 'string' || !Array.isArray(manifest.workspaces)) return false;
  const previous = readJsonStorage('jumpkey-workspace-manifest', null);
  // Never leave one account's cards visible if online authentication switches
  // to another account while its new workspace config is still loading.
  if (app.workspaceUser !== manifest.user) {
    app.configuration=null;
    app.categories=[];
    app.searchEngines=[];
    app.favorites={};
    app.continueHistory=[];
  }
  migrateWorkspaceIDs(manifest.user, manifest.renames);
  cleanupRemovedWorkspaceCaches(previous, manifest);
  writeJsonStorage('jumpkey-workspace-manifest', manifest);
  try { await cacheManifest(manifest); await reconcileOfflineCache(manifest.user, manifest.workspaces.map(w=>w.id), manifest.renames); } catch {}
  app.workspaceUser = manifest.user;
  app.workspaces = manifest.workspaces;
  app.workspaceOrderETag = manifest.orderETag || null;
  app.serverReadOnly = manifest.readOnly === true;
  // Write access is restored only once the current config has been loaded.
  app.readOnly = app.serverReadOnly || app.offlineMode;
  const preferred = manifest.renames?.[app.workspaceId] || app.workspaceId;
  const id = manifest.workspaces.some(w=>w.id===preferred) ? preferred : manifest.workspaces[0]?.id;
  if (id) await switchWorkspace(app, id);
  startWorkspacePrefetch(app, manifest);
  return !app.offlineMode;
}


export async function offlineCacheProgress(manifest) {
  let available=0;
  const failures=[];
  for(const workspace of manifest.workspaces || []) {
    let cached=null;
    try { cached=await cachedWorkspace(manifest.user,workspace.id); } catch {}
    cached ||= readJsonStorage(workspaceStorage(manifest.user,workspace.id).configCache,null);
    if(cached) available++;
    else failures.push(workspace.id);
  }
  return { available, total: (manifest.workspaces||[]).length, failures };
}
