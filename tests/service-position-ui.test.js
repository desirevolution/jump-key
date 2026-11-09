import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const component = readFileSync(new URL('../src/components/quick-add.js', import.meta.url), 'utf8');

test('service editor renders localized position options directly below category', () => {
 const category = component.indexOf("<label>${this.t('quickCategory')}");
 const position = component.indexOf("<label>${this.t('servicePosition')}");
 const shortcuts = component.indexOf('<label>Shortcut-Vergabe');
 assert.ok(category >= 0 && category < position && position < shortcuts);
 assert.match(component, /<select name="position"/);
 assert.match(component, /positionTop/);
 assert.match(component, /positionAfter/);
 assert.match(component, /positionBottom/);
 assert.match(component, /servicePositionTargets\(this.config, this.category, this.serviceId\)/);
 assert.match(component, /@change=\$\{e=>this.position=e.target.value\}/);
});

test('category change keeps original position only when returning to the source', () => {
 assert.match(component, /this\.serviceId && category === String\(this\.sourceIndex\)/);
 assert.match(component, /this\.originalPosition \?\? 'bottom'/);
 assert.match(component, /this\.position = this\.serviceId && category/);
 assert.match(component, /this\.category = category/);
 assert.match(component, /this\.changeCategory\(e.target.value\)/);
});

test('category selection resets to last and restores the original slot on return', async () => {
 const { runInNewContext } = await import('node:vm');
 const js = component.replace(/^import .*;\s*$/gm, '').replace('export class QuickAdd', 'class QuickAdd').replaceAll('import.meta.env.BASE_URL', '"/"');
 const context = {
  LitElement: class {},
  customElements: { define() {} },
  html() {},
 };
 runInNewContext(`${js}\nglobalThis.QuickAdd = QuickAdd;`, context);
 const editor = new context.QuickAdd();
 editor.config = { categories: [
  {category:'Original',services:[{id:'first'},{id:'editing'},{id:'third'}]},
  {category:'Other',services:[]},
 ]};
 editor.serviceId = 'editing';
 editor.originalPosition = 'after:first';
 editor.position = 'after:first';
 editor.keyEdited = true;
 editor.changeCategory('1');
 assert.equal(editor.position, 'bottom');
 assert.equal(editor.category, '1');
 editor.position = 'top';
 editor.changeCategory('0');
 assert.equal(editor.position, 'after:first');
 assert.equal(editor.category, '0');
});
