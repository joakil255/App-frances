import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SCREENS, resolveRoute, routeParam } from '../js/lib/router.js';

test('SCREENS tiene las siete pantallas en orden', () => {
  assert.deepEqual(SCREENS.map((s) => s.id), ['home', 'vocabulary', 'study', 'quiz', 'progress', 'chat', 'reader']);
  assert.deepEqual(SCREENS.map((s) => s.title), ['Inicio', 'Vocabulario', 'Estudiar', 'Quiz', 'Progreso', 'Conversar', 'Leer']);
});

test('cada dirección lleva a su pantalla', () => {
  assert.equal(resolveRoute('#/vocabulario'), 'vocabulary');
  assert.equal(resolveRoute('#/estudiar'), 'study');
  assert.equal(resolveRoute('#/quiz'), 'quiz');
  assert.equal(resolveRoute('#/progreso'), 'progress');
  assert.equal(resolveRoute('#/conversar'), 'chat');
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

test('#/leer y #/leer/<id> llevan al lector; routeParam da el id sin cambiarlo', () => {
  assert.equal(resolveRoute('#/leer'), 'reader');
  assert.equal(resolveRoute('#/leer/AbC-1'), 'reader');
  assert.equal(routeParam('#/leer/AbC-1'), 'AbC-1');
  assert.equal(routeParam('#/leer/AbC-1/'), 'AbC-1');
  assert.equal(routeParam('#/leer'), null);
  assert.equal(routeParam('#/leer/'), null);
  assert.equal(routeParam('#/quiz/abc'), null);
  assert.equal(routeParam('#main'), null);
  assert.equal(resolveRoute('#/leer/a/b'), 'home');
  assert.equal(resolveRoute('#/quiz/abc'), 'home');
});
