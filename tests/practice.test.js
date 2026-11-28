import test from 'node:test';
import assert from 'node:assert/strict';
import { practiceCounts } from '../js/lib/practice.js';

test('Palabras cuenta con singular y plural', () => {
  assert.equal(practiceCounts({ wordCount: 160, dueCount: 0, newCount: 0, textCount: 0 }).words, '160 palabras');
  assert.equal(practiceCounts({ wordCount: 1, dueCount: 0, newCount: 0, textCount: 0 }).words, '1 palabra');
  assert.equal(practiceCounts({ wordCount: 0, dueCount: 0, newCount: 0, textCount: 0 }).words, 'Todavía no tienes palabras');
  assert.equal(practiceCounts({ wordCount: 12000, dueCount: 0, newCount: 0, textCount: 0 }).words, '12.000 palabras');
});

test('Estudiar: repasos y nuevas, solo lo que no es cero', () => {
  const s = (dueCount, newCount, wordCount = 10) => practiceCounts({ wordCount, dueCount, newCount, textCount: 0 }).study;
  assert.equal(s(12, 5), '12 para repasar y 5 nuevas');
  assert.equal(s(1, 1), '1 para repasar y 1 nueva');
  assert.equal(s(12, 0), '12 para repasar');
  assert.equal(s(0, 5), '5 nuevas');
  assert.equal(s(0, 0), 'Al día');
  assert.equal(s(0, 0, 0), 'Añade palabras para empezar');
});

test('Leer cuenta las historias', () => {
  const r = (textCount) => practiceCounts({ wordCount: 1, dueCount: 0, newCount: 0, textCount }).reader;
  assert.equal(r(3), '3 historias');
  assert.equal(r(1), '1 historia');
  assert.equal(r(0), 'Todavía no tienes historias');
});
