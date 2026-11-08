import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';

// Smoke-test the Lit lifecycle without a browser: the menu has a reactive
// "position" data property, which must not shadow its positioning method.
test('service action menu opens and repositions with position metadata', () => {
  const source = readFileSync(new URL('../src/components/service-actions.js', import.meta.url), 'utf8')
    .replace(/^import .*;\s*$/gm, '')
    .replace('export class ServiceActions', 'class ServiceActions');

  const handlers = new Map();
  const window = {
    innerWidth: 1200,
    innerHeight: 800,
    addEventListener(type, handler) { handlers.set(type, handler); },
    removeEventListener(type, handler) {
      if (handlers.get(type) === handler) handlers.delete(type);
    },
  };
  const context = {
    window,
    LitElement: class { disconnectedCallback() {} },
    html: () => {},
    customElements: { define() {} },
  };
  runInNewContext(`${source}\nglobalThis.ServiceActions = ServiceActions;`, context);

  const menu = new context.ServiceActions();
  menu.position = { index: 1, count: 3 }; // data supplied by src/app.js
  menu.anchor = { getBoundingClientRect: () => ({ left: 100, right: 220, top: 100, bottom: 140 }) };
  const dialog = {
    showModalCalled: false,
    showModal() { this.showModalCalled = true; },
    offsetWidth: 200,
    offsetHeight: 160,
    style: {
      left: '', top: '',
      removeProperty(property) { this[property] = ''; },
    },
  };
  menu.querySelector = () => dialog;

  assert.doesNotThrow(() => menu.firstUpdated());
  assert.equal(dialog.showModalCalled, true);
  assert.equal(dialog.style.left, '20px');
  assert.equal(dialog.style.top, '148px');
  assert.equal(typeof handlers.get('resize'), 'function');
  assert.equal(typeof handlers.get('scroll'), 'function');

  window.innerWidth = 390;
  handlers.get('resize')();
  assert.equal(dialog.style.left, '');
  assert.equal(dialog.style.top, '');

  menu.disconnectedCallback();
  assert.equal(handlers.size, 0);
});
