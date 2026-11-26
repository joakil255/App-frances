import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createReaderPrefs, READER_PREFS_KEY } from '../js/lib/reader-prefs.js';

const memory = (initial = {}) => {
  const data = { ...initial };
  return { data, getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = v; } };
};

test('usa la misma clave que la pantalla actual', () => {
  assert.equal(READER_PREFS_KEY, 'app-frances-reader');
});

test('por defecto: preguntas en español y traducción oculta', () => {
  assert.deepEqual(createReaderPrefs(memory()).load(), { quizLang: 'es', showTranslation: false });
});

test('lee el documento antiguo { quizLang }', () => {
  const backend = memory({ [READER_PREFS_KEY]: JSON.stringify({ quizLang: 'fr' }) });
  assert.deepEqual(createReaderPrefs(backend).load(), { quizLang: 'fr', showTranslation: false });
});

test('save mezcla con lo guardado', () => {
  const backend = memory({ [READER_PREFS_KEY]: JSON.stringify({ quizLang: 'fr' }) });
  const prefs = createReaderPrefs(backend);
  prefs.save({ showTranslation: true });
  assert.deepEqual(prefs.load(), { quizLang: 'fr', showTranslation: true });
  prefs.save({ quizLang: 'es' });
  assert.deepEqual(prefs.load(), { quizLang: 'es', showTranslation: true });
});

test('valores raros vuelven al valor por defecto', () => {
  const backend = memory({ [READER_PREFS_KEY]: JSON.stringify({ quizLang: 'de', showTranslation: 'sí' }) });
  assert.deepEqual(createReaderPrefs(backend).load(), { quizLang: 'es', showTranslation: false });
});

test('JSON dañado o almacenamiento que falla no rompen', () => {
  assert.deepEqual(createReaderPrefs(memory({ [READER_PREFS_KEY]: '{no' })).load(), { quizLang: 'es', showTranslation: false });
  assert.deepEqual(createReaderPrefs(memory({ [READER_PREFS_KEY]: 'null' })).load(), { quizLang: 'es', showTranslation: false });
  const broken = { getItem() { throw new Error('x'); }, setItem() { throw new Error('x'); } };
  const prefs = createReaderPrefs(broken);
  assert.deepEqual(prefs.load(), { quizLang: 'es', showTranslation: false });
  assert.doesNotThrow(() => prefs.save({ showTranslation: true }));
});
