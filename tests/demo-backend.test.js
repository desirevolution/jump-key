import test from 'node:test';
import assert from 'node:assert/strict';
import { createDemoFetch } from '../src/utils/demo-backend.js';

test('demo routes use the Pages base, isolate saves and reset on reload', async () => {
  const requests = [];
  const network = async (url, options) => {
    requests.push({ url, options });
    return Response.json({ original: url });
  };
  const create = () => createDemoFetch('/jump-key/', network);
  const fetch = create();
  const manifest = await (await fetch('/jump-key/api/workspaces')).json();
  assert.deepEqual(manifest.workspaces.map(w => w.id), ['default', 'home', 'work']);
  assert.equal(requests.length, 0);
  await fetch('/jump-key/config/services.json?workspace=work');
  assert.equal(requests.at(-1).url, 'https://demo.invalid/jump-key/config/work.workspace.json');
  await fetch('/jump-key/config/services.json?workspace=work', { method: 'PUT', body: '{"edited":true}' });
  assert.equal(requests.length, 1);
  await fetch('/jump-key/config/services.json?workspace=home');
  assert.equal(requests.at(-1).url, 'https://demo.invalid/jump-key/config/home.workspace.json');
  assert.deepEqual(await (await fetch('/jump-key/config/services.json?workspace=work')).json(), { edited: true });
  assert.ok((await (await create()('/jump-key/config/services.json?workspace=work')).json()).original);
  await fetch('/jump-key/config/services.json');
  assert.equal(requests.at(-1).url, 'https://demo.invalid/jump-key/config/services.json');
  assert.equal((await fetch('/jump-key/config/services.json?workspace=unknown')).status, 404);
  await fetch('https://example.com/config/services.json');
  assert.equal(requests.at(-1).url, 'https://example.com/config/services.json');
});

test('offline demo loads cannot fall back to saved browser edits', async () => {
  const fetch = createDemoFetch('/jump-key/', async () => { throw new TypeError('offline'); });
  assert.equal((await fetch('/jump-key/config/services.json')).status, 503);
});
