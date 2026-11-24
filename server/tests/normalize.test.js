import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeOutput } from '../src/normalize.js';
import { ProviderError } from '../src/errors.js';

const fix = { original: 'je habite', corrected: "j'habite", explanation: 'Elisión.' };

test('devuelve reply y corrections válidos', () => {
  const out = normalizeOutput({ reply: 'Bonjour !', corrections: [fix] });
  assert.deepEqual(out, { reply: 'Bonjour !', corrections: [fix] });
});

test('descarta correcciones que no cambian nada', () => {
  const same = [
    { original: 'Nous allons', corrected: 'Nous allons', explanation: 'x' },
    { original: 'à l’école', corrected: "à l'école", explanation: 'x' },
    { original: 'Il est.', corrected: 'il est', explanation: 'x' },
  ];
  const out = normalizeOutput({ reply: 'Salut', corrections: [...same, fix] });
  assert.deepEqual(out.corrections, [fix]);
});

test('salida inválida → bad_output', () => {
  const invalid = [
    null,
    'texto',
    { corrections: [] },
    { reply: '', corrections: [] },
    { reply: 'Salut', corrections: 'no' },
    { reply: 'Salut', corrections: [{ original: 'a', corrected: 'b' }] },
    { reply: 'Salut', corrections: [], extra: 1 },
  ];
  for (const raw of invalid) {
    assert.throws(
      () => normalizeOutput(raw),
      (error) => error instanceof ProviderError && error.code === 'bad_output',
    );
  }
});
