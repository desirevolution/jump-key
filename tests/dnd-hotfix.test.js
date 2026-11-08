import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dragInsertionIndex } from '../src/utils/sort-preview.js';

const source=readFileSync(new URL('../src/components/sortable-list.js',import.meta.url),'utf8');
const styles=readFileSync(new URL('../src/style.css',import.meta.url),'utf8');

const rows=[
  {id:'alpha',center:40},
  {id:'beta',center:100},
  {id:'gamma',center:160},
  {id:'delta',center:220},
];

test('a dragged row can be dropped at the top, middle or bottom',()=>{
  assert.equal(dragInsertionIndex(10,rows,'beta'),0);
  assert.equal(dragInsertionIndex(140,rows,'beta'),1);
  assert.equal(dragInsertionIndex(190,rows,'beta'),2);
  assert.equal(dragInsertionIndex(250,rows,'beta'),3);
  assert.equal(dragInsertionIndex(250,rows,'delta'),3);
  assert.equal(dragInsertionIndex(250,rows,'alpha'),3);
});

test('a missing or ambiguous drag source does not silently jump to the top',()=>{
  assert.equal(dragInsertionIndex(200,rows,'unknown'),null);
  assert.equal(dragInsertionIndex(200,[...rows,{id:'beta',center:270}],'beta'),null);
  assert.equal(dragInsertionIndex(200,[], 'beta'),null);
});

test('DOM hit testing uses the stable source ID rather than data attribute presence',()=>{
  assert.match(source,/row\.dataset\.sortId/);
  assert.match(source,/dragInsertionIndex\(this\._pointer\.y,rowCenters,sourceId\)/);
  assert.match(source,/\?data-drag-source=\$\{source\}/);
  assert.doesNotMatch(source,/filter\(row=>!row\.hasAttribute\('data-drag-source'\)\)/);
});

test('editor forms have an enclosing settings-style border; footer has no floating card',()=>{
  assert.match(styles,/\.jk-settings-service-editor \.jk-quick-inline form,\s*\.jk-settings-service-editor \.jk-quick-inline \.jk-service-delete-confirm,\s*\.jk-manager-subview \.jk-manager-form/);
  assert.match(styles,/border:1px solid color-mix\(in srgb,var\(--jk-border-strong\) 52%,transparent\)/);
  assert.match(styles,/\.jk-settings-service-editor \.jk-quick-inline footer,\s*\.jk-manager-subview \.jk-manager-footer/);
  assert.match(styles,/box-shadow:none;/);
  assert.match(styles,/position:sticky;/);
});
