import { loadWorkspacePreferences, effectivePreferencesId } from './workspace-preferences.js';
import { loadTheme, applyTheme } from './theme.js';
import { readJsonStorage, writeJsonStorage } from './storage.js';
import { configRequest, setWorkspaceContext, migrateConfig } from './configuration.js';
const base = import.meta.env.BASE_URL;
export function workspaceStorage(user,id) {
 const scope = `jumpkey:${encodeURIComponent(user)}:${id}:`;
 return { favorites:scope+'favorites', continueHistory:scope+'history', configCache:scope+'config', preferences:scope+'preferences' };
}
export async function initializeWorkspaces(app) {
 let data;
 try {
  const response = await fetch(`${base}api/workspaces`, {cache:'no-store'});
  if (response.status === 404 || (response.ok && response.headers.get('content-type')?.includes('text/html'))) return false;
  if (!response.ok) throw new Error('Workspace list unavailable');
  data=await response.json();
  if (typeof data.user !== 'string' || !Array.isArray(data.workspaces)) throw new Error('Invalid workspace list');
  writeJsonStorage('jumpkey-workspace-manifest',data);
 } catch(error) {
  // Only a failed network request may reuse the last known identity offline.
  if (!(error instanceof TypeError)) throw error;
  data=readJsonStorage('jumpkey-workspace-manifest',null);
  if (!data) throw error;
 }
 app.readOnly=data.readOnly === true;
 app.workspaceUser=data.user;
 app.workspaces=data.workspaces;
 const explicit=new URLSearchParams(location.search).get('workspace');
 const remembered=readJsonStorage(`jumpkey-active:${data.user}`,null);
 const fallback=data.workspaces.find(w=>w.id==='default')?.id || data.workspaces[0]?.id;
 const id=explicit || (data.workspaces.some(w=>w.id===remembered) ? remembered : fallback);
 await switchWorkspace(app,id,true);
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
  const request=configRequest(base,{user:app.workspaceUser,id});
  let response;
  try { response=await fetch(request.url,{headers:request.headers,cache:'no-store'}); }
  catch(error) { if (!(error instanceof TypeError)) throw error; config=readJsonStorage(keys.configCache,null); if (!config) throw error; }
  if (response) { if (!response.ok) throw new Error('Workspace load failed'); config=await response.json(); }
  config=migrateConfig(config);
  if (app.workspaceLoadToken!==token) return;
  const marker='jumpkey-legacy-migrated';
  if (id==='default' && !readJsonStorage(marker,false)) {
   for (const [key,legacy,fallback] of [['favorites','dashboard_favs',{}],['continueHistory','dashboard_continue',[]]]) {
    if (readJsonStorage(keys[key],null)===null) writeJsonStorage(keys[key],readJsonStorage(legacy,fallback));
   }
   writeJsonStorage(marker,true);
  }
  const settings = loadWorkspacePreferences(app.workspaceUser,effectivePreferencesId(id),{
    theme:loadTheme(), gridView:readJsonStorage('dashboard_grid_view',false), timings:readJsonStorage('dashboard_timings',{})
  });
  keys.preferences=workspaceStorage(app.workspaceUser,effectivePreferencesId(id)).preferences;
  app.storageKeys=keys;
  app.theme=applyTheme(settings.theme);
  app.isGridView=settings.gridView;
  app.preferences=settings.timings;
  app.favorites=readJsonStorage(keys.favorites,{});
  app.continueHistory=readJsonStorage(keys.continueHistory,[]);
  app.workspaceId=id;
  setWorkspaceContext({user:app.workspaceUser,id,readOnly:app.readOnly});
  app.resetInput(false);
  app.favoriteRecording=null;
  app.applyConfiguration(config);
  writeJsonStorage(`jumpkey-active:${app.workspaceUser}`,id);
  const url=new URL(location.href); url.searchParams.set('workspace',id);
  history.replaceState({},'',url);
 } catch(error) { app.showToast(app.t('workspaceFailed'),'error'); }
 finally { if(app.workspaceLoadToken===token) app.workspaceLoading=false; }
}
