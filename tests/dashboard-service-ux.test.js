import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { buildDeleteConfig } from '../src/utils/quick-add.js';

const source = (file) => readFileSync(new URL(`../src/${file}`, import.meta.url), 'utf8');
const template = (strings, ...values) => strings.reduce((result, chunk, index) => {
  const value = values[index - 1];
  return result + (index ? Array.isArray(value) ? value.join('') : (typeof value === 'function' ? '' : (value ?? '')) : '') + chunk;
}, '');

test('dashboard service menu exposes only favorite and edit, including read-only state', () => {
  const js = source('components/service-actions.js')
    .replace(/^import .*;\s*$/gm, '')
    .replace('export class ServiceActions', 'class ServiceActions');
  const context = { html: template, LitElement: class {}, customElements: { define() {} } };
  runInNewContext(`${js}\nglobalThis.ServiceActions = ServiceActions;`, context);
  const menu = new context.ServiceActions();
  menu.service = {name:'Node-RED'};
  menu.favorite = false;
  menu.categoryMode = false;
  menu.t = (value) => value;
  let markup = menu.render();
  assert.match(markup, /addFavorite/);
  assert.match(markup, /editService/);
  assert.doesNotMatch(markup, /copyUrl|deleteService/);
  menu.favorite = true;
  assert.match(menu.render(), /removeFavorite/);
  menu.readOnly = true;
  markup = menu.render();
  assert.match(markup, /removeFavorite/);
  assert.doesNotMatch(markup, /editService|copyUrl|deleteService/);
});

test('service editing offers delete separately, with a clear unsaved-changes warning', () => {
  const quick = source('components/quick-add.js');
  const app = source('app.js');
  assert.match(quick, /this\.serviceId \? html`<button[^>]+jk-service-delete-trigger/);
  assert.match(quick, /@click=\$\{\(\)=>this\.askConfirmation\('delete'\)\}/);
  assert.match(quick, /this\.confirmAction === 'delete' && this\.hasChanges/);
  assert.match(quick, /deleteServiceUnsaved/);
  assert.match(quick, /buildDeleteConfig\(this\.config, this\.serviceId, this\.removeEmptyCategory\)/);
  assert.match(app, /migrateReferences\(config, this\.favorites, this\.continueHistory\)/);
  assert.doesNotMatch(app, /if \(action === 'copy'\)|if \(action === 'delete'\)/);
  const config = { categories: [
    {category:'Home',services:[{id:'alpha',name:'Alpha',url:'https://a.example'}]},
    {category:'Work',services:[{id:'beta',name:'Beta',url:'https://b.example'}]},
  ]};
  const next = buildDeleteConfig(config, 'alpha');
  assert.deepEqual(next.categories[0].services, []);
  assert.equal(next.categories[1].services[0].id, 'beta');
  assert.equal(config.categories[0].services[0].id, 'alpha');
});

test('favorite star is theme-colored, slightly larger, with slot number retained and no gold aura', () => {
  const card = source('components/service-card.js');
  const style = source('style.css');
  const favorites = source('components/favorites-view.js');
  const preview = source('components/config-appearance.js');
  const themes = source('themes/themes.js');
  assert.match(card, /jk-card-favorite inline-flex/);
  assert.match(card, /ui:star" class="size-\[18px\]"/);
  assert.match(card, /\$\{this\.favoriteSlot\}(<\/span>)/);
  assert.match(style, /\.jk-card-favorite,\s*\.jk-favorite-star \{ color:var\(--jk-accent-text\); \}/);
  assert.match(style, /\.jk-card-favorite svg,[\s\S]*?fill:currentColor/);
  assert.doesNotMatch(style, /\.jk-favorite-card\s*\{|--jk-card-favorite-background|--jk-favorite-glow/);
  assert.doesNotMatch(card, /jk-favorite-card|text-indigo-300" aria-label=\$\{t\(detectLang\(\), 'favorites'\)\}/);
  assert.match(favorites, /jk-favorites-icon-badge/);
  assert.match(preview, /jk-theme-preview-star/);
  assert.doesNotMatch(themes, /favorite: '#/);
});
