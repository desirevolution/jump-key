import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { handleGlobalKeyDown } from '../src/utils/keyboard/global.js';

// Exercise the actual service card keyboard handler without requiring a browser
// or weakening the global keyboard shortcuts.
const cardSource = readFileSync(new URL('../src/components/service-card.js', import.meta.url), 'utf8')
  .replace(/^import .*;\s*$/gm, '')
  .replace('export class JkServiceCard', 'class JkServiceCard');
const emitted = [];
const context = {
  LitElement: class { dispatchEvent(event) { emitted.push(event); } },
  CustomEvent: class {
    constructor(type, options) { this.type = type; Object.assign(this, options); }
  },
  customElements: { define() {} },
};
runInNewContext(`${cardSource}\nglobalThis.JkServiceCard = JkServiceCard;`, context);

function keyEvent(key, options = {}) {
  return {
    key,
    shiftKey: Boolean(options.shiftKey),
    target: { tagName: 'DIV', closest: () => null },
    prevented: false,
    stopped: false,
    preventDefault() { this.prevented = true; },
    stopPropagation() { this.stopped = true; },
  };
}

test('Space on a focused service card reaches the global search shortcut', () => {
  emitted.length = 0;
  const card = new context.JkServiceCard();
  card.name = 'Home Assistant';
  const space = keyEvent(' ');
  card._handleCardKeyDown(space);
  assert.equal(space.stopped, false, 'card must not swallow Space');
  assert.equal(space.prevented, false, 'global handler owns the Space shortcut');
  assert.equal(emitted.length, 0, 'Space must not launch a service');

  let opened = 0;
  const app = {
    readOnly: false,
    showQuickAdd: false,
    actionService: null,
    dialogConfig: { show: false },
    showConfigModal: false,
    showSearch: false,
    showHelp: false,
    favoriteRecording: null,
    openSearch() { opened += 1; },
  };
  handleGlobalKeyDown(space, app);
  assert.equal(space.prevented, true);
  assert.equal(opened, 1);
});

test('Enter still launches a focused service card', () => {
  emitted.length = 0;
  const card = new context.JkServiceCard();
  card.name = 'Home Assistant';
  card.subtitle = 'https://ha.example';
  const enter = keyEvent('Enter', { shiftKey: true });
  card._handleCardKeyDown(enter);
  assert.equal(enter.prevented, true);
  assert.equal(enter.stopped, true);
  assert.equal(emitted.length, 1);
  assert.equal(emitted[0].type, 'card-click');
  assert.equal(emitted[0].detail.service.name, 'Home Assistant');
  assert.equal(emitted[0].detail.shiftKey, true);
});

test('service card is advertised as a link, where Space is not the activation key', () => {
  assert.match(cardSource, /role="link"/);
  assert.doesNotMatch(cardSource, /role="button"/);
});
