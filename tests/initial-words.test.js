import { test } from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_WORDS } from '../js/data/initial-words.js';
import { validateWord, duplicateKey } from '../js/lib/words.js';

const CATEGORIES = ['Saludos', 'Familia', 'Casa', 'Comida', 'Tiempo', 'Verbos'];

test('la lista inicial tiene 60 palabras, 10 por categoría', () => {
  assert.equal(INITIAL_WORDS.length, 60);
  for (const category of CATEGORIES) {
    assert.equal(INITIAL_WORDS.filter((w) => w.category === category).length, 10, category);
  }
});

test('cada palabra inicial es válida y tiene ejemplo con traducción', () => {
  for (const word of INITIAL_WORDS) {
    const { ok, errors } = validateWord(word);
    assert.ok(ok, `${word.fr}: ${JSON.stringify(errors)}`);
    assert.ok(word.exampleFr && word.exampleEs, `${word.fr}: falta el ejemplo`);
  }
});

test('ids únicos con prefijo seed- y sin palabras duplicadas', () => {
  const ids = INITIAL_WORDS.map((w) => w.id);
  assert.ok(ids.every((id) => /^seed-[a-z0-9-]+$/.test(id)), 'id con formato incorrecto');
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(new Set(INITIAL_WORDS.map((w) => duplicateKey(w.fr))).size, INITIAL_WORDS.length);
});

test('saludos y verbos no tienen género; los sustantivos de familia, casa y comida sí', () => {
  for (const word of INITIAL_WORDS) {
    if (['Saludos', 'Verbos'].includes(word.category)) assert.equal(word.gender, null, word.fr);
    if (['Familia', 'Casa', 'Comida'].includes(word.category)) assert.ok(word.gender, `${word.fr} sin género`);
  }
});

test('las palabras iniciales ya están normalizadas (lo guardado = lo escrito)', () => {
  for (const word of INITIAL_WORDS) {
    const { word: clean } = validateWord(word);
    for (const field of ['fr', 'es', 'exampleFr', 'exampleEs', 'category']) {
      assert.equal(word[field], clean[field], `${word.id}.${field}`);
    }
    assert.equal(typeof word.needsReview, 'boolean', word.id);
  }
});
