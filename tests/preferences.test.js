import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeTimings } from '../src/utils/preferences.js';
test('local timing values preserve off, clamp bounds and fall back for malformed storage', () => {
  assert.deepEqual(normalizeTimings(null), {categoryTimeout:2,launchDelay:0.7});
  assert.deepEqual(normalizeTimings({categoryTimeout:0,launchDelay:0}), {categoryTimeout:0,launchDelay:0});
  assert.deepEqual(normalizeTimings({categoryTimeout:999,launchDelay:999}), {categoryTimeout:30,launchDelay:5});
  assert.deepEqual(normalizeTimings({categoryTimeout:-1,launchDelay:NaN}), {categoryTimeout:0,launchDelay:0.7});
  assert.deepEqual(normalizeTimings({categoryTimeout:3.3,launchDelay:1.24}), {categoryTimeout:3,launchDelay:1.2});
});
