import test from 'node:test';
import assert from 'node:assert/strict';
import { moveCategory, moveService, servicePosition, toggleCollapsed, categoryCollapseKey } from '../src/utils/reorder.js';
import { generateShortcuts } from '../src/utils/shortcuts.js';
const makeConfig = () => ({ categories: [
  { category: 'Tools', services: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }] },
  { category: 'Home', services: [{ id: 'c', name: 'C' }] },
], searchEngines: [] });
test('category reordering is immutable and obeys boundaries', () => {
  const original = makeConfig();
  assert.equal(moveCategory(original, 0, -1), null);
  assert.deepEqual(moveCategory(original, 0, 1).categories.map(c => c.category), ['Home', 'Tools']);
  assert.equal(original.categories[0].category, 'Tools');
});
test('service reordering retains stable ids and category', () => {
  const original = makeConfig();
  const next = moveService(original, 'b', -1);
  assert.deepEqual(next.categories[0].services.map(s => s.id), ['b', 'a']);
  assert.deepEqual(original.categories[0].services.map(s => s.id), ['a', 'b']);
  assert.deepEqual(servicePosition(next, 'b'), { categoryIndex: 0, index: 0, count: 2 });
  assert.equal(moveService(next, 'missing', 1), null);
  assert.equal(moveService(next, 'b', -1), null);
});
test('collapse state is workspace scoped and toggles immutably', () => {
  assert.notEqual(categoryCollapseKey('alice', 'home'), categoryCollapseKey('bob', 'home'));
  const old = { Tools: false }; const next = toggleCollapsed(old, 'Tools');
  assert.equal(next.Tools, true); assert.equal(old.Tools, false);
});

test('reordering preserves generated keyboard shortcuts even when names collide', () => {
  const config = { categories: [
    { category: 'Apps', services: [{ id: '1', name: 'Github' }, { id: '2', name: 'Gitea' }] },
    { category: 'Accounts', services: [{ id: '3', name: 'Email' }] },
  ] };
  const before = generateShortcuts(config.categories);
  const moved = moveCategory(config, 0, 1);
  assert.deepEqual(moved.categories.map(c => c.categoryKey), [...before].reverse().map(c => c.categoryKey));
  const servicesMoved = moveService(config, '2', -1);
  assert.deepEqual(servicesMoved.categories[0].services.map(s => s.key), [...before[0].services].reverse().map(s => s.key));
});
