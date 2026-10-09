import test from 'node:test';
import assert from 'node:assert/strict';
import { handleGlobalKeyDown } from '../src/utils/keyboard/global.js';

function setup() {
  const app = {
    categories: [{ category: 'Tools', categoryKey: 't', services: [{ id: 'one', key: 'a' }] }],
    t: key => key,
    resetInput() { this.editRecording = null; this.activeCategoryKey = ''; },
    resetKeyboardInput() { this.currentInput = ''; },
    openQuickAdd(initial, returnToOverview) { this.opened = initial; this.returnToOverview = returnToOverview; },
  };
  const press = (key, extra = {}) => handleGlobalKeyDown({ key, target: { tagName: 'BODY' }, preventDefault() {}, ...extra }, app);
  return { app, press };
}

test('edit shortcut selects category and service without launching, tolerates invalid keys', () => {
  const { app, press } = setup();
  press('e', { ctrlKey: true });
  press('x');
  assert.equal(app.isInvalidInput, true);
  assert.equal(app.opened, undefined);
  press('T');
  assert.equal(app.activeCategoryKey, 't');
  press('x');
  assert.equal(app.opened, undefined);
  press('a');
  assert.deepEqual(app.opened, { serviceId: 'one' });
  assert.equal(app.returnToOverview, true);
  assert.equal(app.editRecording, null);
});

test('edit selection cancels with Escape and does not capture text fields or dialogs', () => {
  const { app, press } = setup();
  press('e', { ctrlKey: true });
  press('Escape');
  assert.equal(app.editRecording, null);
  press('e', { ctrlKey: true, target: { closest: () => true } });
  assert.equal(app.editRecording, null);
  app.showQuickAdd = true;
  press('e', { ctrlKey: true });
  assert.equal(app.editRecording, null);
});
