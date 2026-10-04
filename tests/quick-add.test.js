import { migrateReferences } from '../src/utils/configuration.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {quickFormSnapshot, quickErrorField, buildDeleteConfig, buildEditConfig, buildQuickConfig, suggestKey, sharedLink, hasSharedInput} from '../src/utils/quick-add.js';
const config={categories:[{category:'Tools',services:[{name:'Alpha',url:'https://example.com/',id:'old'}]},{category:'Other',services:[]}],searchEngines:[]};
const input={url:'https://new.example',name:'Another',category:'0',newCategory:'',key:'',icon:''};
test('suggestion reserves generated keys and same-category duplicates fail',()=>{
 assert.notEqual(suggestKey(config,'0','Another'),'a');
 assert.throws(()=>buildQuickConfig(config,{...input,key:'a'}),/quickKeyUsed/);
 assert.throws(()=>buildQuickConfig(config,{...input,url:'https://example.com'}),/quickDuplicate/);
 assert.equal(buildQuickConfig(config,{...input,category:'1',url:'https://example.com'}).categories[1].services.length,1);
});
test('new category and link saved together without mutating source',()=>{
 const next=buildQuickConfig(config,{...input,category:'new',newCategory:'New'});
 assert.equal(config.categories.length,2);assert.equal(next.categories.length,3);
 assert.equal(next.categories[2].services[0].name,'Another');
 assert.throws(()=>buildQuickConfig(config,{...input,url:'javascript:alert(1)'}),/quickInvalidUrl/);
});
test('shared text URLs are extracted without interpreting markup',()=>{
 assert.deepEqual(sharedLink(new URLSearchParams({text:'Look https://example.com/x',title:'Example'})),{url:'https://example.com/x',name:'Example'});
});
test('an empty category cannot silently select the first category', () => {
 assert.throws(() => buildQuickConfig(config, {...input, category:''}), /quickCategoryRequired/);
 assert.equal(suggestKey(config, '', 'Another'), '');
});

test('Android GET sharing works without the action query marker', () => {
 const params = new URLSearchParams({title:'Example', text:'https://example.com/page'});
 assert.equal(hasSharedInput(params), true);
 assert.deepEqual(sharedLink(params), {url:'https://example.com/page', name:'Example'});
 assert.equal(hasSharedInput(new URLSearchParams('share=1')), true);
 assert.equal(hasSharedInput(new URLSearchParams('url=https%3A%2F%2Fexample.com')), true);
 assert.equal(hasSharedInput(new URLSearchParams()), false);
 assert.equal(hasSharedInput(new URLSearchParams('theme=dark')), false);
});

test('editing preserves identity, unknown fields, position and source input', () => {
 const source = {categories:[{category:'Tools', services:[
  {id:'one',name:'One',url:'https://one.example',key:'o',icon:'ui:star',extra:true},
  {id:'two',name:'Two',url:'https://two.example',key:'t'}
 ]}], searchEngines:[]};
 const next=buildEditConfig(source,{...input,serviceId:'one',name:'Renamed',url:'https://one.example',key:'o',icon:''});
 assert.deepEqual(next.categories[0].services.map(s=>s.id),['one','two']);
 assert.equal(next.categories[0].services[0].extra,true);
 assert.equal(next.categories[0].services[0].icon,undefined);
 assert.equal(source.categories[0].services[0].name,'One');
});
test('moving appends, retains ID and rejects destination conflicts', () => {
 const source = {categories:[{category:'A',services:[{id:'one',name:'One',url:'https://one.example',key:'o'}]},
  {category:'B',services:[{id:'two',name:'Two',url:'https://two.example',key:'t'}]}],searchEngines:[]};
 const edit={...input,serviceId:'one',category:'1',key:'o'};
 const next=buildEditConfig(source,edit);
 assert.equal(next.categories[0].services.length,0);
 assert.deepEqual(next.categories[1].services.map(s=>s.id),['two','one']);
 assert.throws(()=>buildEditConfig(source,{...edit,key:'t'}),/quickKeyUsed/);
 assert.throws(()=>buildEditConfig(source,{...edit,url:'https://two.example'}),/quickDuplicate/);
 assert.throws(()=>buildEditConfig(source,{...edit,serviceId:'missing'}),/quickServiceMissing/);
 const created=buildEditConfig(source,{...edit,category:'new',newCategory:'C'});
 assert.equal(created.categories[2].services[0].id,'one');
});

