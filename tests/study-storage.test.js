import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createStudyStore, validateSettings, STUDY_KEY, DEFAULT_SETTINGS,
} from '../js/lib/study-storage.js';
import { StorageError, STORAGE_KEY } from '../js/lib/storage.js';
import { newCard, review } from '../js/lib/scheduler.js';
import { buildQueue } from '../js/lib/queue.js';

// Imita localStorage en memoria; cuenta las escrituras y failWith hace fallar el próximo setItem
class MemoryStorage {
  constructor(initial = {}) {
    this.data = new Map(Object.entries(initial));
    this.failWith = null;
    this.writes = 0;
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
    this.writes += 1;
    this.data.set(key, String(value));
  }
}

const NOW = new Date('2026-11-23T10:00:00.000Z');
const TODAY = '2026-11-23';
const makeStore = (backend = new MemoryStorage()) => createStudyStore(backend, { now: () => NOW });
const saved = (backend) => JSON.parse(backend.getItem(STUDY_KEY));
const quotaError = () => Object.assign(new Error('lleno'), { name: 'QuotaExceededError' });
const NEW_PER_DAY_ERROR = 'Escribe un número entero entre 0 y 100.';

function reviewed(wordId, answer) {
  const card = review(newCard(wordId, 'fr-es'), answer, TODAY, NOW.toISOString());
  const entry = {
    at: NOW.toISOString(), date: TODAY, cardId: card.id, wordId, direction: 'fr-es', answer, algorithm: 'sm2',
  };
  return { card, entry };
}

test('la clave y los ajustes por defecto', () => {
  assert.equal(STUDY_KEY, 'app-frances-study');
  assert.notEqual(STUDY_KEY, STORAGE_KEY);
  assert.deepEqual(DEFAULT_SETTINGS, { algorithm: 'sm2', direction: 'fr-es', newPerDay: 10 });
});

test('la primera carga da un estado vacío con los ajustes por defecto y lo guarda', async () => {
  const backend = new MemoryStorage();
  const store = makeStore(backend);
  const loaded = await store.load();
  assert.deepEqual(loaded, { cards: {}, history: [], settings: DEFAULT_SETTINGS, corruptBackupKey: null });
  assert.deepEqual(store.getState(), { cards: {}, history: [], settings: DEFAULT_SETTINGS });
  assert.deepEqual(saved(backend), { schemaVersion: 1, cards: {}, history: [], settings: DEFAULT_SETTINGS });
});

test('recordReview guarda la tarjeta y la entrada del historial en una sola escritura', async () => {
  const backend = new MemoryStorage();
  const store = makeStore(backend);
  await store.load();
  const writesBefore = backend.writes;
  const { card, entry } = reviewed('w1', 'good');
  await store.recordReview(card, entry);
  assert.equal(backend.writes - writesBefore, 1);
  assert.deepEqual(saved(backend).cards, { 'w1:fr-es': card });
  assert.deepEqual(saved(backend).history, [entry]);
  assert.deepEqual(store.getState().cards, { 'w1:fr-es': card });
  assert.deepEqual(store.getState().history, [entry]);
});

test('validateSettings acepta valores correctos y convierte el número', () => {
  assert.deepEqual(validateSettings({ algorithm: 'leitner', direction: 'es-fr', newPerDay: '5' }),
    { ok: true, errors: {}, settings: { algorithm: 'leitner', direction: 'es-fr', newPerDay: 5 } });
  assert.equal(validateSettings({ ...DEFAULT_SETTINGS, newPerDay: 0 }).ok, true);
  assert.equal(validateSettings({ ...DEFAULT_SETTINGS, newPerDay: '100' }).ok, true);
});

test('validateSettings rechaza nuevas por día que no sean un entero de 0 a 100', () => {
  for (const newPerDay of ['7.5', '-1', '', '101', 7.5, 'diez', null]) {
    const result = validateSettings({ ...DEFAULT_SETTINGS, newPerDay });
    assert.equal(result.ok, false, `debería rechazar ${JSON.stringify(newPerDay)}`);
    assert.equal(result.errors.newPerDay, NEW_PER_DAY_ERROR);
  }
});

test('validateSettings rechaza algoritmo o dirección desconocidos', () => {
  assert.equal(validateSettings({ ...DEFAULT_SETTINGS, algorithm: 'x' }).errors.algorithm, 'Elige un algoritmo.');
  assert.equal(validateSettings({ ...DEFAULT_SETTINGS, direction: 'x' }).errors.direction, 'Elige una dirección.');
});

test('saveSettings guarda ajustes válidos', async () => {
  const backend = new MemoryStorage();
  const store = makeStore(backend);
  await store.load();
  const result = await store.saveSettings({ algorithm: 'leitner', direction: 'es-fr', newPerDay: '20' });
  assert.deepEqual(result, { ok: true });
  const expected = { algorithm: 'leitner', direction: 'es-fr', newPerDay: 20 };
  assert.deepEqual(store.getState().settings, expected);
  assert.deepEqual(saved(backend).settings, expected);
});

test('saveSettings rechaza ajustes inválidos sin guardar ni cambiar nada', async () => {
  const backend = new MemoryStorage();
  const store = makeStore(backend);
  await store.load();
  const writesBefore = backend.writes;
  for (const newPerDay of ['7.5', '-1', '', '101']) {
    const result = await store.saveSettings({ ...DEFAULT_SETTINGS, newPerDay });
    assert.deepEqual(result, { ok: false, errors: { newPerDay: NEW_PER_DAY_ERROR } });
  }
  const bad = await store.saveSettings({ ...DEFAULT_SETTINGS, algorithm: 'x' });
  assert.equal(bad.ok, false);
  assert.equal(bad.errors.algorithm, 'Elige un algoritmo.');
  assert.equal(backend.writes, writesBefore);
  assert.deepEqual(store.getState().settings, DEFAULT_SETTINGS);
});

