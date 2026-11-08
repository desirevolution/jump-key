import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { reorderPreview, insertionIndex } from '../src/utils/sort-preview.js';

const read = file => readFileSync(new URL('../src/' + file, import.meta.url), 'utf8');
const manager = read('components/management.js');
const sort = read('components/sortable-list.js');
const settings = read('components/config-modal.js');
const app = read('app.js');
const quick = read('components/quick-add.js');
const picker = read('components/icon-picker.js');
const css = read('style.css');

test('drag preview is immutable and leaves original IDs/order available for persistence', () => {
  const items=[{id:'one'},{id:'two'},{id:'three'}];
  assert.deepEqual(reorderPreview(items,0,2).map(x=>x.id),['two','three','one']);
  assert.deepEqual(reorderPreview(items,2,0).map(x=>x.id),['three','one','two']);
  assert.deepEqual(items.map(x=>x.id),['one','two','three']);
  assert.deepEqual(reorderPreview(items,0,0),items);
  assert.deepEqual(reorderPreview(items,-1,2),items);
  assert.deepEqual(reorderPreview(items,1,3),items);
  assert.deepEqual(reorderPreview(items,1,NaN),items);
});

test('insertion index chooses a position between other rows',()=>{
  assert.equal(insertionIndex(0,[40,100]),0);
  assert.equal(insertionIndex(60,[40,100]),1);
  assert.equal(insertionIndex(150,[40,100]),2);
});

test('management offers direct edit/copy/delete buttons, without dot menus',()=>{
  assert.match(manager, /ui:copy/);
  assert.match(manager, /ui:trash-2/);
  assert.match(manager, /_editButton\(`Workspace/);
  assert.match(manager, /_editButton\(`Kategorie/);
  assert.match(manager, /_editButton\(`Service/);
  assert.doesNotMatch(manager, /jk-manager-action-menu|_menu\(/);
  assert.match(manager, /Erweitert: Technische ID/);
});

test('second line renders URL and a separate shortcut that remains visible',()=>{
  assert.match(manager, /subtitleMain:s\.url/);
  assert.match(manager, /subtitleShortcut:s\.key/);
  assert.match(manager, /subtitleMain:`\$\{c\.services\.length\} Services`/);
  assert.match(sort, /jk-sort-meta-primary/);
  assert.match(sort, /jk-sort-meta-shortcut/);
  assert.match(css, /\.jk-sort-meta-shortcut \{flex:0 0 auto/);
});

test('one service editor is rendered in the persistent settings shell for both entry points',()=>{
  assert.equal((settings.match(/<jk-quick-add/g)||[]).length,1);
  assert.equal((app.match(/<jk-quick-add/g)||[]).length,0);
  assert.match(settings, /jk-settings-service-editor/);
  assert.match(settings, /jk-settings-background-content/);
  assert.match(settings, /\?hidden=\$\{this\.serviceEditor\}/);
  assert.match(app, /\.show=\$\{this\.showConfigModal\|\|this\.showQuickAdd\}/);
  assert.match(app, /@service-saved/);
});

test('shared Back control and Cancel invoke the same guarded service exit',()=>{
  assert.match(settings, /@click=\$\{this\._navigateBack\}/);
  assert.match(settings, /if \(this\.serviceEditor\) \{ this\._serviceClose\(\); return; \}/);
  assert.match(settings, /@request-close=\$\{e=>\{e\.stopPropagation\(\);this\._serviceClose\(\);\}\}/);
  assert.match(quick, /@click=\$\{this\.close\}/);
  assert.match(app, /@guard-discard=\$\{\(\)=>this\.closeQuickAdd\(\)\}/);
  assert.match(css, /\.jk-settings-service-editor \.jk-quick-inline footer/);
  assert.match(css, /\.jk-manager-subview \.jk-manager-footer/);
});

test('icon input keeps direct preview and remove only; no search/grid/recent icons',()=>{
  assert.match(picker, /jk-icon-preview-small/);
  assert.match(picker, /change-icon/);
  assert.match(picker, /jk-icon-clear/);
  assert.match(picker, /Iconify/);
  assert.doesNotMatch(picker, /PICKS|RECENT|localStorage|jk-icon-grid|type="search"/);
  assert.doesNotMatch(quick, /Erweiterte Optionen|jk-icon-details/);
});

test('dragging shows floating preview, insertion placeholder and supports keyboard, cancel, reduced motion',()=>{
  assert.match(sort, /jk-sort-floating/);
  assert.match(sort, /jk-sort-placeholder/);
  assert.match(sort, /requestAnimationFrame/);
  assert.match(sort, /_globalDragKey/);
  assert.match(sort, /_cancelPointer/);
  assert.match(sort, /ArrowDown/);
  assert.match(sort, /aria-live="polite"/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(css, /jk-sort-drop/);
  assert.match(css, /jk-sort-floating.*position:fixed/);
});
