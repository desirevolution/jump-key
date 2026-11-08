import test from 'node:test';
import assert from 'node:assert/strict';
import { rebaseSortConfiguration, prepareSortSave } from '../src/utils/sort-save.js';

const makeConfig = () => ({
  searchEngines: [],
  categories: [
    {category:'Tools',categoryKey:'t',services:[
      {id:'one',name:'One',url:'https://one.example',key:'o'},
      {id:'two',name:'Two',url:'https://two.example',key:'w'},
      {id:'three',name:'Three',url:'https://three.example',key:'h'},
    ]},
    {category:'Media',categoryKey:'m',services:[{id:'four',name:'Four',url:'https://four.example',key:'f'}]},
  ],
});

function reorderServices(config) {
  const draft=structuredClone(config);
  draft.categories[0].services=[draft.categories[0].services[1],draft.categories[0].services[2],draft.categories[0].services[0]];
  return draft;
}

test('sort save rebases onto latest ETag and retains unrelated edits',async()=>{
  const baseline=makeConfig();
  const draft=reorderServices(baseline);
  const current=structuredClone(baseline);
  current.categories[0].services[0].url='https://updated.example';
  current.categories[1].services.push({id:'five',name:'Five',url:'https://five.example'});
  current.workspaceName='Now named';
  const requests=[];
  const {config,etag}=await prepareSortSave({base:'/jumpkey/',user:'alice',id:'home',baseline,draft,
    fetcher:async (url,opts)=>{
      requests.push({url,opts});
      return {ok:true,headers:new Headers({'ETag':'"sha256-new"'}),json:async()=>current};
    }});
  assert.equal(etag,'"sha256-new"');
  assert.equal(requests[0].url,'/jumpkey/config/services.json?workspace=home');
  assert.equal(requests[0].opts.headers['X-JumpKey-User'],'alice');
  assert.equal(requests[0].opts.cache,'no-store');
  assert.deepEqual(config.categories[0].services.map(s=>s.id),['two','three','one']);
  assert.equal(config.categories[0].services[2].url,'https://updated.example');
  assert.equal(config.categories[1].services.length,2);
  assert.equal(config.workspaceName,'Now named');
  assert.deepEqual(baseline.categories[0].services.map(s=>s.id),['one','two','three']);
});

test('category sort uses fresh category objects with their updated fields',()=>{
  const baseline=makeConfig();
  const draft=structuredClone(baseline);
  draft.categories.reverse();
  const current=structuredClone(baseline);
  current.categories[0].services[0].name='Updated';
  const merged=rebaseSortConfiguration(baseline,draft,current);
  assert.deepEqual(merged.categories.map(c=>c.category),['Media','Tools']);
  assert.equal(merged.categories[1].services[0].name,'Updated');
});

test('concurrent sort of the same list stays a conflict',()=>{
  const baseline=makeConfig();
  const draft=reorderServices(baseline);
  const current=structuredClone(baseline);
  current.categories[0].services.reverse();
  assert.throws(()=>rebaseSortConfiguration(baseline,draft,current),err=>err.status===412 && err.code==='precondition_failed');
});

test('adding or deleting an item in a reordered list must not lose it',()=>{
  const baseline=makeConfig();
  const draft=reorderServices(baseline);
  const current=structuredClone(baseline);
  current.categories[0].services.push({id:'new',name:'New',url:'https://new.example'});
  assert.throws(()=>rebaseSortConfiguration(baseline,draft,current),err=>err.status===412);
});

test('category rename during category reorder cannot silently be dropped',()=>{
  const baseline=makeConfig();
  const draft=structuredClone(baseline);
  draft.categories.reverse();
  const current=structuredClone(baseline);
  current.categories[0].category='Renamed';
  assert.throws(()=>rebaseSortConfiguration(baseline,draft,current),err=>err.status===412);
});

test('changes to unrelated service list are retained',()=>{
  const baseline=makeConfig();
  const draft=reorderServices(baseline);
  const current=structuredClone(baseline);
  current.categories[1].services.push({id:'five',name:'Five',url:'https://five.example'});
  const merged=rebaseSortConfiguration(baseline,draft,current);
  assert.deepEqual(merged.categories[1].services.map(s=>s.id),['four','five']);
});

test('missing ETag prevents a write',async()=>{
  await assert.rejects(prepareSortSave({user:'alice',id:'default',baseline:makeConfig(),draft:reorderServices(makeConfig()),
    fetcher:async()=>({ok:true,headers:new Headers(),json:async()=>makeConfig()})}),/keinen ETag/);
});
