import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateLookupInput } from '../src/lookup-validate.js';

const ok = (word, sentence) => validateLookupInput({ lang: 'fr', word, sentence });

test('acepta «école» en «Je vais à l’école.»', () => {
  assert.deepEqual(ok('école', 'Je vais à l’école.'), {
    ok: true,
    value: { lang: 'fr', word: 'école', sentence: 'Je vais à l’école.' },
  });
});

test('la palabra se busca sin distinguir mayúsculas ni tipo de apóstrofo', () => {
  assert.equal(ok("aujourd'hui", 'Aujourd’hui, il pleut.').ok, true);
  assert.equal(ok('Bonjour', 'bonjour à tous').ok, true);
});

test('rechaza palabra vacía, con espacio, de 41 letras o ausente de la frase', () => {
  assert.equal(ok('', 'Bonjour').ok, false);
  assert.equal(ok('bon jour', 'bon jour').ok, false);
  const long = 'a'.repeat(41);
  assert.equal(ok(long, long).ok, false);
  assert.equal(ok('a'.repeat(40), 'a'.repeat(40)).ok, true);
  assert.equal(ok('chat', 'Le chien dort.').ok, false);
});

test('rechaza lang distinto de fr, frase vacía o de más de 1000 letras, cuerpo inválido', () => {
  assert.equal(validateLookupInput({ lang: 'en', word: 'a', sentence: 'a' }).ok, false);
  assert.equal(validateLookupInput({ word: 'a', sentence: 'a' }).ok, false);
  assert.equal(ok('a', '').ok, false);
  assert.equal(ok('a', `a${' '.repeat(1000)}`).ok, false);
  assert.equal(ok(5, 'a').ok, false);
  assert.equal(ok('a', 5).ok, false);
  for (const body of [null, [], 'x', 3]) assert.equal(validateLookupInput(body).ok, false);
});

test('rechaza una palabra con signos o etiquetas', () => {
  assert.equal(ok('<b>', 'a <b> c').ok, false);
  assert.equal(ok('chat.', 'le chat.').ok, false);
});
