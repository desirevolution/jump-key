import test from 'node:test';
import assert from 'node:assert/strict';
import { setWorkspaceContext } from '../src/utils/configuration.js';
import { createWorkspaceRequest, renameWorkspaceRequest, validateWorkspaceForm, workspaceSlug } from '../src/utils/workspace-management.js';
test('workspace create uses user-scoped conditional request without copying local state', async () => {
  let captured;
  const result = await createWorkspaceRequest({ base: '/jump/', user: 'alice', id: 'copy', name: 'Copy', sourceId: 'default', fetcher: async (url, options) => {
    captured = { url, options }; return { ok: true, json: async () => ({ id: 'copy', name: 'Copy' }) };
  } });
  assert.equal(captured.url, '/jump/api/workspaces');
  assert.equal(captured.options.headers['If-None-Match'], '*');
  assert.deepEqual(JSON.parse(captured.options.body), { id: 'copy', name: 'Copy', sourceId: 'default' });
  assert.equal(result.id, 'copy');
});
test('rename uses current etag and updates it after successful response', async () => {
  setWorkspaceContext({ user: 'alice', id: 'default', etag: '"old"' });
  let captured;
  await renameWorkspaceRequest({ user: 'alice', id: 'default', name: 'New', fetcher: async (url, options) => {
    captured = { url, options }; return { ok: true, headers: { get: () => '"new"' } };
  } });
  assert.equal(captured.options.headers['If-Match'], '"old"');
  assert.equal(captured.url, '/api/workspaces/default');
  setWorkspaceContext(null);
});
test('workspace validation and auto slug', () => {
  assert.equal(workspaceSlug('My Tools!'), 'my-tools');
  assert.equal(validateWorkspaceForm({ mode: 'create', id: '../bad', name: 'Valid' }), 'invalid_id');
  assert.equal(validateWorkspaceForm({ mode: 'rename', id: 'ignored', name: '' }), 'invalid_name');
  assert.equal(validateWorkspaceForm({ mode: 'duplicate', id: 'tools', name: 'Tools' }), null);
});

test('workspace migration retains local references when technical ID changes', async () => {
  const {migrateWorkspaceIDs}=await import('../src/utils/workspace-migration.js');
  const {workspaceStorage}=await import('../src/utils/workspace-storage.js');
  const {writeJsonStorage,readJsonStorage}=await import('../src/utils/storage.js');
  const storage = new Map();
  const former=globalThis.localStorage;
  globalThis.localStorage={getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)};
  try {
    writeJsonStorage(workspaceStorage('alice','old').favorites,{'1':'svc-a'});
    writeJsonStorage(workspaceStorage('alice','old').continueHistory,['svc-a']);
    writeJsonStorage('jumpkey-active:alice','old');
    migrateWorkspaceIDs('alice',{old:'new'});
    assert.deepEqual(readJsonStorage(workspaceStorage('alice','new').favorites,{}),{'1':'svc-a'});
    assert.deepEqual(readJsonStorage(workspaceStorage('alice','new').continueHistory,[]),['svc-a']);
    assert.equal(readJsonStorage('jumpkey-active:alice',null),'new');
    writeJsonStorage(workspaceStorage('alice','new').favorites,{'2':'svc-b'});
    migrateWorkspaceIDs('alice',{old:'new'});
    assert.deepEqual(readJsonStorage(workspaceStorage('alice','new').favorites,{}),{'2':'svc-b'});
  } finally {globalThis.localStorage=former;}
});