test('position selects first, after a service or last without changing other IDs', () => {
 const source={categories:[{category:'A',services:[{id:'a',name:'A',url:'https://a.example',key:'a'},{id:'b',name:'B',url:'https://b.example',key:'b'},{id:'c',name:'C',url:'https://c.example',key:'c'}]}],searchEngines:[]};
 const edit={...input,serviceId:'c',key:'c',position:'after:a'};
 assert.deepEqual(buildEditConfig(source,edit).categories[0].services.map(s=>s.id),['a','c','b']);
 assert.deepEqual(buildEditConfig(source,{...edit,position:'top'}).categories[0].services.map(s=>s.id),['c','a','b']);
 assert.deepEqual(buildEditConfig(source,{...edit,serviceId:'a',key:'a',position:'bottom'}).categories[0].services.map(s=>s.id),['b','c','a']);
 assert.equal(buildQuickConfig(source,{...input,position:'top'}).categories[0].services[0].name,input.name);
 assert.throws(()=>buildEditConfig(source,{...edit,position:'after:missing'}),/quickPositionInvalid/);
 assert.deepEqual(source.categories[0].services.map(s=>s.id),['a','b','c']);
});
test('deletion and moving remove an empty category only when selected', () => {
 const source={categories:[{category:'A',services:[{id:'a',name:'A',url:'https://a.example',key:'a'}]},{category:'B',services:[]}],searchEngines:[]};
 assert.equal(buildDeleteConfig(source,'a').categories.length,2);
 const deleted=buildDeleteConfig(source,'a',true);
 assert.equal(deleted.categories[0].category,'B');
 assert.deepEqual(migrateReferences(deleted,{'1':'a'},['a']),{favorites:{},history:[]});
 const move={...input,serviceId:'a',category:'1',removeEmptyCategory:true};
 const moved=buildEditConfig(source,move);
 assert.equal(moved.categories.length,1);
 assert.equal(moved.categories[0].services[0].id,'a');
 assert.deepEqual(migrateReferences(moved,{'1':'a'},['a']),{favorites:{'1':'a'},history:['a']});
 assert.equal(buildEditConfig(source,{...move,removeEmptyCategory:false}).categories.length,2);
 assert.equal(buildEditConfig(source,{...move,category:'new',newCategory:'C'}).categories.at(-1).services[0].id,'a');
 assert.equal(source.categories[0].services.length,1);
});

test('editing accepts reactive form properties exposed through prototype getters', () => {
 const values={...input,serviceId:'old',name:'Gemini',url:'https://gemini.google.com',key:'g',position:'top'};
 const prototype=Object.fromEntries(Object.keys(values).map(key=>[key,{get(){return values[key];}}]));
 const form=Object.create(Object.defineProperties({},prototype));
 assert.equal(Object.keys(form).length,0);
 const result=buildEditConfig(config,form);
 assert.equal(result.categories[0].services[0].url,'https://gemini.google.com/');
 assert.equal(result.categories[0].services[0].id,'old');
 assert.equal(result.categories[0].services[0].key,'g');
});

test('saving unchanged middle and last services preserves their order', () => {
 const source={categories:[{category:'A',services:[
  {id:'a',name:'A',url:'https://a.example/',key:'a'},
  {id:'b',name:'B',url:'https://b.example/',key:'b'},
  {id:'c',name:'C',url:'https://c.example/',key:'c'}]}],searchEngines:[]};
 for (const [index,id] of [[1,'b'],[2,'c']]) {
  const service=source.categories[0].services[index];
  const next=buildEditConfig(source,{...input,...service,serviceId:id,position:'after:'+source.categories[0].services[index-1].id});
  assert.deepEqual(next.categories[0].services.map(s=>s.id),['a','b','c']);
 }
});


test('form change detection includes ordering and supports restoring original values', () => {
 const original={...input,position:'bottom'};
 const baseline=quickFormSnapshot(original);
 for(const field of ['url','name','category','position','key','icon']) {
  const edited={...original,[field]:'changed'};
  assert.notEqual(quickFormSnapshot(edited),baseline);
  edited[field]=original[field];
  assert.equal(quickFormSnapshot(edited),baseline);
 }
 assert.equal(quickFormSnapshot({...original,newCategory:'unused'}),baseline);
 assert.notEqual(quickFormSnapshot({...original,category:'new',newCategory:'A'}),quickFormSnapshot({...original,category:'new',newCategory:'B'}));
});
test('validation errors target the relevant form control', () => {
 assert.equal(quickErrorField('quickDuplicate','0'),'url');
 assert.equal(quickErrorField('quickInvalidUrl','0'),'url');
 assert.equal(quickErrorField('quickKeyUsed','0'),'key');
 assert.equal(quickErrorField('quickCategoryRequired','new'),'newCategory');
 assert.equal(quickErrorField('quickCategoryRequired',''),'category');
 assert.equal(quickErrorField('quickCategoryExists','new'),'newCategory');
 assert.equal(quickErrorField('quickPositionInvalid','0'),'position');
 assert.equal(quickErrorField('quickServiceMissing','0'),'');
});
