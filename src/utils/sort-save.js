import { migrateConfig } from './configuration.js';
import { generateShortcuts } from './shortcuts.js';

// Rebase *only* the user's requested order onto the latest server data.
// Fields edited elsewhere are retained, never replaced with an old snapshot.
function sameOrder(a, b) {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function sameMembers(a, b) {
  return a.length === b.length && new Set(a).size === a.length && new Set(b).size === b.length
    && a.every(value => b.includes(value));
}

function conflict(message) {
  const error = new Error(message);
  error.status = 412;
  error.code = 'precondition_failed';
  throw error;
}

/**
 * Only sort operations can be rebased safely. If a list was reordered by
 * somebody else (or its members changed), preserve the draft and report 412.
 */
export function rebaseSortConfiguration(baseline, draft, serverConfig) {
  const before = migrateConfig(baseline);
  const desired = migrateConfig(draft);
  const fresh = migrateConfig(serverConfig);

  const keys = categories => categories.map(cat => cat.category);
  const oldCategories = keys(before.categories);
  const newCategories = keys(desired.categories);
  const serverCategories = keys(fresh.categories);
  if (!sameMembers(oldCategories, newCategories) || !sameMembers(oldCategories, serverCategories)) {
    conflict('Kategorien wurden zwischenzeitlich hinzugefügt, entfernt oder umbenannt.');
  }

  const categoryReordered = !sameOrder(oldCategories, newCategories);
  if (categoryReordered && !sameOrder(serverCategories, oldCategories)) {
    conflict('Die Kategorie-Reihenfolge wurde inzwischen anders geändert.');
  }

  // Pin inferred shortcuts on the latest version before shifting any rows;
  // preserve concurrently edited URLs, names and other fields.
  fresh.categories = generateShortcuts(fresh.categories);
  for (const oldCategory of before.categories) {
    const name = oldCategory.category;
    const desiredCategory = desired.categories.find(cat => cat.category === name);
    const serverCategory = fresh.categories.find(cat => cat.category === name);
    const ids = category => category.services.map(service => service.id);
    const originalOrder = ids(oldCategory);
    const wantedOrder = ids(desiredCategory);
    const latestOrder = ids(serverCategory);
    if (!sameMembers(originalOrder, wantedOrder)) {
      conflict(`Services in „${name}“ haben sich im Entwurf unerwartet geändert.`);
    }
    if (sameOrder(originalOrder, wantedOrder)) continue;
    if (!sameMembers(originalOrder, latestOrder) || !sameOrder(originalOrder, latestOrder)) {
      conflict(`Services in „${name}“ wurden auf dem Server verändert oder sortiert.`);
    }
    const byId = new Map(serverCategory.services.map(service => [service.id, service]));
    serverCategory.services = wantedOrder.map(id => byId.get(id));
  }

  if (categoryReordered) {
    const byName = new Map(fresh.categories.map(cat => [cat.category, cat]));
    fresh.categories = newCategories.map(name => byName.get(name));
  }
  return fresh;
}

/** Fetches a fresh strong ETag before writing, without disabling If-Match. */
export async function prepareSortSave({ base = '/', user, id, baseline, draft, fetcher = fetch }) {
  const response = await fetcher(`${base}config/services.json?workspace=${encodeURIComponent(id)}`, {
    cache: 'no-store', headers: { 'X-JumpKey-User': user || '' },
  });
  if (!response.ok) {
    const error = new Error(`Workspace konnte nicht aktualisiert werden (HTTP ${response.status}).`);
    error.status = response.status;
    throw error;
  }
  const etag = response.headers.get('ETag');
  if (!etag) throw new Error('Server hat keinen ETag geliefert. Die Sortierung wurde nicht gespeichert.');
  const serverConfig = await response.json();
  return { config: rebaseSortConfiguration(baseline, draft, serverConfig), etag };
}
