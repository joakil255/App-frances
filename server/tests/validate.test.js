import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateChatInput } from '../src/validate.js';
import { safeEqual } from '../src/access.js';

const base = { level: 'A1.1', history: [], message: 'Bonjour' };

test('acepta una entrada válida', () => {
  assert.deepEqual(validateChatInput(base), { ok: true, value: base });
});

test('acepta 500 caracteres contados por letra (acentos y emoji)', () => {
  const message = 'é😀'.repeat(250);
  assert.equal([...message].length, 500);
  assert.equal(validateChatInput({ ...base, message }).ok, true);
});

test('rechaza 501 caracteres', () => {
  assert.equal(validateChatInput({ ...base, message: 'a'.repeat(501) }).ok, false);
  assert.equal(validateChatInput({ ...base, message: 'é😀'.repeat(250) + 'a' }).ok, false);
});

test('rechaza mensaje vacío, solo espacios o que no es texto', () => {
  assert.equal(validateChatInput({ ...base, message: '' }).ok, false);
  assert.equal(validateChatInput({ ...base, message: '   \n ' }).ok, false);
  assert.equal(validateChatInput({ ...base, message: 5 }).ok, false);
});

test('rechaza cuerpo que no es objeto, nivel desconocido o historia que no es lista', () => {
  assert.equal(validateChatInput(null).ok, false);
  assert.equal(validateChatInput('hola').ok, false);
  assert.equal(validateChatInput({ ...base, level: 'B2' }).ok, false);
  assert.equal(validateChatInput({ ...base, history: 'x' }).ok, false);
});

test('rechaza un rol distinto de user/assistant', () => {
  const history = [{ role: 'system', content: 'hola' }];
  assert.equal(validateChatInput({ ...base, history }).ok, false);
});

test('rechaza un turno de más de 2000 caracteres y acepta 2000', () => {
  const ok = [{ role: 'user', content: 'a'.repeat(2000) }];
  const long = [{ role: 'user', content: 'a'.repeat(2001) }];
  assert.equal(validateChatInput({ ...base, history: ok }).ok, true);
  assert.equal(validateChatInput({ ...base, history: long }).ok, false);
});

test('rechaza turnos mal formados', () => {
  assert.equal(validateChatInput({ ...base, history: [null] }).ok, false);
  assert.equal(validateChatInput({ ...base, history: [{ role: 'user', content: 3 }] }).ok, false);
});

test('recorta la historia a los últimos 20 y quita assistant al inicio', () => {
  // 25 turnos alternando user/assistant; los últimos 20 empiezan en índice 5 (assistant)
  const history = Array.from({ length: 25 }, (_, i) => ({
    role: i % 2 === 0 ? 'user' : 'assistant',
    content: `m${i}`,
  }));
  const result = validateChatInput({ ...base, history });
  assert.equal(result.ok, true);
  assert.equal(result.value.history.length, 19);
  assert.equal(result.value.history[0].role, 'user');
  assert.equal(result.value.history[0].content, 'm6');
  assert.equal(result.value.history.at(-1).content, 'm24');
});

test('safeEqual compara textos', () => {
  assert.equal(safeEqual('abc', 'abc'), true);
  assert.equal(safeEqual('abc', 'abd'), false);
  assert.equal(safeEqual('abc', 'abcd'), false);
  assert.equal(safeEqual('', ''), true);
  assert.equal(safeEqual('é', 'e'), false);
});
