import test from 'node:test';
import assert from 'node:assert/strict';
import { allowedNavigation } from '../src/utils/navigation-policy.js';
import { persistConfig, setWorkspaceContext } from '../src/utils/configuration.js';
import { handleGlobalKeyDown } from '../src/utils/keyboard/global.js';

test('public navigation blocks executable and non-web schemes', () => {
  for (const url of ['javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'java\nscript:alert(1)', 'data:text/html,hello', 'file:///etc/passwd', 'vbscript:x']) assert.equal(allowedNavigation(url,true),false,url);
  for (const url of ['https://example.org', 'http://localhost:8080', '/relative', '//example.org']) assert.equal(allowedNavigation(url,true),true,url);
  assert.equal(allowedNavigation('custom:application',false),true);
});
test('read-only persistence is rejected before a request', async () => {
  setWorkspaceContext({ id:'home', user:'public', readOnly:true });
  try { await assert.rejects(persistConfig({categories:[],searchEngines:[]},{fetcher:()=>assert.fail('must not send')}), /Read-only/); }
  finally { setWorkspaceContext(null); }
});
test('write shortcuts do not open dialogs in read-only mode', () => {
  const app={readOnly:true,categories:[],resetInput:()=>assert.fail('edit mode'),openQuickAdd:()=>assert.fail('add dialog')};
  for (const [key,ctrlKey] of [['e',true],['+',false]]) handleGlobalKeyDown({key,ctrlKey,target:{closest:()=>false},preventDefault(){}}, app);
  assert.equal(app.editRecording,undefined);
});
