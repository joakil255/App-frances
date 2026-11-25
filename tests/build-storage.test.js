import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBuildStore, validateBuildDoc, BUILD_KEY } from '../js/lib/build-storage.js';
import { StorageError } from '../js/lib/storage.js';
import { review } from '../js/lib/scheduler.js';

class MemoryStorage {
  constructor(initial = {}) {
    this.data = new Map(Object.entries(initial));
    this.failWith = null;
  }
  getItem(key) {
    return this.data.has(key) ? this.data.get(key) : null;
  }
  setItem(key, value) {
    if (this.failWith) {
      const error = this.failWith;
      this.failWith = null;
      throw error;
    }
    this.data.set(key, String(value));
  }
}
const quotaError = () => Object.assign(new Error('lleno'), { name: 'QuotaExceededError' });
const NOW = new Date('2026-11-25T10:00:00.000Z');
const TODAY = '2026-11-25';
const TOMORROW = '2026-11-26';

async function makeStore(initial, makeId) {
  const backend = new MemoryStorage(initial);
  const store = createBuildStore(backend, { now: () => NOW, makeId });
  await store.load();
  return { store, backend };
}
const attempt = (store, correct, exerciseId = 'x3') => store.recordAttempt({ lessonId: 'fr-a1-01', exerciseId, correct, today: TODAY });

test('primer fallo no crea tarjeta', async () => {
  const { store } = await makeStore();
  assert.deepEqual(attempt(store, false), { cardCreated: false });
  assert.deepEqual(store.getState().cards, {});
});

test('segundo fallo con un acierto en medio crea la tarjeta ex: y no una segunda', async () => {
  const { store } = await makeStore();
  attempt(store, false);
  attempt(store, true);
  const second = attempt(store, false);
  assert.deepEqual(second, { cardCreated: true });
  const card = store.getState().cards['ex:fr-a1-01:x3'];
  assert.equal(card.kind, 'exercise');
  assert.equal(card.lessonId, 'fr-a1-01');
  assert.equal(card.exerciseId, 'x3');
  assert.equal(card.introducedOn, TODAY);
  assert.equal(card.sm2.due, TOMORROW);
  assert.equal(card.leitner.due, TOMORROW);
  assert.equal(card.lastReviewedAt, null);
  assert.deepEqual(attempt(store, false), { cardCreated: false });
  assert.equal(Object.keys(store.getState().cards).length, 1);
});

test('recordAttempt fija startedAt una vez y lastCorrectAt al acertar', async () => {
  const { store } = await makeStore();
  store.recordAttempt({ lessonId: 'fr-a1-01', exerciseId: 'x1', correct: true, today: TODAY });
  store.recordAttempt({ lessonId: 'fr-a1-01', exerciseId: 'x2', correct: false, today: '2026-11-27' });
  const p = store.getState().progress['fr-a1-01'];
  assert.equal(p.startedAt, TODAY);
  assert.equal(p.exercises.x1.lastCorrectAt, TODAY);
  assert.equal(p.exercises.x2.lastCorrectAt, null);
  assert.equal(p.exercises.x2.fails, 1);
});

test('completeLesson fija completedAt solo si era null', async () => {
  const { store } = await makeStore();
  store.completeLesson('fr-a1-01', TODAY);
  store.completeLesson('fr-a1-01', '2026-12-01');
  assert.equal(store.getState().progress['fr-a1-01'].completedAt, TODAY);
});

test('addOwnCard guarda los datos y vence mañana', async () => {
  const { store } = await makeStore(undefined, () => 'abc');
  const id = store.addOwnCard({ situation: 'Café', original: 'Je veux café', corrected: 'Je veux du café', errors: [{ original: 'café', corrected: 'du café' }], today: TODAY });
  assert.equal(id, 'own:abc');
  const card = store.getState().cards[id];
  assert.equal(card.kind, 'own');
  assert.equal(card.original, 'Je veux café');
  assert.equal(card.corrected, 'Je veux du café');
  assert.equal(card.situation, 'Café');
  assert.equal(card.errors.length, 1);
  assert.equal(card.sm2.due, TOMORROW);
  assert.equal(card.introducedOn, TODAY);
});

test('reviewCard usa review() con acierto good y fallo again, sin tocar fails', async () => {
  const { store } = await makeStore();
  attempt(store, false);
  attempt(store, false);
  const id = 'ex:fr-a1-01:x3';
  const before = store.getState().cards[id];
  const failsBefore = store.getState().progress['fr-a1-01'].exercises.x3.fails;
  const iso = NOW.toISOString();
  store.reviewCard(id, true, TOMORROW, iso);
  assert.deepEqual(store.getState().cards[id], review(before, 'good', TOMORROW, iso));
  const mid = store.getState().cards[id];
  store.reviewCard(id, false, '2026-11-27', iso);
  assert.deepEqual(store.getState().cards[id], review(mid, 'again', '2026-11-27', iso));
  assert.equal(store.getState().progress['fr-a1-01'].exercises.x3.fails, failsBefore);
  assert.ok(store.getState().cards[id].leitner.box >= 0);
});

test('removeCard solo borra tarjetas own', async () => {
  const { store } = await makeStore(undefined, () => 'abc');
  attempt(store, false);
  attempt(store, false);
  const id = store.addOwnCard({ situation: 's', original: 'o', corrected: 'c', errors: [], today: TODAY });
  store.removeCard('ex:fr-a1-01:x3');
  assert.ok(store.getState().cards['ex:fr-a1-01:x3']);
  store.removeCard(id);
  assert.equal(store.getState().cards[id], undefined);
});

