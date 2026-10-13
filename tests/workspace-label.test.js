import { test } from 'node:test';
import assert from 'node:assert/strict';
import { workspaceLabel } from '../src/utils/workspace-label.js';
import { validateConfig, getConfigErrors } from '../src/utils/config-validator.js';
import { migrateConfig } from '../src/utils/configuration.js';

const config = workspaceName => ({ workspaceName, categories: [], searchEngines: [] });

test('workspaceName is optional; missing/blank names use the original label', () => {
  assert.equal(validateConfig({ categories: [], searchEngines: [] }), true);
  for (const name of ['', '  ']) {
    assert.equal(validateConfig(config(name)), true);
    assert.equal(workspaceLabel('default', name), '');
    assert.equal(workspaceLabel('my-work', name), 'My work');
  }
  assert.equal(workspaceLabel('default'), '');
});

test('configured workspaceName is shown without changing the underlying config', () => {
  const original = config(' My Services ');
  const migrated = migrateConfig(original);
  assert.equal(migrated.workspaceName, ' My Services ');
  assert.equal(workspaceLabel('default', migrated.workspaceName), 'My Services');
  assert.equal(workspaceLabel('work', migrated.workspaceName), 'My Services');
});

test('malformed workspace names are rejected, including control characters', () => {
  for (const name of [null, 123, [], {}, 'x'.repeat(65), 'First\nSecond', '\nFirst', 'Tab\tname', '\u007f']) {
    assert.equal(validateConfig(config(name)), false);
    assert.deepEqual(getConfigErrors(config(name))[0], { path: 'workspaceName', code: 'workspaceName', other: undefined });
  }
  assert.equal(validateConfig(config('🦊'.repeat(64))), true);
  assert.equal(validateConfig(config('🦊'.repeat(65))), false);
});
