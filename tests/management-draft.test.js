import test from 'node:test';
import assert from 'node:assert/strict';
import { orderChanged, configChanged, draftKind, selectedAfterDelete, selectionAfterRemoval } from '../src/utils/management-draft.js';
const ws = [{id:'one'}, {id:'two'}];
const config = {categories:[{category:'A',services:[{id:'x'}, {id:'y'}]},{category:'B',services:[]}]};
test('workspace order is independent of display-name edits', () => {
  assert.equal(orderChanged(ws, [{id:'one',name:'Other'}, {id:'two'}]), false);
  assert.equal(orderChanged(ws, [...ws].reverse()), true);
});
test('all categories share the same content draft', () => {
  const draft = structuredClone(config);
  draft.categories[0].services.reverse();
  assert.equal(configChanged(config, draft), true);
  assert.equal(draftKind(ws, ws, config, draft), 'config');
});
test('different persistence areas must not be dirty together', () => {
  assert.equal(draftKind(ws, [...ws].reverse(), config, config), 'workspaces');
  assert.equal(draftKind(ws, ws, config, config), null);
  const changed = structuredClone(config); changed.categories.reverse();
  assert.equal(draftKind(ws, [...ws].reverse(), config, changed), 'conflict');
});
test('selection after deletion moves to next existing item, or first', () => {
  assert.equal(selectedAfterDelete(1, 3), 1);
  assert.equal(selectedAfterDelete(2, 2), 1);
  assert.equal(selectedAfterDelete(0, 0), 0);
});

test('removing preceding category keeps selected category identity', () => {
  assert.equal(selectionAfterRemoval(2,0,2),1);
  assert.equal(selectionAfterRemoval(1,1,2),1);
  assert.equal(selectionAfterRemoval(0,0,0),0);
});

test('pending actions resolve stable identities after sorting was discarded', async () => {
  const { workspaceIndexById, categoryIndexByName, serviceIndexById } = await import('../src/utils/management-draft.js');
  const reordered=[...ws].reverse();
  assert.equal(workspaceIndexById(ws,reordered[0].id),1);
  const reorderedCategories=structuredClone(config);
  reorderedCategories.categories.reverse();
  assert.equal(categoryIndexByName(config,reorderedCategories.categories[0].category),1);
  const reversedServices=structuredClone(config);
  reversedServices.categories[0].services.reverse();
  assert.equal(serviceIndexById(config,0,reversedServices.categories[0].services[0].id),1);
});