test('si los datos están dañados, los copia aparte y empieza vacío', async () => {
  for (const raw of ['{ "cards": roto', JSON.stringify({ schemaVersion: 1, cards: [], history: 'no' })]) {
    const backend = new MemoryStorage({ [STUDY_KEY]: raw });
    const loaded = await makeStore(backend).load();
    const key = `app-frances-study-corrupt-${NOW.toISOString()}`;
    assert.equal(loaded.corruptBackupKey, key);
    assert.equal(backend.getItem(key), raw);
    assert.deepEqual(loaded.cards, {});
    assert.deepEqual(loaded.history, []);
    assert.deepEqual(saved(backend), { schemaVersion: 1, cards: {}, history: [], settings: DEFAULT_SETTINGS });
  }
});

test('sin espacio: StorageError «quota» y el estado no cambia', async () => {
  const backend = new MemoryStorage();
  const store = makeStore(backend);
  await store.load();
  const before = backend.getItem(STUDY_KEY);
  const { card, entry } = reviewed('w1', 'good');

  backend.failWith = quotaError();
  await assert.rejects(store.recordReview(card, entry),
    (error) => error instanceof StorageError && error.code === 'quota');
  assert.deepEqual(store.getState(), { cards: {}, history: [], settings: DEFAULT_SETTINGS });
  assert.equal(backend.getItem(STUDY_KEY), before);

  backend.failWith = quotaError();
  await assert.rejects(store.saveSettings({ ...DEFAULT_SETTINGS, newPerDay: 3 }),
    (error) => error instanceof StorageError && error.code === 'quota');
  assert.deepEqual(store.getState().settings, DEFAULT_SETTINGS);
});

test('si no se puede leer el almacenamiento, load avisa con StorageError', async () => {
  const backend = { getItem() { throw new Error('SecurityError'); }, setItem() {} };
  await assert.rejects(makeStore(backend).load(),
    (error) => error instanceof StorageError && error.code === 'unavailable');
});

function storageEvent(key) {
  const event = new Event('storage');
  Object.defineProperty(event, 'key', { value: key });
  return event;
}
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

test('watchExternalChanges recarga cuando otra copia de la app guarda el estudio', async () => {
  const backend = new MemoryStorage();
  const store = makeStore(backend);
  await store.load();
  const target = new EventTarget();
  let changes = 0;
  store.watchExternalChanges(target, () => { changes += 1; });

  const other = makeStore(backend);
  await other.load();
  const { card, entry } = reviewed('w1', 'good');
  await other.recordReview(card, entry);

  target.dispatchEvent(storageEvent(STUDY_KEY));
  await tick();
  assert.equal(changes, 1);
  assert.deepEqual(store.getState().cards, { 'w1:fr-es': card });

  target.dispatchEvent(storageEvent(null)); // null = se borró todo
  await tick();
  assert.equal(changes, 2);
});

test('watchExternalChanges ignora cambios de otras claves (también las palabras)', async () => {
  const store = makeStore();
  await store.load();
  const target = new EventTarget();
  let changes = 0;
  store.watchExternalChanges(target, () => { changes += 1; });
  target.dispatchEvent(storageEvent(STORAGE_KEY));
  target.dispatchEvent(storageEvent('otra-clave'));
  await tick();
  assert.equal(changes, 0);
});

test('cerrar y reabrir a mitad de la sesión: mismo progreso y misma cola, sin nuevas extra', async () => {
  const backend = new MemoryStorage();
  const words = Array.from({ length: 8 }, (_, i) => ({ id: `w${i + 1}`, fr: `mot ${i + 1}`, es: `palabra ${i + 1}` }));
  const first = makeStore(backend);
  await first.load();
  await first.saveSettings({ ...DEFAULT_SETTINGS, newPerDay: '5' });

  const settings = first.getState().settings;
  const initial = buildQueue({ words, cards: {}, settings, today: TODAY });
  assert.deepEqual(initial.map((item) => item.wordId), ['w1', 'w2', 'w3', 'w4', 'w5']);

  // Repasa 3 de las 5 tarjetas; una con «Otra vez» vuelve hoy
  for (const [wordId, answer] of [['w1', 'again'], ['w2', 'good'], ['w3', 'easy']]) {
    const { card, entry } = reviewed(wordId, answer);
    await first.recordReview(card, entry);
  }
  const before = first.getState();
  const queueBefore = buildQueue({ words, cards: before.cards, settings: before.settings, today: TODAY });

  // «Reabrir la app»: otro almacén sobre el mismo backend
  const second = makeStore(backend);
  const loaded = await second.load();
  assert.equal(loaded.corruptBackupKey, null);
  assert.deepEqual(loaded.cards, before.cards);
  assert.deepEqual(loaded.settings, { ...DEFAULT_SETTINGS, newPerDay: 5 });
  assert.equal(loaded.history.length, 3);
  assert.deepEqual(loaded.history.map(({ date, answer, algorithm }) => ({ date, answer, algorithm })), [
    { date: TODAY, answer: 'again', algorithm: 'sm2' },
    { date: TODAY, answer: 'good', algorithm: 'sm2' },
    { date: TODAY, answer: 'easy', algorithm: 'sm2' },
  ]);

  const queueAfter = buildQueue({ words, cards: loaded.cards, settings: loaded.settings, today: TODAY });
  assert.deepEqual(queueAfter, queueBefore);
  assert.deepEqual(queueAfter.map((item) => item.wordId), ['w1', 'w4', 'w5']);
});
