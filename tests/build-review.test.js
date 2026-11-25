import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildReviewQueue, countDueToday, lessonStatus } from '../js/lib/build-review.js';
import { review } from '../js/lib/scheduler.js';

const TODAY = '2026-11-25';
const base = { createdAt: 'x', introducedOn: '2026-11-01', lastReviewedAt: null };
const mk = (id, due, extra = {}) => ({
  id, kind: id.startsWith('own:') ? 'own' : 'exercise', ...base,
  ...(id.startsWith('ex:') ? { lessonId: id.split(':')[1], exerciseId: id.split(':')[2] } : {}),
  sm2: { reps: 1, interval: 1, ease: 2.5, lapses: 0, due },
  leitner: { box: 1, due },
  ...extra,
});
const lessons = [{ id: 'l1', lesson: { exercises: [{ id: 'a' }, { id: 'b' }] }, error: null }];
const run = (cards, algorithm = 'sm2') => buildReviewQueue({ cards: Object.fromEntries(cards.map((c) => [c.id, c])), lessons, algorithm, today: TODAY });

test('ordena por fecha y luego por último repaso; omite no vencidas', () => {
  const queue = run([
    mk('ex:l1:a', '2026-11-24', { lastReviewedAt: '2026-11-20T00:00:00Z' }),
    mk('own:1', '2026-11-20'),
    mk('ex:l1:b', '2026-11-24', { lastReviewedAt: '2026-11-10T00:00:00Z' }),
    mk('own:2', '2026-11-26'),
  ]);
  assert.deepEqual(queue, ['own:1', 'ex:l1:b', 'ex:l1:a']);
});

test('las falladas hoy van al final', () => {
  const failed = review(mk('ex:l1:a', '2026-11-20'), 'again', TODAY, 'now');
  const queue = run([failed, mk('own:1', TODAY)]);
  assert.deepEqual(queue, ['own:1', 'ex:l1:a']);
});

test('ex: de un ejercicio o lección borrados queda fuera; own entra', () => {
  const cards = [mk('ex:l1:zzz', '2026-11-01'), mk('ex:l9:a', '2026-11-01'), mk('own:1', '2026-11-01')];
  assert.deepEqual(run(cards), ['own:1']);
  assert.equal(countDueToday({ cards: Object.fromEntries(cards.map((c) => [c.id, c])), lessons, algorithm: 'sm2', today: TODAY }), 1);
});

test('Cola del repaso e Inicio: ignoran las planned', () => {
  const planned = [{ id: 'fr-a1-10', status: 'planned', lesson: null, error: null }];
  const cards = { 'ex:fr-a1-10:x1': mk('ex:fr-a1-10:x1', '2026-11-01') };
  const args = { cards, lessons: planned, algorithm: 'sm2', today: TODAY };
  assert.deepEqual(buildReviewQueue(args), []);
  assert.equal(countDueToday(args), 0);
});

test('usa el algoritmo pedido', () => {
  const c = { ...mk('own:1', '2026-11-01'), leitner: { box: 1, due: '2026-12-01' } };
  assert.deepEqual(run([c], 'sm2'), ['own:1']);
  assert.deepEqual(run([c], 'leitner'), []);
});

test('500 tarjetas se ordenan', () => {
  const cards = [];
  for (let i = 0; i < 500; i += 1) cards.push(mk(`own:${i}`, `2026-10-${String(1 + (i % 28)).padStart(2, '0')}`));
  const queue = run(cards);
  assert.equal(queue.length, 500);
  assert.equal(queue[0].startsWith('own:'), true);
});

test('lessonStatus: new, started y done', () => {
  const lesson = { exercises: [{ id: 'a' }, { id: 'b' }] };
  assert.deepEqual(lessonStatus(lesson, undefined), { state: 'new', correct: 0, total: 2 });
  const started = { startedAt: TODAY, completedAt: null, exercises: { a: { fails: 0, lastCorrectAt: TODAY }, b: { fails: 1, lastCorrectAt: null } } };
  assert.deepEqual(lessonStatus(lesson, started), { state: 'started', correct: 1, total: 2 });
  const done = { ...started, exercises: { a: started.exercises.a, b: { fails: 1, lastCorrectAt: TODAY } } };
  assert.deepEqual(lessonStatus(lesson, done), { state: 'done', correct: 2, total: 2 });
});
