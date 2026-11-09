import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { generateShortcuts, categorySelectionKey } from '../src/utils/shortcuts.js';
import { addCategory, editCategory, categoryError, suggestCategoryShortcut } from '../src/utils/management.js';
import { validateConfig } from '../src/utils/config-validator.js';

const config = () => ({searchEngines:[],categories:[
  {category:'Development',categoryKey:'d',services:[{id:'d1',name:'Git',url:'https://git.example',key:'g'}]},
  {category:'Media',categoryKey:'m',services:[{id:'m1',name:'Video',url:'https://video.example',key:'v'}]},
]});

test('category form mirrors service shortcut modes and A-Z manual picker',()=>{
  const manager=readFileSync(new URL('../src/components/management.js',import.meta.url),'utf8');
  assert.match(manager, /name="keyMode"/);
  for(const option of ['auto','manual','none']) assert.match(manager,new RegExp(`value="${option}"`));
  assert.match(manager, /jk-shortcut-grid/);
  assert.match(manager, /aria-pressed/);
  assert.match(manager, /\?disabled=\$\{taken\}/);
  assert.match(manager, /_categoryKeyMode: \{state:true\}/);
  assert.match(manager, /_categoryError=categoryError/);
  assert.match(manager, /addCategory\(this\._config,values\.name,values\.keyMode/);
});

test('create with automatic shortcut chooses next available letter and validates',()=>{
  const c = addCategory(config(),'Discovery');
  assert.equal(c.categories[2].categoryKey,'i'); // d is used, i is next letter in Discovery
  assert.equal(c.categories[2].shortcutDisabled,undefined);
  assert.equal(suggestCategoryShortcut(config(),'Development'), 'e');
  assert.equal(validateConfig(c),true);
});

test('manual category shortcut cannot duplicate an effective auto-assigned shortcut',()=>{
  const input=config();
  input.categories[1]={category:'Media',services:[]}; // auto-inferred M
  assert.equal(generateShortcuts(input.categories)[1].categoryKey,'m');
  assert.match(categoryError(input,'Another','m',-1,'manual'),/bereits belegt/);
  assert.throws(()=>addCategory(input,'Another','manual','m'),/bereits belegt/);
  assert.throws(()=>addCategory(input,'Another','manual',''),/Buchstaben/);
  assert.throws(()=>addCategory(input,'Another','manual','1'),/Buchstaben/);
  const result=addCategory(input,'Another','manual','a');
  assert.equal(result.categories[2].categoryKey,'a');
  assert.equal(validateConfig(result),true);
});

test('none mode persists and never gets an inferred category shortcut',()=>{
  const before=config();
  const edited=editCategory(before,0,'Development','', 'none');
  assert.equal(edited.categories[0].shortcutDisabled,true);
  assert.equal(edited.categories[0].categoryKey,undefined);
  assert.equal(generateShortcuts(edited.categories)[0].categoryKey,'');
  assert.equal(validateConfig(edited),true);
  const after=addCategory(edited,'Design','auto');
  assert.equal(after.categories[2].categoryKey,'d'); // freed key
  assert.equal(generateShortcuts(after.categories)[0].categoryKey,'');
  assert.equal(before.categories[0].categoryKey,'d');
  assert.equal(categorySelectionKey(after.categories[0]),'category-name:Development');
  assert.notEqual(categorySelectionKey(after.categories[0]),categorySelectionKey(after.categories[1]));
  const created=addCategory(config(),'No key','none');
  assert.equal(created.categories[2].shortcutDisabled,true);
  assert.equal(generateShortcuts(created.categories)[2].categoryKey,'');
});

test('mode switches preserve content and do not accidentally reassign keys',()=>{
  const original=config();
  const noKey=editCategory(original,0,'Renamed','','none');
  assert.equal(noKey.categories[0].services[0].id,'d1');
  const manual=editCategory(noKey,0,'Renamed','r','manual');
  assert.equal(manual.categories[0].categoryKey,'r');
  assert.equal(manual.categories[0].shortcutDisabled,undefined);
  const automatic=editCategory(manual,0,'Discovery','','auto');
  assert.equal(automatic.categories[0].categoryKey,'d');
  assert.equal(automatic.categories[0].services[0].id,'d1');
  assert.equal(validateConfig(automatic),true);
});

test('unassigned category remains reachable in grid, cards, keyboard navigation and collapse',()=>{
  const grid=readFileSync(new URL('../src/components/grid-view.js',import.meta.url),'utf8');
  const group=readFileSync(new URL('../src/components/service-group.js',import.meta.url),'utf8');
  const dashboard=readFileSync(new URL('../src/views/dashboard-content.js',import.meta.url),'utf8');
  const keyboard=readFileSync(new URL('../src/utils/keyboard/navigation.js',import.meta.url),'utf8');
  const quick=readFileSync(new URL('../src/components/quick-add.js',import.meta.url),'utf8');
  assert.match(grid, /categorySelectionKey\(category\)/);
  assert.match(grid, /collapseId=\$\{categorySelectionKey\(cat\)\}/);
  assert.match(group, /this\.collapseId \|\| this\.badgeText/);
  assert.match(dashboard, /navigationKey: categorySelectionKey\(cat\)/);
  assert.match(keyboard, /categorySelectionKey\(cat\)/);
  assert.match(quick, /categorySelectionKey\(c\) === this\.categoryKey/);
});

test('keyboard can open a service after selecting a no-shortcut category by click',async()=>{
  const { handleNavigationKeyDown }=await import('../src/utils/keyboard/navigation.js');
  const category=generateShortcuts(addCategory(config(),'Docs','none').categories).at(-1);
  category.services=[{id:'docs',name:'Docs',url:'https://docs.example',key:'x'}];
  const app={
    categories:[category], activeCategoryKey:categorySelectionKey(category),
    currentInput:'', isInvalidInput:false,
    trackClick(service){this.opened=service.id;},
  };
  handleNavigationKeyDown('x',app);
  assert.equal(app.opened,'docs');
  assert.equal(app.currentInput,'DOCS → X');
});


test('category editor exposes the same compact icon picker as the service editor',()=>{
  const manager=readFileSync(new URL('../src/components/management.js',import.meta.url),'utf8');
  assert.match(manager, /import '\.\/icon-picker\.js'/);
  assert.match(manager, /<jk-icon-picker \.value=\$\{this\._categoryIcon\}/);
  assert.match(manager, /_formInitial\.icon/);
  assert.match(manager, /editCategory\(this\._config,this\._formIndex,values\.name,[^;]*values\.icon/);
});

test('category icons can be set and cleared without changing other attributes',()=>{
  const original=config();
  original.categories[0].icon='lucide:folder-code';
  const edited=editCategory(original,0,'Development','d','manual','https://example.org/icon.svg');
  assert.equal(edited.categories[0].icon,'https://example.org/icon.svg');
  assert.equal(edited.categories[0].categoryKey,'d');
  assert.deepEqual(edited.categories[0].services,original.categories[0].services);
  assert.equal(original.categories[0].icon,'lucide:folder-code');
  const cleared=editCategory(edited,0,'Development','d','manual','');
  assert.equal(Object.hasOwn(cleared.categories[0],'icon'),false);
  const untouched=editCategory(original,0,'Development','d');
  assert.equal(untouched.categories[0].icon,'lucide:folder-code');
  const created=addCategory(original,'Tools','none','','server');
  assert.equal(created.categories.at(-1).icon,'server');
  assert.equal(validateConfig(created),true);
});
