import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createDemoFetch } from '../src/utils/demo-backend.js';
import { migrateConfig } from '../src/utils/configuration.js';

const base = '/jump-key/';
const configBody = { categories: [], searchEngines: [] };
const localFiles = new Map([
  ['services.json', 'public/config/services.json'],
  ['home.workspace.json', 'public/config/home.workspace.json'],
  ['work.workspace.json', 'public/config/work.workspace.json'],
]);

function demo() {
  const requests = [];
  const network = async (url, options) => {
    requests.push({ url: String(url), options });
    const pathname = new URL(url).pathname;
    const file = localFiles.get(pathname.replace('/jump-key/config/', ''));
    if (!file) return new Response('Not found', { status: 404, headers: { 'Content-Type': 'text/html' } });
    return new Response(readFileSync(new URL(`../${file}`, import.meta.url)), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  };
  return { fetch: createDemoFetch(base, network), requests };
}

async function load(fetch, id) {
  const response = await fetch(`${base}config/services.json?workspace=${id}`);
  assert.equal(response.status, 200);
  return { config: await response.json(), etag: response.headers.get('ETag') };
}

test('demo startup loads all 3 bundled JSON workspaces, with no backend requests', async () => {
  const { fetch, requests } = demo();
  const response = await fetch(`${base}api/workspaces`);
  assert.equal(response.status, 200);
  const manifest = await response.json();
  assert.equal(manifest.user, 'demo');
  assert.equal(manifest.readOnly, false);
  assert.ok(manifest.orderETag);
  assert.deepEqual(manifest.workspaces.map(w => w.id), ['default', 'home', 'work']);
  assert.equal(requests.length, 0);
  for (const id of manifest.workspaces.map(w => w.id)) {
    const { config, etag } = await load(fetch, id);
    assert.ok(migrateConfig(config).categories.length > 0);
    assert.match(etag, /demo/);
  }
  assert.deepEqual(requests.map(r => new URL(r.url).pathname), [
    '/jump-key/config/services.json',
    '/jump-key/config/home.workspace.json',
    '/jump-key/config/work.workspace.json',
  ]);
});

test('demo config writes are in-memory, ETag protected and reset on reload', async () => {
  const { fetch, requests } = demo();
  const { config, etag } = await load(fetch, 'work');
  config.workspaceName = 'Edited in demo';
  const endpoint = `${base}config/services.json?workspace=work`;
  const missing = await fetch(endpoint, { method: 'PUT', body: JSON.stringify(config) });
  assert.equal(missing.status, 428);
  const saved = await fetch(endpoint, {
    method: 'PUT', headers: { 'If-Match': etag }, body: JSON.stringify(config),
  });
  assert.equal(saved.status, 200);
  assert.notEqual(saved.headers.get('ETag'), etag);
  const stale = await fetch(endpoint, {
    method: 'PUT', headers: { 'If-Match': etag }, body: JSON.stringify(config),
  });
  assert.equal(stale.status, 412);
  assert.equal((await load(fetch, 'work')).config.workspaceName, 'Edited in demo');
  assert.equal((await load(demo().fetch, 'work')).config.workspaceName, undefined);
  assert.equal(requests.length, 1, 'no config PUTs should go to Pages');
});

test('workspaces can be created, reordered, renamed, duplicated and deleted without an API server', async () => {
  const { fetch, requests } = demo();
  const from = await load(fetch, 'home');
  const post = await fetch(`${base}api/workspaces`, {
    method: 'POST', headers: { 'If-None-Match': '*' },
    body: JSON.stringify({ id: 'copy', name: 'Copy', sourceId: 'home' }),
  });
  assert.equal(post.status, 201);
  assert.deepEqual((await load(fetch, 'copy')).config.categories, from.config.categories);
  let manifest = await (await fetch(`${base}api/workspaces`)).json();
  assert.equal(manifest.workspaces.length, 4);
  const reordered = await fetch(`${base}api/workspace-order`, {
    method: 'PUT', headers: { 'If-Match': manifest.orderETag },
    body: JSON.stringify({ order: ['work', 'copy', 'home', 'default'] }),
  });
  assert.equal(reordered.status, 200);
  manifest = await (await fetch(`${base}api/workspaces`)).json();
  assert.deepEqual(manifest.workspaces.map(w => w.id), ['work', 'copy', 'home', 'default']);
  const copy = await load(fetch, 'copy');
  const renamed = await fetch(`${base}api/workspaces/copy`, {
    method: 'PATCH', headers: { 'If-Match': copy.etag },
    body: JSON.stringify({ id: 'new-copy', name: 'New Copy' }),
  });
  assert.equal(renamed.status, 200);
  assert.equal((await fetch(`${base}config/services.json?workspace=copy`)).status, 404);
  assert.equal((await load(fetch, 'new-copy')).config.workspaceName, 'New Copy');
  const updated = await load(fetch, 'new-copy');
  const deleted = await fetch(`${base}api/workspaces/new-copy`, {
    method: 'DELETE', headers: { 'If-Match': updated.etag },
  });
  assert.equal(deleted.status, 200);
  assert.equal((await fetch(`${base}config/services.json?workspace=new-copy`)).status, 404);
  assert.ok(requests.every(r => r.url.includes('/jump-key/config/')), 'all API calls mocked');
});

test('paths normalize a base without a final slash and never proxy unknown API calls', async () => {
  const requests = [];
  const fetch = createDemoFetch('/jump-key', async url => {
    requests.push(String(url));
    return Response.json({ original: String(url) });
  });
  assert.equal((await fetch('/jump-key/api/workspaces')).status, 200);
  assert.equal((await fetch('/jump-key/api/not-real')).status, 404);
  assert.equal(requests.length, 0);
  assert.equal((await fetch('/jump-key/config/services.json')).status, 200);
  assert.deepEqual(requests, ['https://demo.invalid/jump-key/config/services.json']);
  await fetch('https://example.com/anything');
  assert.equal(requests.at(-1), 'https://example.com/anything');
});

test('missing local configs fail with a JSON response, not a GitHub Pages HTML fallback', async () => {
  const fetch = createDemoFetch(base, async () => new Response('<html>404</html>', {
    status: 200, headers: { 'Content-Type': 'text/html' },
  }));
  const response = await fetch(`${base}config/services.json`);
  assert.equal(response.status, 503);
  assert.match(response.headers.get('content-type'), /json/);
});

test('offline static demo loads cannot fall back to stale browser edits', async () => {
  const fetch = createDemoFetch(base, async () => { throw new TypeError('offline'); });
  assert.equal((await fetch(`${base}config/services.json`)).status, 503);
});