test('si setItem falla lanza StorageError quota y la memoria no cambia', async () => {
  const { store, backend } = await makeStore();
  backend.failWith = quotaError();
  assert.throws(() => attempt(store, true), (e) => e instanceof StorageError && e.code === 'quota');
  assert.deepEqual(store.getState().progress, {});
  backend.failWith = quotaError();
  assert.throws(() => store.addOwnCard({ situation: 's', original: 'o', corrected: 'c', errors: [], today: TODAY }), StorageError);
  assert.deepEqual(store.getState().cards, {});
});

test('datos dañados se copian aparte y se empieza vacío', async () => {
  const backend = new MemoryStorage({ [BUILD_KEY]: '{"roto"' });
  const store = createBuildStore(backend, { now: () => NOW });
  const { corruptBackupKey } = await store.load();
  assert.equal(corruptBackupKey, `${BUILD_KEY}-corrupt-${NOW.toISOString()}`);
  assert.equal(backend.getItem(corruptBackupKey), '{"roto"');
  assert.deepEqual(store.getState(), { progress: {}, cards: {} });
});

test('un doc con tarjeta inválida se trata como dañado', async () => {
  const bad = JSON.stringify({ schemaVersion: 1, progress: {}, cards: { a: { id: 'b' } } });
  const backend = new MemoryStorage({ [BUILD_KEY]: bad });
  const { corruptBackupKey } = await createBuildStore(backend, { now: () => NOW }).load();
  assert.ok(corruptBackupKey);
});

test('500 tarjetas se guardan y se leen', async () => {
  const { store, backend } = await makeStore();
  let n = 0;
  const big = createBuildStore(backend, { now: () => NOW, makeId: () => `id${n++}` });
  await big.load();
  for (let i = 0; i < 500; i += 1) big.addOwnCard({ situation: 's', original: 'o', corrected: 'c', errors: [], today: TODAY });
  const again = createBuildStore(backend, { now: () => NOW });
  await again.load();
  assert.equal(Object.keys(again.getState().cards).length, 500);
  assert.ok(store);
});

test('validateBuildDoc rechaza formas incorrectas', () => {
  assert.equal(validateBuildDoc({ progress: {}, cards: {} }), true);
  assert.equal(validateBuildDoc(null), false);
  assert.equal(validateBuildDoc({ progress: [], cards: {} }), false);
  assert.equal(validateBuildDoc({ progress: {}, cards: [] }), false);
  const sm2 = { reps: 0, interval: 0, ease: 2.5, lapses: 0, due: null };
  const leitner = { box: 0, due: null };
  const own = { id: 'own:1', kind: 'own', original: 'a', corrected: 'b', situation: 's', errors: [], createdAt: 'x', introducedOn: null, lastReviewedAt: null, sm2, leitner };
  assert.equal(validateBuildDoc({ progress: {}, cards: { 'own:1': own } }), true);
  assert.equal(validateBuildDoc({ progress: {}, cards: { 'own:1': { ...own, errors: 'no' } } }), false);
  assert.equal(validateBuildDoc({ progress: {}, cards: { 'own:1': { ...own, sm2: { ...sm2, ease: 5 } } } }), false);
  assert.equal(validateBuildDoc({ progress: {}, cards: { 'own:1': { ...own, leitner: { box: 6, due: null } } } }), false);
  assert.equal(validateBuildDoc({ progress: {}, cards: { 'own:1': { ...own, kind: 'otro' } } }), false);
});

test('validateBuildDoc rechaza progreso mal formado', () => {
  const ok = { startedAt: TODAY, completedAt: null, exercises: { e1: { fails: 0, lastCorrectAt: null } } };
  assert.equal(validateBuildDoc({ progress: { l: ok }, cards: {} }), true);
  const bad = [
    5, null, [], { ...ok, startedAt: 3 }, { ...ok, completedAt: undefined }, { ...ok, exercises: [] },
    { ...ok, exercises: { e1: 7 } }, { ...ok, exercises: { e1: { fails: -1, lastCorrectAt: null } } },
    { ...ok, exercises: { e1: { fails: 1.5, lastCorrectAt: null } } }, { ...ok, exercises: { e1: { fails: 0, lastCorrectAt: 4 } } },
  ];
  for (const entry of bad) assert.equal(validateBuildDoc({ progress: { l: entry }, cards: {} }), false, JSON.stringify(entry));
});

test('watchExternalChanges recarga con su clave o con null', async () => {
  const { store, backend } = await makeStore();
  const listeners = [];
  const target = { addEventListener: (_t, fn) => listeners.push(fn) };
  let calls = 0;
  store.watchExternalChanges(target, () => { calls += 1; });
  await listeners[0]({ key: 'otra' });
  assert.equal(calls, 0);
  backend.data.set(BUILD_KEY, JSON.stringify({ schemaVersion: 1, progress: { l: { startedAt: TODAY, completedAt: null, exercises: {} } }, cards: {} }));
  await listeners[0]({ key: BUILD_KEY });
  assert.equal(calls, 1);
  assert.ok(store.getState().progress.l);
  await listeners[0]({ key: null });
  assert.equal(calls, 2);
});
