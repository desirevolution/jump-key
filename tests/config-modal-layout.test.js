import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const component = readFileSync(new URL('../src/components/config-modal.js', import.meta.url), 'utf8');
const stylesheet = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
const manager = readFileSync(new URL('../src/components/management.js', import.meta.url), 'utf8');
const app = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');

test('settings order puts Management before Appearance, including Ctrl+number shortcuts', () => {
  const nav = component.slice(component.indexOf('<nav class="${styles.sidebar}'), component.indexOf('</nav>', component.indexOf('<nav class="${styles.sidebar}')));
  const general = nav.indexOf("_setActiveTab('general')");
  const management = nav.indexOf("_setActiveTab('manage')");
  const appearance = nav.indexOf("_setActiveTab('appearance')");
  assert.ok(general >= 0 && general < management && management < appearance);
  assert.match(component, /'1': 'general', '2': 'manage', '3': 'appearance'/);
});

test('settings are their own view with compact navigation and no modal semantics', () => {
  assert.match(component, /overlay: `jk-settings-page`/);
  assert.match(stylesheet, /\.jk-settings-page \{[\s\S]*?position:fixed; inset:0/);
  assert.match(stylesheet, /\.jk-settings-page \.jk-config-main \{ display:grid; grid-template-columns:172px minmax\(0,1fr\)/);
  assert.doesNotMatch(component, /aria-modal="true" aria-labelledby="jk-config-title"/);
  assert.match(component, /class="jk-nav-back jk-btn jk-btn-secondary"/);
  assert.equal((component.match(/class="jk-nav-back jk-btn jk-btn-secondary"/g) || []).length, 1);
});

test('responsive navigation wraps without overlapping or clipping its tabs', () => {
  assert.match(stylesheet, /\.jk-settings-page \.jk-config-tabs \{display:grid; grid-template-columns:repeat\(auto-fit,minmax\(130px,1fr\)\)/);
  assert.match(stylesheet, /\.jk-settings-page \.jk-config-tabs button \{width:100%; min-width:0;/);
  assert.match(stylesheet, /@media\(max-width:760px\)/);
});

test('management has adaptive three/two/one column hierarchy and separate edit controls', () => {
  assert.match(stylesheet, /\.jk-manager-grid \{ display:grid; grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\) minmax\(0,1\.38fr\)/);
  assert.match(stylesheet, /@container \(max-width:1010px\)/);
  assert.match(stylesheet, /@container \(max-width:610px\)/);
  assert.doesNotMatch(manager, /jk-manager-tabs/);
  assert.match(manager, /_editButton\(`Workspace/);
  assert.match(manager, /_editButton\(`Kategorie/);
  assert.match(manager, /_editButton\(`Service/);
  assert.match(manager, /_mobileStep='categories'/);
});

test('one inline service editor stays inside the settings shell for dashboard and management', () => {
  assert.match(manager, /_emit\('open-service-editor'/);
  assert.doesNotMatch(manager, /<jk-quick-add/);
  assert.match(app, /@open-service-editor=\$\{e=>this\.openManagedServiceEditor\(e\.detail\)\}/);
  assert.equal((component.match(/<jk-quick-add/g) || []).length, 1);
  assert.equal((app.match(/<jk-quick-add/g) || []).length, 0);
  assert.match(component, /\.inline=\$\{true\}/);
  assert.match(component, /jk-settings-service-editor/);
  assert.match(component, /jk-settings-background-content/);
  assert.match(app, /quickReturnToSettings/);
});
