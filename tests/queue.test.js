import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildQueue, countDueOn } from '../js/lib/queue.js';
import { newCard, review, cardIdOf } from '../js/lib/scheduler.js';

const TODAY = '2026-11-23';
const SETTINGS = { algorithm: 'sm2', direction: 'fr-es', newPerDay: 10 };
const makeWords = (n) => Array.from({ length: n }, (_, i) => ({ id: `w${i + 1}`, fr: `mot ${i + 1}`, es: `palabra ${i + 1}` }));
const at = (date, time = '10:00') => `${date}T${time}:00.000Z`;

// Repasa la tarjeta de una palabra (la crea si es nueva) y la guarda en «cards»
function answer(cards, wordId, ans, date, time, direction = 'fr-es') {
  const id = cardIdOf(wordId, direction);
  cards[id] = review(cards[id] ?? newCard(wordId, direction), ans, date, at(date, time));
}
const ids = (queue) => queue.map((item) => item.wordId);
const newIds = (queue) => queue.filter((item) => item.isNew).map((item) => item.wordId);
const dueIds = (queue) => queue.filter((item) => !item.isNew).map((item) => item.wordId);

test('sin palabras la cola está vacía', () => {
  assert.deepEqual(buildQueue({ words: [], cards: {}, settings: SETTINGS, today: TODAY }), []);
});

test('Q1: vencidas antes que nuevas, con la forma { cardId, wordId, direction, isNew }', () => {
  const words = makeWords(3);
  const cards = {};
  answer(cards, 'w3', 'good', '2026-11-22', '10:00'); // vence el 11-23
  const queue = buildQueue({ words, cards, settings: SETTINGS, today: TODAY });
  assert.deepEqual(queue, [
    { cardId: 'w3:fr-es', wordId: 'w3', direction: 'fr-es', isNew: false },
    { cardId: 'w1:fr-es', wordId: 'w1', direction: 'fr-es', isNew: true },
    { cardId: 'w2:fr-es', wordId: 'w2', direction: 'fr-es', isNew: true },
  ]);
});

test('Q2: no más nuevas que el límite, en el orden de la lista de palabras', () => {
  const queue = buildQueue({ words: makeWords(15), cards: {}, settings: SETTINGS, today: TODAY });
  assert.deepEqual(ids(queue), ['w1', 'w2', 'w3', 'w4', 'w5', 'w6', 'w7', 'w8', 'w9', 'w10']);
});

test('Q3: tras introducir 4 hoy quedan 6 nuevas', () => {
  const words = makeWords(15);
  const cards = {};
  for (const id of ['w1', 'w2', 'w3', 'w4']) answer(cards, id, 'good', TODAY, '10:00');
  const queue = buildQueue({ words, cards, settings: SETTINGS, today: TODAY });
  assert.deepEqual(dueIds(queue), []);
  assert.deepEqual(newIds(queue), ['w5', 'w6', 'w7', 'w8', 'w9', 'w10']);
});

test('Q4: al día siguiente vuelven a ser 10 nuevas', () => {
  const words = makeWords(15);
  const cards = {};
  for (const id of ['w1', 'w2', 'w3', 'w4']) answer(cards, id, 'good', TODAY, '23:50');
  const queue = buildQueue({ words, cards, settings: SETTINGS, today: '2026-11-24' });
  assert.deepEqual(dueIds(queue), ['w1', 'w2', 'w3', 'w4']);
  assert.equal(newIds(queue).length, 10);
  assert.deepEqual(newIds(queue).slice(0, 2), ['w5', 'w6']);
});

test('Q5: una «Otra vez» vuelve hoy, al final de las vencidas', () => {
  const words = makeWords(4);
  const cards = {};
  answer(cards, 'w1', 'good', '2026-11-21', '09:00'); // vence el 11-22
  answer(cards, 'w2', 'good', '2026-11-22', '09:00'); // vence el 11-23
  answer(cards, 'w3', 'good', '2026-11-22', '08:00'); // vence el 11-23, repasada antes
  assert.deepEqual(dueIds(buildQueue({ words, cards, settings: SETTINGS, today: TODAY })), ['w1', 'w3', 'w2']);
  answer(cards, 'w1', 'again', TODAY, '10:00');
  const queue = buildQueue({ words, cards, settings: SETTINGS, today: TODAY });
  assert.deepEqual(ids(queue), ['w3', 'w2', 'w1', 'w4']);
});

