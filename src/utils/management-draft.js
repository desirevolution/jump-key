/** Draft boundaries are storage boundaries, not the currently visible column. */
export function orderChanged(before, after) {
  return JSON.stringify((before || []).map(x => x.id)) !== JSON.stringify((after || []).map(x => x.id));
}
export function configChanged(before, after) {
  return before !== null && before !== undefined && JSON.stringify(before) !== JSON.stringify(after);
}
export function draftKind(workspaces, workspaceDraft, config, configDraft) {
  const order = orderChanged(workspaces, workspaceDraft);
  const contents = configChanged(config, configDraft);
  if (order && contents) return 'conflict';
  return order ? 'workspaces' : contents ? 'config' : null;
}
export function selectedAfterDelete(index, newLength) {
  return newLength ? Math.min(index, newLength - 1) : 0;
}

/** Keep the same selected item when a preceding category was removed. */
export function selectionAfterRemoval(selected, removed, remaining) {
  if (!remaining) return 0;
  if (removed < selected) return selected - 1;
  return selectedAfterDelete(selected, remaining);
}

/** Resolve row actions by identity, never by stale indices after Save/Discard. */
export function workspaceIndexById(workspaces, id) {
  return (workspaces || []).findIndex(item=>item.id===id);
}
export function categoryIndexByName(config, name) {
  return (config?.categories || []).findIndex(item=>item.category===name);
}
export function serviceIndexById(config, categoryIndex, id) {
  return (config?.categories?.[categoryIndex]?.services || []).findIndex(item=>item.id===id);
}
