import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBuildStore, validateBuildDoc, migrateBuildDoc, BUILD_KEY } from '../js/lib/build-storage.js';
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
  const id = store.addOwnCard({ situation: 'Café', original: 'Je veux café', corrected: 'Je veux du café', errors: [{ original: 'café', corrected: 'du café', kind: 'grammar', explanation: 'Falta el artículo.' }], today: TODAY });
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
  // Cada error debe ser un objeto con sus cuatro textos (un null rompería el repaso)
  const error = { original: 'a', corrected: 'b', kind: 'grammar', explanation: 'Porque sí.' };
  assert.equal(validateBuildDoc({ progress: {}, cards: { 'own:1': { ...own, errors: [error] } } }), true);
  for (const bad of [null, 'x', [], { ...error, explanation: 5 }, { original: 'a', corrected: 'b', kind: 'grammar' }, { ...error, kind: null }]) {
    assert.equal(validateBuildDoc({ progress: {}, cards: { 'own:1': { ...own, errors: [bad] } } }), false, JSON.stringify(bad));
  }
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

// --- Etapa 14: lastPractice y versión 2 ---
const stored = (backend) => JSON.parse(backend.getItem(BUILD_KEY));
const practiceOf = (store) => store.getState().progress['fr-a1-01'].lastPractice;

test('una carga vacía guarda la versión 2', async () => {
  const { backend } = await makeStore();
  assert.deepEqual(stored(backend), { schemaVersion: 2, progress: {}, cards: {} });
});

test('recordPractice guarda lastPractice con la fecha de hoy y lo reemplaza al repetir', async () => {
  const { store, backend } = await makeStore();
  attempt(store, true);
  store.recordPractice({ lessonId: 'fr-a1-01', firstTry: 7, total: 9, today: TODAY });
  assert.deepEqual(practiceOf(store), { firstTry: 7, total: 9, date: TODAY });
  store.recordPractice({ lessonId: 'fr-a1-01', firstTry: 9, total: 9, today: '2026-11-27' });
  assert.deepEqual(practiceOf(store), { firstTry: 9, total: 9, date: '2026-11-27' });
  // Lo guardado es lo mismo y no toca los ejercicios
  assert.deepEqual(stored(backend).progress['fr-a1-01'].lastPractice, { firstTry: 9, total: 9, date: '2026-11-27' });
  assert.equal(store.getState().progress['fr-a1-01'].exercises.x3.lastCorrectAt, TODAY);
  const again = createBuildStore(backend, { now: () => NOW });
  assert.equal((await again.load()).corruptBackupKey, null);
  assert.deepEqual(again.getState(), store.getState());
});

test('recordPractice en una lección sin progreso crea su entrada', async () => {
  const { store } = await makeStore();
  store.recordPractice({ lessonId: 'fr-a1-01', firstTry: 0, total: 3, today: TODAY });
  assert.deepEqual(store.getState().progress['fr-a1-01'], {
    startedAt: TODAY, completedAt: null, exercises: {}, lastPractice: { firstTry: 0, total: 3, date: TODAY },
  });
});

test('si recordPractice no puede guardar lanza StorageError y la memoria no cambia', async () => {
  const { store, backend } = await makeStore();
  store.recordPractice({ lessonId: 'fr-a1-01', firstTry: 2, total: 3, today: TODAY });
  const before = store.getState();
  const saved = backend.getItem(BUILD_KEY);
  backend.failWith = quotaError();
  assert.throws(() => store.recordPractice({ lessonId: 'fr-a1-01', firstTry: 3, total: 3, today: TOMORROW }),
    (e) => e instanceof StorageError && e.code === 'quota');
  assert.deepEqual(store.getState(), before);
  assert.equal(backend.getItem(BUILD_KEY), saved);
});

test('recordPractice no guarda un resultado imposible (dañaría todo el progreso)', async () => {
  const { store, backend } = await makeStore();
  const saved = backend.getItem(BUILD_KEY);
  for (const bad of [{ firstTry: 4, total: 3 }, { firstTry: 0, total: 0 }, { firstTry: -1, total: 3 }, { firstTry: 1.5, total: 3 }]) {
    store.recordPractice({ lessonId: 'fr-a1-01', ...bad, today: TODAY });
  }
  store.recordPractice({ lessonId: 'fr-a1-01', firstTry: 1, total: 3, today: '25/11/2026' });
  assert.deepEqual(store.getState().progress, {});
  assert.equal(backend.getItem(BUILD_KEY), saved);
});

const v1Doc = () => ({
  schemaVersion: 1,
  progress: { 'fr-a1-01': { startedAt: '2026-11-20', completedAt: '2026-11-21', exercises: { e1: { fails: 2, lastCorrectAt: '2026-11-21' } } } },
  cards: {
    'ex:fr-a1-01:e1': {
      id: 'ex:fr-a1-01:e1', kind: 'exercise', lessonId: 'fr-a1-01', exerciseId: 'e1', createdAt: '2026-11-20T10:00:00.000Z',
      introducedOn: '2026-11-20', lastReviewedAt: null,
      sm2: { reps: 0, interval: 0, ease: 2.5, lapses: 0, due: '2026-11-21' }, leitner: { box: 0, due: '2026-11-21' },
    },
  },
});

