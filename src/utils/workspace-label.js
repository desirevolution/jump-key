// Display-only workspace names. IDs still identify files, URLs and browser storage.
export function workspaceLabel(id, configuredName) {
  const name = typeof configuredName === 'string' ? configuredName.trim() : '';
  if (name) return name;
  if (id === 'default') return ''; // Translated by the app.
  const label = id.replaceAll('-', ' ');
  return label.charAt(0).toUpperCase() + label.slice(1);
}
