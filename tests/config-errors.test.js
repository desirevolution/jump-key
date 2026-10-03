import {test} from 'node:test';
import assert from 'node:assert/strict';
import {getConfigErrors} from '../src/utils/config-validator.js';
test('all structural and field errors are collected with paths',()=>{
 const errors=getConfigErrors({categories:[null,{category:'',categoryKey:'xx',services:null},{category:'A',categoryKey:'a',services:[null,{name:'',url:3,key:'1',icon:7,id:''},{name:'B',url:'/b',key:'b',id:'same'},{name:'C',url:'/c',key:'B',id:'same'}]},{category:'Other',categoryKey:'A',services:[]}],searchEngines:[null,{name:'',prefix:'',url:null},{name:'G',prefix:'g',url:'/g'},{name:'G2',prefix:'G',url:'/g2'}]});
 assert.deepEqual(new Set(errors.map(e=>e.code)),new Set(['object','text','key','array','string','duplicate']));
 for(const path of ['categories[1].category','categories[1].categoryKey','categories[1].services','categories[2].services[1].name','categories[2].services[1].url','categories[2].services[1].key','categories[2].services[1].icon','categories[2].services[1].id','categories[2].services[3].key','categories[2].services[3].id','categories[3].categoryKey','searchEngines[1].name','searchEngines[1].prefix','searchEngines[1].url','searchEngines[3].prefix']) assert.ok(errors.some(e=>e.path===path),path);
 assert.equal(errors.find(e=>e.path==='categories[3].categoryKey').other,'categories[2].categoryKey');
 assert.deepEqual(getConfigErrors(null),[{path:'$',code:'object'}]);
 assert.deepEqual(getConfigErrors({}).map(({path,code})=>({path,code})),[{path:'categories',code:'array'},{path:'searchEngines',code:'array'}]);
});
