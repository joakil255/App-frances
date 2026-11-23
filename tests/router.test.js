import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SCREENS, resolveRoute } from '../js/lib/router.js';

test('SCREENS tiene las cinco pantallas en orden', () => {
  assert.deepEqual(SCREENS.map((s) => s.id), ['home', 'vocabulary', 'study', 'quiz', 'progress']);
  assert.deepEqual(SCREENS.map((s) => s.title), ['Inicio', 'Vocabulario', 'Estudiar', 'Quiz', 'Progreso']);
});

test('cada dirección lleva a su pantalla', () => {
  assert.equal(resolveRoute('#/vocabulario'), 'vocabulary');
  assert.equal(resolveRoute('#/estudiar'), 'study');
  assert.equal(resolveRoute('#/quiz'), 'quiz');
  assert.equal(resolveRoute('#/progreso'), 'progress');
});

test('dirección vacía lleva a Inicio', () => {
  for (const hash of ['', '#', '#/']) {
    assert.equal(resolveRoute(hash), 'home', `hash "${hash}"`);
  }
});

test('ignora mayúsculas y la barra final', () => {
  assert.equal(resolveRoute('#/QUIZ'), 'quiz');
  assert.equal(resolveRoute('#/progreso/'), 'progress');
});

test('dirección desconocida lleva a Inicio', () => {
  assert.equal(resolveRoute('#/nada'), 'home');
  assert.equal(resolveRoute('#/vocabulario/extra'), 'home');
});

test('un ancla que no es pantalla devuelve null', () => {
  assert.equal(resolveRoute('#main'), null);
});
