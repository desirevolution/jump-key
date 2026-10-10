import { readJsonStorage, writeJsonStorage } from './storage.js';
import { normalizeTimings } from './preferences.js';
import { getTheme } from '../themes/themes.js';
export function normalizeWorkspacePreferences(value = {}) {
  return { theme:getTheme(value?.theme).id, gridView:value?.gridView !== false, timings:normalizeTimings(value?.timings) };
}
export function loadWorkspacePreferences(user, id, legacy) {
  const key = name => `jumpkey:${encodeURIComponent(user)}:${name}:preferences`;
  let defaults = readJsonStorage(key('default'), null);
  if (!defaults) {
    defaults = normalizeWorkspacePreferences(legacy);
    writeJsonStorage(key('default'), defaults);
  }
  const existing = readJsonStorage(key(id), null);
  const value = normalizeWorkspacePreferences(existing || defaults);
  if (!existing) writeJsonStorage(key(id), value);
  return value;
}

export const WORKSPACE_PREFERENCES_MODE = 'jumpkey-workspace-preferences-enabled';
export function workspacePreferencesEnabled() { return readJsonStorage(WORKSPACE_PREFERENCES_MODE, false) === true; }
export function effectivePreferencesId(id, enabled = workspacePreferencesEnabled()) { return enabled ? id : 'default'; }
