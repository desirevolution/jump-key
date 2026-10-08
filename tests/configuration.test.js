import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { migrateConfig, migrateReferences, persistConfig } from '../src/utils/configuration.js';
import { validateConfig } from '../src/utils/config-validator.js';
import { generateShortcuts, getFavorites, getContinueServices } from '../src/utils/shortcuts.js';
const legacy = () => ({ categories: [{ category: 'Tools', services: [{ name: 'One', url: '/one' }, { name: 'One', url: '/two' }] }], searchEngines: [] });

test('bundled configurations migrate without losing fields and are idempotent', () => {
  for (const file of ['config/services.json', 'public/config/services.json']) {
    const original = JSON.parse(readFileSync(new URL('../' + file, import.meta.url)));
    const migrated = migrateConfig(original);
    assert.deepEqual(migrateConfig(migrated), migrated);
    assert.ok(migrated.categories.flatMap(c => c.services).every(s => s.id));
  }
});
test('IDs are deterministic, unique, and survive renames', () => {
  const original = legacy(), migrated = migrateConfig(original);
  assert.equal(original.categories[0].services[0].id, undefined);
  assert.deepEqual(migrateConfig(original), migrated);
  const ids = migrated.categories[0].services.map(s => s.id);
  assert.equal(new Set(ids).size, 2);
  migrated.categories[0].services[0].name = 'Renamed';
  assert.deepEqual(migrateConfig(migrated).categories[0].services.map(s => s.id), ids);
});
test('legacy references preserve first match and ID references survive rename', () => {
  const config = migrateConfig(legacy());
  const refs = migrateReferences(config, { 1: 'One' }, ['One', 'Missing']);
  assert.equal(refs.favorites[1], config.categories[0].services[0].id);
  config.categories[0].services[0].name = 'Renamed';
  assert.equal(getFavorites(config.categories, refs.favorites)[0].name, 'Renamed');
  assert.equal(getContinueServices(config.categories, refs.history)[0].name, 'Renamed');
  assert.deepEqual(migrateReferences(config, refs.favorites, refs.history), refs);
});
test('malformed and duplicate inputs are rejected without throwing', () => {
  for (const value of [null, [], {}, { categories: [null], searchEngines: [] }, { categories: [{ category: 'X', services: [null] }], searchEngines: [] }]) assert.equal(validateConfig(value), false);
  const config = migrateConfig(legacy());
  config.categories[0].services[1].id = config.categories[0].services[0].id;
  assert.equal(validateConfig(config), false);
});
test('explicit shortcuts are reserved before automatic assignment', () => {
  const result = generateShortcuts([{ category: 'Alpha', services: [{ name: 'Alpha' }, { name: 'Other', key: 'a' }] }, { category: 'Other', categoryKey: 'a', services: [] }]);
  assert.notEqual(result[0].categoryKey, 'a');
  assert.notEqual(result[0].services[0].key, 'a');
});
test('save awaits server confirmation and rejects failed writes', async () => {
  let captured;
  const result = await persistConfig(legacy(), { base: '/jump-key/', fetcher: async (...args) => { captured = args; return { ok: true }; } });
  assert.equal(captured[0], '/jump-key/config/services.json');
  assert.deepEqual(JSON.parse(captured[1].body), result);
  await assert.rejects(persistConfig(legacy(), { fetcher: async () => ({ ok: false, status: 500 }) }), /500/);
});

test('workspace persistence uses the selected workspace and expected user', async () => {
  const { setWorkspaceContext, persistConfig } = await import('../src/utils/configuration.js');
  setWorkspaceContext({ id: 'work', user: 'arthur' });
  try {
    await persistConfig({ categories: [], searchEngines: [] }, { fetcher: async (url, options) => {
      assert.equal(url, '/config/services.json?workspace=work');
      assert.equal(options.headers['X-JumpKey-User'], 'arthur');
      return { ok: true };
    }});
  } finally { setWorkspaceContext(null); }
});
