import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolveDisplayVersion } from '../scripts/build-version.mjs';

const read = file => readFileSync(new URL(file, import.meta.url), 'utf8');

test('release tag is authoritative and leading v is removed', () => {
  assert.equal(resolveDisplayVersion({ releaseTag: 'v1.2.0', commitSha: 'abcdef123456', fallbackVersion: '1.0.0' }), '1.2.0');
  assert.equal(resolveDisplayVersion({ releaseTag: '1.2.0', commitSha: 'abcdef123456' }), '1.2.0');
  assert.equal(resolveDisplayVersion({ releaseTag: 'v1.3.0-rc.1' }), '1.3.0-rc.1');
  assert.equal(resolveDisplayVersion({ releaseTag: ' release-2026 ' }), 'release-2026');
});

test('development builds show short SHA; local build falls back to package version', () => {
  assert.equal(resolveDisplayVersion({ commitSha: 'abcdef1234567890', fallbackVersion: '1.0.0' }), 'dev-abcdef12');
  assert.equal(resolveDisplayVersion({ releaseTag: ' ', commitSha: ' ', fallbackVersion: '1.0.0' }), '1.0.0');
  assert.equal(resolveDisplayVersion({}), 'development');
});

test('Vite and Docker receive release build metadata', () => {
  assert.match(read('../vite.config.js'), /resolveDisplayVersion/);
  assert.match(read('../vite.config.js'), /releaseTag:\s*process\.env\.JUMPKEY_RELEASE_TAG/);
  assert.match(read('../vite.config.js'), /commitSha:\s*process\.env\.GITHUB_SHA/);
  assert.match(read('../vite.config.js'), /__APP_VERSION__:\s*JSON\.stringify\(displayVersion\)/);
  const docker = read('../Dockerfile');
  assert.match(docker, /ARG JUMPKEY_RELEASE_TAG/);
  assert.match(docker, /ARG GITHUB_SHA/);
  assert.ok(docker.indexOf('ARG JUMPKEY_RELEASE_TAG') < docker.indexOf('RUN npm run build'));
});

test('GitHub release builds use the release tag in Docker and standalone archives', () => {
  const workflow = read('../.github/workflows/docker-publish.yml');
  assert.match(workflow, /build-args:\s*\|[\s\S]*?JUMPKEY_RELEASE_TAG=\$\{\{ github\.event_name == 'release' && github\.event\.release\.tag_name \|\| '' \}\}/);
  assert.match(workflow, /GITHUB_SHA=\$\{\{ github\.sha \}\}/);
  assert.match(workflow, /- name: Build frontend\s+env:\s+JUMPKEY_RELEASE_TAG: \$\{\{ github\.event\.release\.tag_name \}\}/);
  assert.equal((workflow.match(/ref: \$\{\{ github\.event_name == 'release'/g) || []).length, 2);
  assert.match(read('../.github/workflows/ci.yml'), /ref: \$\{\{ github\.event_name == 'release'/);
});

test('header does not incorrectly prefix development versions with v', () => {
  const header = read('../src/components/dashboard-header.js');
  assert.match(header, /\^\\d/);
  assert.match(header, /this\.appVersion\.split\('\s'\)\[0\]/);
});
