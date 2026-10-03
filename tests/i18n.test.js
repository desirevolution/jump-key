import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { translations } from '../src/utils/i18n.js';

const placeholders = (text) => [...text.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort();
test('all languages provide the same keys and placeholders', () => {
  const keys = Object.keys(translations.en).sort();
  for (const [language, entries] of Object.entries(translations)) {
    assert.deepEqual(Object.keys(entries).sort(), keys, language);
    for (const key of keys) {
      assert.ok(typeof entries[key] === 'string' && entries[key].trim(), `${language}.${key}`);
      assert.deepEqual(placeholders(entries[key]), placeholders(translations.en[key]), `${language}.${key}`);
    }
  }
});
test('literal translation references exist', () => {
  const src = new URL('../src/', import.meta.url);
  for (const file of readdirSync(src, { recursive: true }).filter(f => f.endsWith('.js'))) {
    const text = readFileSync(new URL(file, src), 'utf8');
    for (const [, key] of text.matchAll(/\bt\(['"]([^'"]+)['"]\s*[,)]/g)) {
      assert.ok(key in translations.en, `${file}: ${key}`);
    }
  }
});
