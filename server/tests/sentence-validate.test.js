import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateSentenceInput } from '../src/sentence-validate.js';

const base = { lang: 'fr', explainLang: 'es', level: 'A1', situation: 'En el café', focus: 'le présent', sentence: 'Je voudrais un café.' };
const input = (overrides = {}) => validateSentenceInput({ ...base, ...overrides });

test('acepta una petición válida', () => {
  assert.deepEqual(input(), { ok: true, value: base });
  assert.equal(input({ level: 'A2' }).ok, true);
});

test('la frase: vacía, de 301 letras o con salto de línea es inválida', () => {
  assert.equal(input({ sentence: '' }).ok, false);
  assert.equal(input({ sentence: '   ' }).ok, false);
  assert.equal(input({ sentence: 'a'.repeat(301) }).ok, false);
  assert.equal(input({ sentence: 'Je suis\nici' }).ok, false);
});

test('la frase de 300 letras, con acentos y con ’ es válida', () => {
  assert.equal(input({ sentence: 'é'.repeat(300) }).ok, true);
  assert.equal(input({ sentence: 'J’ai été là.' }).ok, true);
});

test('nivel, lang y explainLang fuera de lo permitido son inválidos', () => {
  assert.equal(input({ level: 'A1.2' }).ok, false);
  assert.equal(input({ lang: 'en' }).ok, false);
  assert.equal(input({ explainLang: 'fr' }).ok, false);
});

test('situation y focus: vacíos o de 301 letras son inválidos', () => {
  for (const key of ['situation', 'focus']) {
    assert.equal(input({ [key]: '' }).ok, false);
    assert.equal(input({ [key]: 'é'.repeat(301) }).ok, false);
    assert.equal(input({ [key]: 'é'.repeat(300) }).ok, true);
  }
});

test('un cuerpo que no es objeto es inválido', () => {
  for (const body of [null, 'x', [], 5, undefined]) assert.deepEqual(validateSentenceInput(body), { ok: false });
});

test('tipos que no son texto son inválidos', () => {
  assert.equal(input({ sentence: 5 }).ok, false);
  assert.equal(input({ situation: null }).ok, false);
  assert.equal(input({ focus: undefined }).ok, false);
});
