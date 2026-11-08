import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const modal = readFileSync(new URL('../src/components/config-modal.js', import.meta.url), 'utf8');
const general = readFileSync(new URL('../src/components/config-general.js', import.meta.url), 'utf8');
const info = readFileSync(new URL('../src/components/config-info.js', import.meta.url), 'utf8');
const translations = readFileSync(new URL('../src/utils/i18n.js', import.meta.url), 'utf8');

test('info appears in settings navigation and is accessible by Ctrl+6', () => {
  assert.match(modal, /_setActiveTab\('info'\)/);
  assert.match(modal, /'6': 'info'/);
  assert.match(modal, /case 'info':/);
  assert.match(modal, /<jk-config-info/);
  assert.equal((translations.match(/tabInfo:/g) || []).length, 4);
});

test('version, update check and offline status live in Info instead of General', () => {
  assert.doesNotMatch(general, /jk-update-settings|pwaCheckNow|pwaVersion/);
  assert.match(info, /jk-update-settings/);
  assert.match(info, /pwaCheckNow/);
  assert.match(info, /pwaVersion/);
  assert.match(info, /pwaOfflineCache/);
  assert.match(info, /@click=\$\{\(\)=>this\.dispatchEvent\(new CustomEvent\('pwa-check'/);
});
