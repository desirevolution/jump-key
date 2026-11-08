import test from 'node:test';
import assert from 'node:assert/strict';
import { prefetchWorkspaces } from '../src/utils/workspace-prefetch.js';
import { workspaceStorage } from '../src/utils/workspace-storage.js';
import { offlineCacheKey } from '../src/utils/offline-cache.js';

function makeStorage() {
  const values = new Map();
  return {
    values,
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value); },
    removeItem: key => values.delete(key),
  };
}

const config = (name) => ({ categories: [{ category: 'Tools', categoryKey: 't', services: [
  { name, key: 'a', url: 'https://example.org' },
] }], searchEngines: [] });

test('prefetches all authorized workspaces, uses no-store and user header', async () => {
  const original = globalThis.localStorage;
  globalThis.localStorage = makeStorage();
  try {
    const calls = [], progress = [];
    const result = await prefetchWorkspaces({ user: 'alice', workspaces: [{ id: 'home' }, { id: 'work' }] }, {
      base: '/jump-key/',
      fetcher: async (url, options) => {
        calls.push([url, options]);
        return Response.json(config(url.includes('work') ? 'Work' : 'Home'));
      },
      onProgress: state => progress.push(state),
    });
    assert.deepEqual(result, { available: 2, total: 2, failures: [] });
    assert.equal(calls.length, 2);
    assert.ok(calls.every(([, options]) => options.cache === 'no-store' && options.headers['X-JumpKey-User'] === 'alice'));
    assert.ok(calls.some(([url]) => url.includes('workspace=home')));
    assert.ok(calls.some(([url]) => url.includes('workspace=work')));
    assert.deepEqual(progress.at(-1), { available: 2, total: 2, failures: [] });
    assert.ok(JSON.parse(globalThis.localStorage.getItem(workspaceStorage('alice', 'work').configCache)).categories[0].services[0].id);
    assert.notEqual(offlineCacheKey('alice', 'home'), offlineCacheKey('bob', 'home'));
  } finally { globalThis.localStorage = original; }
});

test('invalid or unauthorized responses are never cached and report failure', async () => {
  const original = globalThis.localStorage;
  globalThis.localStorage = makeStorage();
  try {
    const manifest = { user: 'alice', workspaces: [{ id: 'ok' }, { id: 'denied' }, { id: 'html' }, { id: 'invalid' }] };
    const result = await prefetchWorkspaces(manifest, {
      fetcher: async url => {
        if (url.includes('denied')) return new Response('unauthorized', { status: 401 });
        if (url.includes('html')) return new Response('<html>Login</html>', { headers: { 'content-type': 'text/html' } });
        if (url.includes('invalid')) return Response.json({ invalid: true });
        return Response.json(config('Okay'));
      },
    });
    assert.equal(result.available, 1);
    assert.deepEqual(new Set(result.failures), new Set(['denied', 'html', 'invalid']));
    assert.equal(globalThis.localStorage.getItem(workspaceStorage('alice', 'denied').configCache), null);
  } finally { globalThis.localStorage = original; }
});

test('prefetch does not invent access for workspace IDs not listed in manifest', async () => {
  let requests = 0;
  const result = await prefetchWorkspaces({ user: 'alice', workspaces: [] }, { fetcher: async () => { requests++; } });
  assert.equal(requests, 0);
  assert.deepEqual(result, { available: 0, total: 0, failures: [] });
});
