import test from 'node:test';
import assert from 'node:assert/strict';
import { checkResetConnection, clearLocalData, resetDestination } from '../src/utils/reset-local-data.js';

function storage(entries) {
 const values=new Map(Object.entries(entries));
 return {values,get length(){return values.size},key:i=>[...values.keys()][i]??null,getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
}
test('reset removes all JumpKey user/workspace data and preserves unrelated storage',()=>{
 const store=storage({'jumpkey:arthur:home:config':'{}','jumpkey:bob:work:favorites':'{}','jumpkey-active:arthur':'home','dashboard_favs':'{}','services-cache':'{}','jump-key-theme':'ocean','jump-key-install-dismissed':'true','jumpkey-workspace-preferences-enabled':'true','jumpkey-workspace-manifest':'{}','jumpkey-legacy-migrated':'true','dashboard_timings':'{}','unrelated-app':'keep'});
 clearLocalData(store);
 assert.deepEqual([...store.values],[['unrelated-app','keep']]);
});
test('reset preflight checks actual config, including public lists without default',async()=>{
 const calls=[];
 await checkResetConnection({base:'/jump-key/',fetcher:async(url,options)=>{
  calls.push(url);assert.equal(options.cache,'no-store');
  return Response.json(url.endsWith('api/workspaces')?{user:'public',readOnly:true,workspaces:[{id:'home'}]}:{categories:[],searchEngines:[]});
 }});
 assert.deepEqual(calls,['/jump-key/api/workspaces','/jump-key/config/services.json?workspace=home']);
});
test('failed, offline and invalid config responses prevent deletion',async()=>{
 for(const fetcher of [async()=>{throw new TypeError('offline')},async()=>new Response('denied',{status:403}),async()=>Response.json({invalid:true})]) {
  const store=storage({'dashboard_favs':'keep'});
  await assert.rejects(async()=>{await checkResetConnection({workspaceApi:false,fetcher});clearLocalData(store)});
  assert.equal(store.getItem('dashboard_favs'),'keep');
 }
});
test('reset destination removes workspace/share state but preserves installation path',()=>{
 assert.equal(resetDestination('https://example.org/jump-key/?workspace=work&share=1&url=x&title=x&text=x&other=1#old'),'https://example.org/jump-key/?other=1');
});
