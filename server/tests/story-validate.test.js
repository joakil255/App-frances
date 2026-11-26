import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateStoryInput } from '../src/story-validate.js';

const input = (overrides = {}) => validateStoryInput({ lang: 'fr', level: 'A1.2', topic: 'la plage', quizLang: 'es', ...overrides });

test('acepta una petición válida', () => {
  assert.deepEqual(input(), { ok: true, value: { lang: 'fr', level: 'A1.2', topic: 'la plage', quizLang: 'es', supportLang: 'es' } });
});

test('supportLang ausente vale es; en y un número se rechazan', () => {
  assert.equal(input().value.supportLang, 'es');
  assert.equal(input({ supportLang: 'es' }).value.supportLang, 'es');
  assert.deepEqual(input({ supportLang: 'en' }), { ok: false });
  assert.deepEqual(input({ supportLang: 5 }), { ok: false });
});

test('acepta los tres niveles, ambos idiomas de preguntas y un tema vacío', () => {
  for (const level of ['A1.1', 'A1.2', 'A2']) assert.equal(input({ level }).ok, true);
  assert.equal(input({ quizLang: 'fr' }).ok, true);
  assert.equal(input({ topic: '' }).ok, true);
});

test('el tema admite 60 letras con acentos y rechaza 61', () => {
  assert.equal(input({ topic: 'é'.repeat(60) }).ok, true);
  assert.equal(input({ topic: 'é'.repeat(61) }).ok, false);
});

test('rechaza tema con salto de línea o que no es texto', () => {
  assert.equal(input({ topic: 'la\nplage' }).ok, false);
  assert.equal(input({ topic: 'la\rplage' }).ok, false);
  assert.equal(input({ topic: 5 }).ok, false);
  assert.equal(input({ topic: undefined }).ok, false);
});

test('rechaza nivel desconocido, quizLang en, lang distinto de fr y cuerpo inválido', () => {
  assert.equal(input({ level: 'B1' }).ok, false);
  assert.equal(input({ quizLang: 'en' }).ok, false);
  assert.equal(input({ lang: 'es' }).ok, false);
  for (const bad of [null, [], 'x', undefined]) assert.equal(validateStoryInput(bad).ok, false);
});
