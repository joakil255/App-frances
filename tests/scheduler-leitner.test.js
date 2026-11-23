import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ANSWERS, NEW_SM2, NEW_LEITNER, LEITNER_DAYS, nextLeitner, nextSm2,
  cardIdOf, newCard, review, previewDays, dueOf,
} from '../js/lib/scheduler.js';
import { daysBetween } from '../js/lib/dates.js';

const TODAY = '2026-11-23';
const NOW = '2026-11-23T10:00:00.000Z';
const box = (n) => ({ box: n, due: TODAY });

test('estado nuevo y días por caja de Leitner', () => {
  assert.deepEqual(NEW_LEITNER, { box: 0, due: null });
  assert.deepEqual(LEITNER_DAYS, [1, 2, 4, 8, 16]);
});

test('L1: nueva + Bien → caja 1', () => {
  assert.deepEqual(nextLeitner(NEW_LEITNER, 'good', TODAY), { box: 1, due: '2026-11-24' });
});

test('L2: nueva + Difícil → caja 1', () => {
  assert.deepEqual(nextLeitner(NEW_LEITNER, 'hard', TODAY), { box: 1, due: '2026-11-24' });
});

test('L3: caja 1 + Fácil → caja 3 (4 días)', () => {
  assert.deepEqual(nextLeitner(box(1), 'easy', TODAY), { box: 3, due: '2026-11-27' });
});

test('L4: caja 2 + Difícil → se queda en la caja 2', () => {
  assert.deepEqual(nextLeitner(box(2), 'hard', TODAY), { box: 2, due: '2026-11-25' });
});

test('L5: caja 3 + Otra vez → caja 1, vuelve hoy', () => {
  assert.deepEqual(nextLeitner(box(3), 'again', TODAY), { box: 1, due: '2026-11-23' });
});

test('L6: caja 5 + Bien → sigue en la caja 5 (16 días)', () => {
  assert.deepEqual(nextLeitner(box(5), 'good', TODAY), { box: 5, due: '2026-12-09' });
});

test('L7: caja 4 + Fácil → caja 5, no 6', () => {
  assert.deepEqual(nextLeitner(box(4), 'easy', TODAY), { box: 5, due: '2026-12-09' });
});

test('Leitner: el atraso no cuenta', () => {
  assert.deepEqual(nextLeitner({ box: 2, due: '2026-10-01' }, 'good', TODAY), { box: 3, due: '2026-11-27' });
});

test('Leitner: una respuesta desconocida lanza un error', () => {
  assert.throws(() => nextLeitner(NEW_LEITNER, 'maybe', TODAY), { message: 'Respuesta desconocida: maybe' });
});

test('cardIdOf y newCard', () => {
  assert.equal(cardIdOf('w1', 'fr-es'), 'w1:fr-es');
  assert.deepEqual(newCard('w1', 'es-fr'), {
    id: 'w1:es-fr', wordId: 'w1', direction: 'es-fr', introducedOn: null, lastReviewedAt: null,
    sm2: NEW_SM2, leitner: NEW_LEITNER,
  });
});

test('review de una tarjeta nueva actualiza los dos algoritmos y fija introducedOn', () => {
  const card = review(newCard('w1', 'fr-es'), 'good', TODAY, NOW);
  assert.deepEqual(card, {
    id: 'w1:fr-es', wordId: 'w1', direction: 'fr-es', introducedOn: TODAY, lastReviewedAt: NOW,
    sm2: nextSm2(NEW_SM2, 'good', TODAY), leitner: nextLeitner(NEW_LEITNER, 'good', TODAY),
  });
  assert.equal(card.sm2.due, '2026-11-24');
  assert.equal(card.leitner.due, '2026-11-24');
});

test('repasarla otro día no cambia introducedOn', () => {
  const first = review(newCard('w1', 'fr-es'), 'good', TODAY, NOW);
  const later = '2026-11-24T08:00:00.000Z';
  const second = review(first, 'good', '2026-11-24', later);
  assert.equal(second.introducedOn, TODAY);
  assert.equal(second.lastReviewedAt, later);
});

test('review no modifica la tarjeta recibida', () => {
  const card = review(newCard('w1', 'fr-es'), 'good', TODAY, NOW);
  const copy = structuredClone(card);
  for (const answer of ANSWERS) review(card, answer, '2026-11-24', '2026-11-24T08:00:00.000Z');
  assert.deepEqual(card, copy);
});

test('previewDays coincide con review para cada algoritmo y respuesta', () => {
  const cards = [
    newCard('w1', 'fr-es'),
    review(newCard('w1', 'fr-es'), 'good', '2026-11-20', NOW),
    review(review(newCard('w1', 'fr-es'), 'easy', '2026-11-01', NOW), 'good', '2026-11-05', NOW),
  ];
  for (const card of cards) {
    for (const algorithm of ['sm2', 'leitner']) {
      const expected = {};
      for (const answer of ANSWERS) {
        expected[answer] = daysBetween(TODAY, review(card, answer, TODAY, NOW)[algorithm].due);
      }
      assert.deepEqual(previewDays(card, algorithm, TODAY), expected);
    }
  }
});

test('previewDays de una tarjeta nueva con SM-2 y con Leitner', () => {
  const card = newCard('w1', 'fr-es');
  assert.deepEqual(previewDays(card, 'sm2', TODAY), { again: 0, hard: 1, good: 1, easy: 4 });
  assert.deepEqual(previewDays(card, 'leitner', TODAY), { again: 0, hard: 1, good: 1, easy: 2 });
});

test('dueOf devuelve la fecha del algoritmo elegido', () => {
  const card = review(newCard('w1', 'fr-es'), 'easy', TODAY, NOW);
  assert.equal(dueOf(card, 'sm2'), '2026-11-27');
  assert.equal(dueOf(card, 'leitner'), '2026-11-25');
  assert.equal(dueOf(newCard('w2', 'fr-es'), 'sm2'), null);
});

test('un algoritmo desconocido lanza un error', () => {
  assert.throws(() => dueOf(newCard('w1', 'fr-es'), 'x'), { message: 'Algoritmo desconocido: x' });
  assert.throws(() => previewDays(newCard('w1', 'fr-es'), 'x', TODAY), { message: 'Algoritmo desconocido: x' });
});