test('un documento v1 se carga, se guarda como v2 y conserva progreso y tarjetas', async () => {
  const old = v1Doc();
  const backend = new MemoryStorage({ [BUILD_KEY]: JSON.stringify(old) });
  const store = createBuildStore(backend, { now: () => NOW });
  assert.deepEqual(await store.load(), { corruptBackupKey: null, migrationError: null });
  assert.deepEqual(store.getState(), { progress: old.progress, cards: old.cards });
  assert.deepEqual(stored(backend), { ...old, schemaVersion: 2 });
  assert.deepEqual([...backend.data.keys()], [BUILD_KEY]); // sin copias aparte
});

test('si no se puede guardar la migración, avisa con migrationError y sigue con los datos en memoria', async () => {
  const raw = JSON.stringify(v1Doc());
  const backend = new MemoryStorage({ [BUILD_KEY]: raw });
  backend.failWith = quotaError();
  const store = createBuildStore(backend, { now: () => NOW });
  const { corruptBackupKey, migrationError } = await store.load();
  assert.equal(corruptBackupKey, null);
  assert.ok(migrationError instanceof StorageError);
  assert.equal(migrationError.code, 'quota');
  assert.deepEqual(store.getState(), { progress: v1Doc().progress, cards: v1Doc().cards });
  assert.equal(backend.getItem(BUILD_KEY), raw); // lo guardado sigue en v1, intacto
  // El siguiente guardado ya escribe la versión 2 con todo
  store.recordPractice({ lessonId: 'fr-a1-01', firstTry: 1, total: 1, today: TODAY });
  assert.equal(stored(backend).schemaVersion, 2);
  assert.deepEqual(stored(backend).cards, v1Doc().cards);
});

test('un documento v2 se carga sin reescribirse', async () => {
  const doc = { ...v1Doc(), schemaVersion: 2 };
  doc.progress['fr-a1-01'].lastPractice = { firstTry: 8, total: 10, date: TODAY };
  const raw = JSON.stringify(doc);
  const backend = new MemoryStorage({ [BUILD_KEY]: raw });
  backend.failWith = quotaError(); // si intentara escribir, fallaría
  const store = createBuildStore(backend, { now: () => NOW });
  assert.deepEqual(await store.load(), { corruptBackupKey: null, migrationError: null });
  assert.deepEqual(store.getState().progress['fr-a1-01'].lastPractice, { firstTry: 8, total: 10, date: TODAY });
  assert.equal(backend.getItem(BUILD_KEY), raw);
});

test('un documento de una versión desconocida y mayor se trata como dañado', async () => {
  const raw = JSON.stringify({ ...v1Doc(), schemaVersion: 3 });
  const backend = new MemoryStorage({ [BUILD_KEY]: raw });
  const store = createBuildStore(backend, { now: () => NOW });
  const { corruptBackupKey, migrationError } = await store.load();
  assert.equal(corruptBackupKey, `${BUILD_KEY}-corrupt-${NOW.toISOString()}`);
  assert.equal(migrationError, null);
  assert.equal(backend.getItem(corruptBackupKey), raw);
  assert.deepEqual(store.getState(), { progress: {}, cards: {} });
});

test('validateBuildDoc acepta lastPractice ausente o bien formado y rechaza el resto', () => {
  const entry = { startedAt: TODAY, completedAt: TODAY, exercises: {} };
  const docWith = (lastPractice) => ({ progress: { l: { ...entry, lastPractice } }, cards: {} });
  assert.equal(validateBuildDoc({ progress: { l: entry }, cards: {} }), true);
  for (const good of [{ firstTry: 0, total: 1, date: TODAY }, { firstTry: 10, total: 10, date: TODAY }, { firstTry: 3, total: 500, date: '2026-01-31' }]) {
    assert.equal(validateBuildDoc(docWith(good)), true, JSON.stringify(good));
  }
  const bad = [
    null, 5, 'x', [], {}, { firstTry: 11, total: 10, date: TODAY }, { firstTry: 0, total: 0, date: TODAY },
    { firstTry: 1, total: 3, date: '25/11/2026' }, { firstTry: 1, total: 3, date: '2026-13-01' }, { firstTry: 1, total: 3, date: '2026-02-30' },
    { firstTry: 1, total: 3, date: null }, { firstTry: -1, total: 3, date: TODAY }, { firstTry: 1.5, total: 3, date: TODAY },
    { firstTry: '1', total: 3, date: TODAY }, { firstTry: 1, total: 3 }, { total: 3, date: TODAY },
  ];
  for (const lastPractice of bad) assert.equal(validateBuildDoc(docWith(lastPractice)), false, JSON.stringify(lastPractice));
});

test('migrateBuildDoc devuelve la versión 2 sin otros cambios y sin tocar el original', () => {
  const old = v1Doc();
  const copyOfOld = structuredClone(old);
  assert.deepEqual(migrateBuildDoc(old), { ...copyOfOld, schemaVersion: 2 });
  assert.deepEqual(old, copyOfOld);
  // La parte de una copia de seguridad v4 no trae schemaVersion
  assert.deepEqual(migrateBuildDoc({ progress: {}, cards: {} }), { schemaVersion: 2, progress: {}, cards: {} });
});
