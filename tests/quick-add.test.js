import { test } from 'node:test';
import assert from 'node:assert/strict';
import {buildEditConfig, buildQuickConfig, suggestKey, sharedLink, hasSharedInput} from '../src/utils/quick-add.js';
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
