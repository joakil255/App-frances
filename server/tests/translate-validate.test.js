import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateTranslateInput } from '../src/translate-validate.js';

const input = (overrides = {}) => validateTranslateInput({ lang: 'fr', level: 'A1.2', supportLang: 'es', sentences: ['Léa habite à Lyon.'], ...overrides });

test('acepta una petición válida', () => {
  assert.deepEqual(input(), { ok: true, value: { lang: 'fr', level: 'A1.2', supportLang: 'es', sentences: ['Léa habite à Lyon.'] } });
});

test('rechaza lo que no es un objeto, otro idioma, nivel o idioma de apoyo', () => {
  for (const body of [null, 'x', 5, []]) assert.deepEqual(validateTranslateInput(body), { ok: false });
  assert.deepEqual(input({ lang: 'en' }), { ok: false });
  assert.deepEqual(input({ level: 'B2' }), { ok: false });
  assert.deepEqual(input({ supportLang: 'en' }), { ok: false });
  assert.deepEqual(input({ supportLang: undefined }), { ok: false });
});

test('rechaza listas vacías, de 61 frases o que no son lista', () => {
  assert.deepEqual(input({ sentences: [] }), { ok: false });
  assert.deepEqual(input({ sentences: 'Léa' }), { ok: false });
  assert.deepEqual(input({ sentences: Array(61).fill('Léa.') }), { ok: false });
  assert.equal(input({ sentences: Array(60).fill('Léa.') }).ok, true);
});

test('rechaza frases vacías, solo espacios, con salto de línea o de 601 letras', () => {
  assert.deepEqual(input({ sentences: [''] }), { ok: false });
  assert.deepEqual(input({ sentences: ['   '] }), { ok: false });
  assert.deepEqual(input({ sentences: ['a\nb'] }), { ok: false });
  assert.deepEqual(input({ sentences: [5] }), { ok: false });
  assert.deepEqual(input({ sentences: ['é'.repeat(601)] }), { ok: false });
  assert.equal(input({ sentences: ['é'.repeat(600)] }).ok, true);
});
