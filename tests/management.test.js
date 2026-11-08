import test from 'node:test';
import assert from 'node:assert/strict';
import { reorderItems, reorderConfiguration, editCategory, addCategory, deleteCategory } from '../src/utils/management.js';
const config = { searchEngines: [], categories: [
  { category: 'First', categoryKey: 'f', services: [{id:'a',name:'Alpha',url:'https://a.test',key:'a'},{id:'b',name:'Beta',url:'https://b.test',key:'b'}]},
  { category: 'Second', categoryKey: 's', services: [] },
]};
test('reorderItems never mutates originals',()=>{const input=['a','b','c']; assert.deepEqual(reorderItems(input,0,2),['b','c','a']); assert.deepEqual(input,['a','b','c']);assert.equal(reorderItems(input,0,0),null);});
test('category and service reorder maintain IDs and shortcut assignments',()=>{const moved=reorderConfiguration(config,'categories',0,0,1);assert.equal(moved.categories[1].categoryKey,'f');assert.equal(config.categories[0].category,'First');const services=reorderConfiguration(config,'services',0,0,1);assert.deepEqual(services.categories[0].services.map(s=>s.id),['b','a']);assert.equal(services.categories[0].services[1].key,'a');});
test('rename category retains shortcut and services',()=>{const next=editCategory(config,0,'Renamed','f');assert.equal(next.categories[0].categoryKey,'f');assert.equal(next.categories[0].services[0].id,'a'); assert.throws(()=>editCategory(config,0,'Second','f'));});
test('add/delete category support a completely empty workspace',()=>{const created=addCategory({categories:[],searchEngines:[]},'Media');assert.equal(created.categories.length,1);const deleted=deleteCategory(created,0);assert.deepEqual(deleted.categories,[]);});
test('service shortcut-disabled mode prevents auto assignment without affecting others',async()=>{
 const {generateShortcuts}=await import('../src/utils/shortcuts.js');
 const {buildQuickConfig,buildEditConfig}=await import('../src/utils/quick-add.js');
 const initial={categories:[{category:'Tools',categoryKey:'t',services:[{name:'One',url:'https://one.test',key:'o',id:'one'}]}],searchEngines:[]};
 const input={name:'Two',url:'https://two.test',category:'0',newCategory:'',key:'',keyMode:'none',icon:''};
 const created=buildQuickConfig(initial,input);
 assert.equal(created.categories[0].services[1].shortcutDisabled,true);
 assert.equal(generateShortcuts(created.categories)[0].services[1].key,'');
 const edited=buildEditConfig(created,{...input,serviceId:'one',name:'One',url:'https://one.test',key:'',keyMode:'none',icon:''});
 assert.equal(edited.categories[0].services[0].id,'one');
 assert.equal(generateShortcuts(edited.categories)[0].services[0].key,'');
});
test('manual shortcut requires an explicitly selected key',async()=>{
 const {buildQuickConfig}=await import('../src/utils/quick-add.js');
 assert.throws(()=>buildQuickConfig(config,{url:'https://x.test',name:'X',category:'0',newCategory:'',key:'',icon:'',keyMode:'manual'}),/quickInvalidKey/);
});
