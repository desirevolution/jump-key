// Public dashboards only navigate to web URLs, including relative web links.
export function allowedNavigation(value, readOnly = false) {
  if (!readOnly) return true;
  try { return ['http:', 'https:'].includes(new URL(value, globalThis.location?.href || 'https://jumpkey.invalid/').protocol); }
  catch { return false; }
}
