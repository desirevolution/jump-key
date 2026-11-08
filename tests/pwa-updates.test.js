import test from 'node:test';
import assert from 'node:assert/strict';
import { PwaUpdateController, UPDATE_INTERVAL_MS } from '../src/utils/pwa-updates.js';

test('update controller never activates a worker without user confirmation', async () => {
  const manager = new PwaUpdateController();
  let updates = 0;
  let activations = 0;
  const registration = { waiting: null, async update() { updates++; } };
  manager.setRegistration(registration);
  manager.setActivator(() => { activations++; });
  const states = [];
  const unsubscribe = manager.subscribe(state => states.push(state.status));
  assert.equal(await manager.check(), 'current');
  assert.equal(updates, 1);
  assert.equal(activations, 0);
  registration.waiting = {};
  manager.setAvailable();
  assert.equal(manager.state.available, true);
  assert.equal(activations, 0);
  assert.equal(manager.apply(), true);
  assert.equal(activations, 1);
  assert.ok(states.includes('checking'));
  unsubscribe();
});

test('checks are deduplicated, errors do not activate the waiting worker', async () => {
  const manager = new PwaUpdateController();
  let count = 0;
  let release;
  manager.setRegistration({ update() { count++; return new Promise(resolve => { release = resolve; }); } });
  const first = manager.check();
  const second = manager.check();
  release();
  assert.equal(await first, 'current');
  assert.equal(await second, 'current');
  assert.equal(count, 1);
  manager.setRegistration({ update() { throw new Error('no connection'); } });
  assert.equal(await manager.check(), 'error');
  assert.equal(manager.state.available, false);
  assert.equal(manager.apply(), false);
});

test('updating without a service worker is reported as unsupported', async () => {
  const manager = new PwaUpdateController();
  assert.equal(await manager.check(), 'unsupported');
  assert.equal(manager.state.checking, false);
  assert.equal(manager.apply(), false);
  assert.equal(UPDATE_INTERVAL_MS, 3600000);
});
