import test from 'node:test';
import assert from 'node:assert/strict';
import { loadWorkspacePreferences } from '../src/utils/workspace-preferences.js';
test('workspace preferences seed default first and remain independent after copying', () => {
 const values=new Map();
 globalThis.localStorage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};
 const legacy={theme:'midnight',gridView:true,timings:{categoryTimeout:8,launchDelay:0}};
 const work=loadWorkspacePreferences('arthur','work',legacy);
 assert.deepEqual(work,legacy);
 assert.deepEqual(JSON.parse(values.get('jumpkey:arthur:default:preferences')),legacy);
 const changed={...legacy,gridView:false,timings:{categoryTimeout:20,launchDelay:2}};
 values.set('jumpkey:arthur:default:preferences',JSON.stringify(changed));
 assert.deepEqual(loadWorkspacePreferences('arthur','work',{}),legacy);
 assert.deepEqual(loadWorkspacePreferences('arthur','new',{}),changed);
 assert.equal(loadWorkspacePreferences('bob','work',{gridView:false}).gridView,false);
 delete globalThis.localStorage;
});

test('workspace preference mode defaults off and preserves individual settings', async () => {
 const { effectivePreferencesId, WORKSPACE_PREFERENCES_MODE }=await import('../src/utils/workspace-preferences.js');
 const values=new Map();
 globalThis.localStorage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};
 assert.equal(effectivePreferencesId('work'),'default');
 values.set(WORKSPACE_PREFERENCES_MODE,'true');
 assert.equal(effectivePreferencesId('work'),'work');
 const personal=loadWorkspacePreferences('a','work',{gridView:true});
 values.set(WORKSPACE_PREFERENCES_MODE,'false');
 assert.equal(effectivePreferencesId('work'),'default');
 assert.deepEqual(loadWorkspacePreferences('a','work',{}),personal);
 delete globalThis.localStorage;
});
