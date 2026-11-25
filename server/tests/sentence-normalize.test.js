import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSentence } from '../src/sentence-normalize.js';
import { ProviderError } from '../src/errors.js';

const sentence = 'Je suis allé au café.';
const err = (overrides = {}) => ({ original: 'suis allé', corrected: 'suis allée', kind: 'grammar', explanation: 'Concordancia.', ...overrides });
const raw = (overrides = {}) => ({ errors: [err()], corrected: 'Je suis allée au café.', suggestion: 'Sois naturel.', ...overrides });
const isBad = (error) => error instanceof ProviderError && error.code === 'bad_output';

test('una frase con error queda incorrecta y conserva los datos', () => {
  const result = normalizeSentence(raw(), sentence);
  assert.deepEqual(result, { correct: false, corrected: 'Je suis allée au café.', errors: [err()], suggestion: 'Sois naturel.' });
});

test('un error sin cambio se descarta; si era el único → correct y corrected = la frase', () => {
  const noop = err({ original: 'Café', corrected: 'café.', explanation: 'Nada.' });
  const result = normalizeSentence(raw({ errors: [noop], corrected: 'otra cosa' }), sentence);
  assert.deepEqual(result.errors, []);
  assert.equal(result.correct, true);
  assert.equal(result.corrected, sentence);
});

test('el original se busca sin distinguir mayúsculas ni tipo de apóstrofo', () => {
  const frase = 'J’ai un chat.';
  const result = normalizeSentence(raw({ errors: [err({ original: "J'AI", corrected: "j'ai une" })], corrected: 'J’ai une chat.' }), frase);
  assert.equal(result.errors.length, 1);
});

test('original ausente de la frase → bad_output', () => {
  assert.throws(() => normalizeSentence(raw({ errors: [err({ original: 'nada de esto' })] }), sentence), isBad);
});

test('marcado en explanation o suggestion → bad_output', () => {
  assert.throws(() => normalizeSentence(raw({ errors: [err({ explanation: '<b>mal</b>' })] }), sentence), isBad);
  assert.throws(() => normalizeSentence(raw({ suggestion: '**ojo**' }), sentence), isBad);
});

test('explanation o suggestion de más de 300 letras → bad_output', () => {
  assert.throws(() => normalizeSentence(raw({ errors: [err({ explanation: 'a'.repeat(301) })] }), sentence), isBad);
  assert.throws(() => normalizeSentence(raw({ suggestion: 'a'.repeat(301) }), sentence), isBad);
  assert.doesNotThrow(() => normalizeSentence(raw({ suggestion: 'a'.repeat(300) }), sentence));
});

test("kind: 'style' → bad_output", () => {
  assert.throws(() => normalizeSentence(raw({ errors: [err({ kind: 'style' })] }), sentence), isBad);
});

test("suggestion: '' es válida", () => {
  assert.equal(normalizeSentence(raw({ suggestion: '' }), sentence).suggestion, '');
});

test('campos que faltan o de más → bad_output', () => {
  assert.throws(() => normalizeSentence({ errors: [], corrected: 'x' }, sentence), isBad);
  assert.throws(() => normalizeSentence(raw({ extra: 1 }), sentence), isBad);
  assert.throws(() => normalizeSentence(raw({ errors: [{ ...err(), extra: 1 }] }), sentence), isBad);
  assert.throws(() => normalizeSentence(raw({ errors: [{ original: 'suis allé', corrected: 'x', kind: 'grammar' }] }), sentence), isBad);
  assert.throws(() => normalizeSentence(raw({ errors: 'no' }), sentence), isBad);
  for (const bad of [null, 'x', [], 5]) assert.throws(() => normalizeSentence(bad, sentence), isBad);
});

test('con errores, corrected debe ser texto no vacío', () => {
  assert.throws(() => normalizeSentence(raw({ corrected: '' }), sentence), isBad);
  assert.throws(() => normalizeSentence(raw({ corrected: 5 }), sentence), isBad);
});

test('sin errores desde el principio → correct y corrected = la frase', () => {
  const result = normalizeSentence({ errors: [], corrected: sentence, suggestion: '' }, sentence);
  assert.deepEqual(result, { correct: true, corrected: sentence, errors: [], suggestion: '' });
});
