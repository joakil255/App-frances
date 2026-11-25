import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeTranslation } from '../src/translate-normalize.js';

const codeOf = (raw, count) => {
  try {
    normalizeTranslation(raw, count);
  } catch (error) {
    assert.equal(error.name, 'ProviderError');
    return error.code;
  }
  assert.fail('debía fallar');
};

test('devuelve las traducciones cuando el largo coincide', () => {
  assert.deepEqual(normalizeTranslation({ translations: ['a', 'b'] }, 2), ['a', 'b']);
});

test('bad_output si falta, el largo no coincide o una traducción no sirve', () => {
  assert.equal(codeOf(null, 1), 'bad_output');
  assert.equal(codeOf({}, 1), 'bad_output');
  assert.equal(codeOf({ translations: ['a'] }, 2), 'bad_output');
  assert.equal(codeOf({ translations: ['a', 'b', 'c'] }, 2), 'bad_output');
  assert.equal(codeOf({ translations: ['a', ''] }, 2), 'bad_output');
  assert.equal(codeOf({ translations: ['a', '  '] }, 2), 'bad_output');
  assert.equal(codeOf({ translations: [5] }, 1), 'bad_output');
  assert.equal(codeOf({ translations: ['<i>a</i>'] }, 1), 'bad_output');
  assert.equal(codeOf({ translations: ['**a**'] }, 1), 'bad_output');
  assert.equal(codeOf({ translations: ['é'.repeat(601)] }, 1), 'bad_output');
  assert.deepEqual(normalizeTranslation({ translations: ['é'.repeat(600)] }, 1), ['é'.repeat(600)]);
});
