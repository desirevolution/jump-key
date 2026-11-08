import { readJsonStorage, writeJsonStorage } from './storage.js';
import { categoryCollapseKey } from './reorder.js';
import { workspaceStorage } from './workspace-storage.js';
export function migrateWorkspaceIDs(user, renames = {}) {
  if (!renames || typeof renames !== 'object') return;
  const resolve = id => {
    const seen = new Set();
    while (typeof renames[id] === 'string' && !seen.has(id)) { seen.add(id); id = renames[id]; }
    return id;
  };
  for (const oldId of Object.keys(renames)) {
    const newId = resolve(oldId);
    if (oldId === newId) continue;
    const oldKeys = workspaceStorage(user,oldId), newKeys = workspaceStorage(user,newId);
    for (const type of ['favorites','continueHistory','configCache','preferences']) {
      // Do not overwrite data already saved by the destination workspace.
      const oldData = readJsonStorage(oldKeys[type],null);
      if (oldData!==null && readJsonStorage(newKeys[type],null)===null) writeJsonStorage(newKeys[type],oldData);
    }
    const oldCollapsed=categoryCollapseKey(user,oldId), newCollapsed=categoryCollapseKey(user,newId);
    const collapsed=readJsonStorage(oldCollapsed,null);
    if(collapsed!==null && readJsonStorage(newCollapsed,null)===null) writeJsonStorage(newCollapsed,collapsed);
  }
  const activeKey=`jumpkey-active:${user}`;
  const active=readJsonStorage(activeKey,null);
  if(typeof active==='string' && active!==resolve(active))writeJsonStorage(activeKey,resolve(active));
}

// A successful online manifest is authoritative about deleted workspaces.
export function cleanupRemovedWorkspaceCaches(previous, current) {
  if (!previous || previous.user !== current?.user) return;
  const stillPresent = new Set((current.workspaces||[]).map(w=>w.id));
  for (const workspace of previous.workspaces||[]) {
    if(stillPresent.has(workspace.id))continue;
    const keys=workspaceStorage(current.user,workspace.id);
    for (const key of Object.values(keys)) globalThis.localStorage?.removeItem(key);
    globalThis.localStorage?.removeItem(categoryCollapseKey(current.user,workspace.id));
  }
}
