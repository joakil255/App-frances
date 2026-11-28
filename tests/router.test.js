import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SCREENS, TABS, resolveRoute, routeParam, tabFor, redirectFor } from '../js/lib/router.js';

test('SCREENS: primero los tres destinos y después las pantallas de segundo nivel', () => {
  assert.deepEqual(SCREENS.map((s) => s.id), ['learn', 'practice', 'progress', 'vocabulary', 'study', 'quiz', 'reader', 'chat', 'build']);
  assert.deepEqual(TABS.map((s) => [s.id, s.path, s.title]), [['learn', 'aprende', 'Aprende'], ['practice', 'practica', 'Practica'], ['progress', 'progreso', 'Progreso']]);
});

test('cada pantalla de segundo nivel pertenece a su destino', () => {
  for (const id of ['vocabulary', 'study', 'quiz', 'reader', 'chat']) assert.equal(tabFor(id), 'practice');
  assert.equal(tabFor('build'), 'learn');
  for (const id of ['learn', 'practice', 'progress']) assert.equal(tabFor(id), id);
});

test('cada dirección lleva a su pantalla', () => {
  assert.equal(resolveRoute('#/vocabulario'), 'vocabulary');
  assert.equal(resolveRoute('#/estudiar'), 'study');
  assert.equal(resolveRoute('#/quiz'), 'quiz');
  assert.equal(resolveRoute('#/progreso'), 'progress');
  assert.equal(resolveRoute('#/conversar'), 'chat');
});

test('dirección vacía, #/ y #/aprende llevan a Aprende', () => {
  for (const hash of ['', '#', '#/', '#/aprende', '#/APRENDE/']) assert.equal(resolveRoute(hash), 'learn', hash);
  assert.equal(resolveRoute('#/practica'), 'practice');
});

test('ignora mayúsculas y la barra final', () => {
  assert.equal(resolveRoute('#/QUIZ'), 'quiz');
  assert.equal(resolveRoute('#/progreso/'), 'progress');
});

test('dirección desconocida lleva a Aprende', () => {
  assert.equal(resolveRoute('#/nada'), 'learn');
  assert.equal(resolveRoute('#/vocabulario/extra'), 'learn');
  assert.equal(resolveRoute('#/leer/a/b'), 'learn');
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
  assert.equal(resolveRoute('#/leer/a/b'), 'learn');
  assert.equal(resolveRoute('#/quiz/abc'), 'learn');
});

test('#/construir y #/construir/<id> llevan a Construir; routeParam da el id', () => {
  assert.equal(resolveRoute('#/construir'), 'build');
  assert.equal(resolveRoute('#/construir/fr-a1-01'), 'build');
  assert.equal(routeParam('#/construir'), null);
  assert.equal(routeParam('#/construir/fr-a1-01'), 'fr-a1-01');
  assert.equal(routeParam('#/construir/repaso'), 'repaso');
  assert.equal(resolveRoute('#/construir/repaso'), 'build');
  assert.equal(resolveRoute('#/construir/a/b'), 'learn');
  assert.equal(routeParam('#/leer/x'), 'x');
});

test('#/construir redirige a Aprende; lo demás no se redirige', () => {
  for (const hash of ['#/construir', '#/CONSTRUIR/', '#/construir/']) assert.equal(redirectFor(hash), '#/aprende', hash);
  for (const hash of ['#/construir/fr-a1-01', '#/construir/repaso', '#/', '', '#/leer', '#main']) assert.equal(redirectFor(hash), null, hash);
});
