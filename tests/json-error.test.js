import test from 'node:test';
import assert from 'node:assert/strict';
import { jsonSyntaxLocation } from '../src/utils/json-error.js';
test('JSON parser errors locate input for position or line-column messages', () => {
  assert.equal(jsonSyntaxLocation('Unexpected token at position 5', '{}  bad'), 5);
  assert.equal(jsonSyntaxLocation('Invalid JSON at line 2 column 3', '{}\nhello'), 5);
  assert.equal(jsonSyntaxLocation('Invalid JSON', '{}'), null);
});
