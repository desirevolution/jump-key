import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const settings=readFileSync(new URL('../src/components/config-modal.js',import.meta.url),'utf8');
const manager=readFileSync(new URL('../src/components/management.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/style.css',import.meta.url),'utf8');

test('one consistent Back button, independent of current settings/editing view',()=>{
  assert.equal((settings.match(/class="jk-nav-back jk-btn jk-btn-secondary"/g)||[]).length,1);
  assert.match(settings, /_backDestination\(\)/);
  assert.match(settings, /this\.serviceReturnToSettings \? 'Zurück zur Verwaltung' : 'Zurück zum Dashboard'/);
  assert.match(settings, /this\.querySelector\('jk-management'\)\?\.goBack\(\)/);
  assert.match(settings, /@management-view-changed=/);
  assert.match(manager, /management-view-changed/);
  assert.match(manager, /goBack\(\)\{this\._back\(\);\}/);
  assert.doesNotMatch(manager, /class="jk-editor-back"/);
  assert.doesNotMatch(settings, /class="jk-settings-back jk-btn jk-btn-secondary"/);
});

test('editor buttons sit inside the outlined form, not inside a separate raised footer card',()=>{
  assert.match(css, /\.jk-manager-subview \.jk-manager-form \{/);
  assert.match(css, /\.jk-settings-service-editor \.jk-quick-inline form,/);
  assert.match(css, /border-radius:1rem;/);
  assert.match(css, /box-shadow:none;/);
  assert.doesNotMatch(settings, /class="jk-editor-back"/);
});

test('JSON content maintains bounded flex scroll area with actions in the same column',()=>{
  assert.match(settings, /jk-settings-json-content/);
  assert.match(css, /\.jk-config-editor-panel \.jk-settings-json-content \{/);
  assert.match(css, /flex:1 1 auto;display:flex;flex-direction:column;min-height:0/);
  assert.match(css, /> jk-config-editor #editorContainer \{/);
  assert.match(css, /flex:1 1 0;height:0;min-height:0;overflow:auto/);
  const main=settings.slice(settings.indexOf('<main class="${styles.contentArea}'),settings.indexOf('</main>',settings.indexOf('<main class="${styles.contentArea}')));
  assert.match(main, /jk-config-footer jk-json-footer/);
  assert.equal((settings.match(/jk-config-footer jk-json-footer/g)||[]).length,1);
  assert.doesNotMatch(settings, /\$\{styles\.footer\} jk-config-footer/);
});
