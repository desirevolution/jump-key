import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = path => readFileSync(new URL('../'+path, import.meta.url), 'utf8');

test('workspace management is a subdued secondary link in picker and narrow manager', () => {
  const picker = read('src/components/workspace-picker.js');
  const manager = read('src/components/management.js');
  const css = read('src/style.css');
  assert.match(picker, /class="jk-workspace-management-link"/);
  assert.doesNotMatch(picker, /⚙ Workspaces verwalten/);
  assert.match(manager, /class="jk-manager-workspace-link"[\s\S]{0,150}Workspaces verwalten/);
  assert.match(css, /\.jk-workspace-management-link\s*\{[^}]*background:transparent/);
  assert.match(css, /\.jk-manager-workspace-link\s*\{[^}]*background:transparent/);
  assert.match(css, /\.jk-workspace-management-link:focus-visible/);
  assert.match(css, /\.jk-manager-workspace-link:focus-visible/);
  assert.match(picker, /new CustomEvent\('manage'\)/);
});

test('README flags proxy migration and describes current four-phase behavior', () => {
  const readme = read('README.md');
  assert.match(readme, /\[!WARNING\]/);
  for (const term of ['JUMPKEY_AUTH_MODE=local', 'JUMPKEY_AUTH_MODE=proxy', 'JUMPKEY_TRUSTED_PROXIES', 'Remote-User', 'X-Forwarded-Proto', 'If-Match', 'IndexedDB', 'Settings → Info']) assert.ok(readme.includes(term), term);
  assert.doesNotMatch(readme, /Position selector offers/);
  assert.doesNotMatch(readme, /or copy its URL/);
  assert.doesNotMatch(readme, /Load each workspace online before/);
});
