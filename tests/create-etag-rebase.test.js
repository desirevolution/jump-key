import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { migrateConfig, persistConfig, setWorkspaceContext, loadCurrentConfig } from '../src/utils/configuration.js';
import { rebaseQuickCreate } from '../src/utils/quick-add.js';
import { rebaseCategoryEdit, addCategory } from '../src/utils/management.js';
import { readFileSync } from 'node:fs';

function server(initial) {
  let bytes = JSON.stringify(initial);
  const calls = [];
  let beforePut = null;
  const currentETag = () => `"sha256-${createHash('sha256').update(bytes).digest('hex')}"`;
  return {
    calls,
    get data() { return JSON.parse(bytes); },
    get etag() { return currentETag(); },
    overwrite(next) { bytes = JSON.stringify(next); },
    onBeforePut(fn) { beforePut = fn; },
    async fetcher(url, options = {}) {
      calls.push({ url, method: options.method || 'GET', headers: options.headers });
      if (options.method === 'PUT') {
        if (beforePut) { const fn = beforePut; beforePut = null; fn(); }
        if (options.headers['If-Match'] !== currentETag()) return new Response(JSON.stringify({ error: { code: 'precondition_failed', message: 'configuration changed; reload or reconcile edits' } }), { status: 412, headers: { 'Content-Type': 'application/json' } });
        bytes = options.body;
        return new Response(null, {status:204,headers:{ ETag:currentETag() }});
      }
      return new Response(bytes,{status:200,headers:{'Content-Type':'application/json',ETag:currentETag()}});
    },
  };
}

const initial = () => migrateConfig({ searchEngines:[], categories:[
  { category:'Tools',services:[{id:'a',name:'Alpha',url:'https://alpha.example'}] },
  { category:'Media',services:[] },
] });
const creation = { name:'New',url:'https://new.example',category:'0',newCategory:'',key:'',keyMode:'auto',icon:'',position:'bottom' };

test('new service saves against fresh ETag, preserving concurrent edits and resolving category by name', async () => {
  const baseline = initial();
  const api = server(baseline);
  const oldETag = api.etag;
  const changed = structuredClone(baseline);
  changed.categories[0].services[0].url = 'https://updated.example';
  changed.categories.reverse();
  api.overwrite(changed);
  const freshETag = api.etag;
  assert.notEqual(freshETag, oldETag);
  setWorkspaceContext({id:'home',user:'alice',etag:oldETag});
  try {
    const result = await persistConfig(null, {
      base:'/jump-key/',fetcher:api.fetcher.bind(api),
      mutate:fresh=>rebaseQuickCreate(baseline,fresh,creation),
    });
    assert.deepEqual(result.categories.map(c=>c.category),['Media','Tools']);
    assert.equal(result.categories[1].services[0].url,'https://updated.example');
    assert.equal(result.categories[1].services[1].name,'New');
    assert.equal(api.calls.length,2);
    assert.equal(api.calls[0].method,'GET');
    assert.equal(api.calls[1].method,'PUT');
    assert.equal(api.calls[0].url,'/jump-key/config/services.json?workspace=home');
    assert.equal(api.calls[1].headers['If-Match'], freshETag);
    assert.equal(api.calls[1].headers['X-JumpKey-User'],'alice');
    assert.equal(api.data.categories[1].services[1].name,'New');
    // The global workspace version must advance, so a second ordinary save works.
    const writtenETag = api.etag;
    await persistConfig(result,{base:'/jump-key/',fetcher:api.fetcher.bind(api)});
    assert.equal(api.calls.at(-1).headers['If-Match'],writtenETag);
  } finally { setWorkspaceContext(null); }
});

test('category creation is applied to newest server config, not stale manager snapshot', async () => {
  const api=server(initial());
  const stale=initial();
  const changed=structuredClone(stale);
  changed.categories[0].services[0].name='Updated in another tab';
  api.overwrite(changed);
  const current=await loadCurrentConfig({base:'/',context:{id:'home',user:'alice'},fetcher:api.fetcher.bind(api)});
  const next=addCategory(current.config,'New category','none','','ui:folder');
  const res=await api.fetcher('/config/services.json?workspace=home',{method:'PUT',headers:{'If-Match':current.etag},body:JSON.stringify(next)});
  assert.equal(res.status,204);
  assert.equal(api.data.categories[0].services[0].name,'Updated in another tab');
  assert.equal(api.data.categories[2].icon,'ui:folder');
  assert.equal(api.data.categories[2].shortcutDisabled,true);
});

test('a removed target or an existing name cannot be overwritten by service/category creation', async () => {
  const old=initial();
  const changed=structuredClone(old);changed.categories.shift();
  assert.throws(()=>rebaseQuickCreate(old,changed,creation),e=>e.status===412);
  assert.throws(()=>addCategory(changed,'Media'),/existiert bereits/);
  assert.deepEqual(changed.categories.map(c=>c.category),['Media']);
});

test('category edit preserves unrelated service changes but refuses concurrent metadata edits', () => {
  const old=initial();
  const changed=structuredClone(old);
  changed.categories[0].services[0].name='Updated elsewhere';
  const edits={name:'Tools renamed',shortcut:'t',keyMode:'manual',icon:'ui:folder'};
  const result=rebaseCategoryEdit(old,0,changed,edits);
  assert.equal(result.categories[0].category,'Tools renamed');
  assert.equal(result.categories[0].services[0].name,'Updated elsewhere');
  const conflicted=structuredClone(changed);
  conflicted.categories[0].icon='another-icon';
  assert.throws(()=>rebaseCategoryEdit(old,0,conflicted,edits),e=>e.status===412);
});

test('a genuine concurrent write between fresh GET and conditional PUT still returns 412', async () => {
  const baseline=initial(), api=server(baseline);
  setWorkspaceContext({id:'home',user:'alice',etag:api.etag});
  api.onBeforePut(()=>{const altered=api.data;altered.categories[0].services[0].name='Parallel';api.overwrite(altered);});
  try {
    await assert.rejects(persistConfig(null,{fetcher:api.fetcher.bind(api),mutate:fresh=>rebaseQuickCreate(baseline,fresh,creation)}),e=>e.status===412&&e.code==='precondition_failed');
    assert.equal(api.data.categories[0].services.length,1);
    assert.equal(api.data.categories[0].services[0].name,'Parallel');
  } finally {setWorkspaceContext(null);}
});

test('both UI creation paths explicitly use fresh revisions; raw JSON save remains conditional', () => {
  const manager=readFileSync(new URL('../src/components/management.js',import.meta.url),'utf8');
  const quick=readFileSync(new URL('../src/components/quick-add.js',import.meta.url),'utf8');
  assert.match(manager,/_saveMutation\(fresh=>/);
  assert.match(manager,/addCategory\(fresh,values\.name/);
  assert.match(manager,/saveConfig:\(next,\{mutate\}=\{\}\)=>mutate\?this\._saveMutation\(mutate\):this\._saveConfig\(next\)/);
  assert.match(quick,/rebaseQuickCreate\(this\.config, fresh, values\)/);
  assert.match(quick,/persistConfig\(next, \{ base: import\.meta\.env\.BASE_URL, \.\.\.options \}\)/);
});