test('Q6: al cambiar de algoritmo cambian las vencidas', () => {
  const words = makeWords(1);
  const cards = {};
  answer(cards, 'w1', 'easy', '2026-11-20', '10:00'); // SM-2: 11-24; Leitner: 11-22
  const sm2 = buildQueue({ words, cards, settings: SETTINGS, today: TODAY });
  const leitner = buildQueue({ words, cards, settings: { ...SETTINGS, algorithm: 'leitner' }, today: TODAY });
  assert.deepEqual(sm2, []);
  assert.deepEqual(dueIds(leitner), ['w1']);
});

test('Q7: solo aparecen tarjetas de la dirección elegida', () => {
  const words = makeWords(2);
  const cards = {};
  answer(cards, 'w1', 'good', '2026-11-22', '10:00', 'fr-es');
  const queue = buildQueue({ words, cards, settings: { ...SETTINGS, direction: 'es-fr' }, today: TODAY });
  assert.deepEqual(queue, [
    { cardId: 'w1:es-fr', wordId: 'w1', direction: 'es-fr', isNew: true },
    { cardId: 'w2:es-fr', wordId: 'w2', direction: 'es-fr', isNew: true },
  ]);
});

test('Q7: las introducidas hoy en la otra dirección no gastan el límite', () => {
  const words = makeWords(3);
  const cards = {};
  answer(cards, 'w1', 'good', TODAY, '10:00', 'es-fr');
  const queue = buildQueue({ words, cards, settings: { ...SETTINGS, newPerDay: 2 }, today: TODAY });
  assert.deepEqual(newIds(queue), ['w1', 'w2']);
});

test('Q8: la tarjeta de una palabra borrada no aparece', () => {
  const cards = {};
  answer(cards, 'w9', 'good', '2026-11-22', '10:00');
  const queue = buildQueue({ words: makeWords(1), cards, settings: SETTINGS, today: TODAY });
  assert.deepEqual(ids(queue), ['w1']);
});

test('Q9: con newPerDay = 0 no hay nuevas, pero sí vencidas', () => {
  const words = makeWords(3);
  const cards = {};
  answer(cards, 'w2', 'good', '2026-11-22', '10:00');
  const queue = buildQueue({ words, cards, settings: { ...SETTINGS, newPerDay: 0 }, today: TODAY });
  assert.deepEqual(queue, [{ cardId: 'w2:fr-es', wordId: 'w2', direction: 'fr-es', isNew: false }]);
});

test('Q10: editar el francés de una palabra conserva su tarjeta y su fecha', () => {
  const cards = {};
  answer(cards, 'w1', 'good', '2026-11-22', '10:00');
  const edited = [{ id: 'w1', fr: 'la maison', es: 'la casa' }];
  const queue = buildQueue({ words: edited, cards, settings: SETTINGS, today: TODAY });
  assert.deepEqual(queue, [{ cardId: 'w1:fr-es', wordId: 'w1', direction: 'fr-es', isNew: false }]);
  assert.equal(countDueOn({ words: edited, cards, settings: SETTINGS, date: TODAY }), 1);
});

test('countDueOn cuenta los repasos que vencen hasta una fecha, sin nuevas', () => {
  const words = makeWords(6);
  const cards = {};
  answer(cards, 'w1', 'good', TODAY, '10:00'); // 11-24
  answer(cards, 'w2', 'good', TODAY, '10:01'); // 11-24
  answer(cards, 'w3', 'easy', TODAY, '10:02'); // 11-27
  answer(cards, 'w4', 'again', TODAY, '10:03'); // hoy
  answer(cards, 'w5', 'good', TODAY, '10:04', 'es-fr'); // otra dirección
  const tomorrow = '2026-11-24';
  assert.equal(countDueOn({ words, cards, settings: SETTINGS, date: tomorrow }), 3);
  assert.equal(countDueOn({ words, cards, settings: SETTINGS, date: TODAY }), 1);
  assert.equal(countDueOn({ words: makeWords(1), cards, settings: SETTINGS, date: tomorrow }), 1);
});
