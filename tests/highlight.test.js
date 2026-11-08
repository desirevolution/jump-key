import test from 'node:test';
import assert from 'node:assert/strict';
import { highlightParts } from '../src/utils/highlight.js';
test('highlights all case insensitive occurrences without injecting markup', () => {
  assert.deepEqual(highlightParts('GitHub github', 'hub'), [
    { text: 'Git', match: false }, { text: 'Hub', match: true },
    { text: ' git', match: false }, { text: 'hub', match: true },
  ]);
  assert.deepEqual(highlightParts('<script>', 'script')[1], { text: 'script', match: true });
});
test('empty search returns plain text', () => {
  assert.deepEqual(highlightParts('Example', ''), [{ text: 'Example', match: false }]);
});
