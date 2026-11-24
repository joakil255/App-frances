import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWordStore, StorageError, STORAGE_KEY } from '../js/lib/storage.js';
import { lemmaOf } from '../js/lib/words.js';

// Imita localStorage en memoria; failWith hace que el próximo setItem lance ese error
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

const SEED = [
  { id: 'seed-chat', fr: 'le chat', es: 'el gato', exampleFr: '', exampleEs: '', category: 'Animales', gender: 'm', needsReview: false },
  { id: 'seed-etre', fr: 'être', es: 'ser', exampleFr: '', exampleEs: '', category: 'Verbos', gender: null, needsReview: true },
];
const NOW = new Date('2026-11-23T10:00:00.000Z');
const LATER = new Date('2026-11-24T10:00:00.000Z');

function makeStore(backend = new MemoryStorage(), { now = () => NOW } = {}) {
  let n = 0;
  return createWordStore(backend, { initialWords: SEED, makeId: () => `id-${++n}`, now });
}
const saved = (backend) => JSON.parse(backend.getItem(STORAGE_KEY));

test('la primera carga guarda la lista inicial con fechas', async () => {
  const backend = new MemoryStorage();
  const { words, corruptBackupKey } = await makeStore(backend).load();
  assert.equal(corruptBackupKey, null);
  assert.deepEqual(words.map((w) => w.id), ['seed-chat', 'seed-etre']);
  assert.equal(words[0].createdAt, NOW.toISOString());
  assert.equal(saved(backend).schemaVersion, 2);
  assert.equal(saved(backend).words.length, 2);
});

test('no vuelve a sembrar la lista aunque el usuario la haya vaciado', async () => {
  const backend = new MemoryStorage({ [STORAGE_KEY]: JSON.stringify({ schemaVersion: 1, words: [] }) });
  const { words } = await makeStore(backend).load();
  assert.deepEqual(words, []);
});

test('si los datos guardados están dañados, los copia aparte y empieza vacía', async () => {
  const backend = new MemoryStorage({ [STORAGE_KEY]: '{ "words": [ roto' });
  const { words, corruptBackupKey } = await makeStore(backend).load();
  assert.deepEqual(words, []);
  assert.equal(corruptBackupKey, `app-frances-corrupt-${NOW.toISOString()}`);
  assert.equal(backend.getItem(corruptBackupKey), '{ "words": [ roto');
  assert.deepEqual(saved(backend).words, []);
});

test('un documento sin lista de palabras también cuenta como dañado', async () => {
  const backend = new MemoryStorage({ [STORAGE_KEY]: '{"schemaVersion":1}' });
  const { corruptBackupKey } = await makeStore(backend).load();
  assert.ok(corruptBackupKey);
});

test('saveWord crea una palabra nueva normalizada, con id y fechas', async () => {
  const backend = new MemoryStorage();
  const store = makeStore(backend);
  await store.load();
  const result = await store.saveWord({ fr: ' la  maison ', es: 'la casa', gender: 'f' });
  assert.equal(result.ok, true);
  assert.equal(result.word.id, 'id-1');
  assert.equal(result.word.fr, 'la maison');
  assert.equal(result.word.createdAt, NOW.toISOString());
  assert.equal(saved(backend).words.length, 3);
  assert.equal(store.getWords().length, 3);
});

test('saveWord edita conservando id y fecha de creación', async () => {
  let now = NOW;
  const backend = new MemoryStorage();
  const store = makeStore(backend, { now: () => now });
  await store.load();
  now = LATER;
  const result = await store.saveWord({ ...SEED[0], es: 'el gato (animal)' }, 'seed-chat');
  assert.equal(result.ok, true);
  assert.equal(result.word.id, 'seed-chat');
  assert.equal(result.word.createdAt, NOW.toISOString());
  assert.equal(result.word.updatedAt, LATER.toISOString());
  assert.equal(saved(backend).words.find((w) => w.id === 'seed-chat').es, 'el gato (animal)');
});

test('saveWord rechaza una palabra inválida o duplicada sin guardar nada', async () => {
  const backend = new MemoryStorage();
  const store = makeStore(backend);
  await store.load();
  const before = backend.getItem(STORAGE_KEY);
  const invalid = await store.saveWord({ fr: '', es: 'algo' });
  assert.equal(invalid.ok, false);
  assert.equal(invalid.errors.fr, 'Escribe la palabra en francés.');
  const duplicate = await store.saveWord({ fr: 'Le Chat', es: 'gato', gender: 'm' });
  assert.equal(duplicate.ok, false);
  assert.equal(backend.getItem(STORAGE_KEY), before);
});

test('deleteWord borra la palabra', async () => {
  const backend = new MemoryStorage();
  const store = makeStore(backend);
  await store.load();
  await store.deleteWord('seed-chat');
  assert.deepEqual(saved(backend).words.map((w) => w.id), ['seed-etre']);
});

test('applyImport añade las nuevas y deja intactas las duplicadas', async () => {
  const backend = new MemoryStorage();
  const store = makeStore(backend);
  await store.load();
  const plan = {
    newWords: [{ row: 2, word: { fr: 'le pain', es: 'el pan', exampleFr: '', exampleEs: '', category: '', gender: 'm', needsReview: false } }],
    duplicates: [{ row: 3, existingId: 'seed-chat', word: { ...SEED[0], es: 'otro' } }],
    invalid: [],
  };
  const result = await store.applyImport(plan, { replaceDuplicates: false });
  assert.deepEqual(result, { added: 1, replaced: 0 });
  assert.equal(saved(backend).words.find((w) => w.id === 'seed-chat').es, 'el gato');
  assert.equal(saved(backend).words.length, 3);
});

test('applyImport con reemplazo conserva id y fecha de creación', async () => {
  let now = NOW;
  const backend = new MemoryStorage();
  const store = makeStore(backend, { now: () => now });
  await store.load();
  now = LATER;
  const plan = { newWords: [], duplicates: [{ row: 2, existingId: 'seed-chat', word: { ...SEED[0], es: 'el michi' } }], invalid: [] };
  const result = await store.applyImport(plan, { replaceDuplicates: true });
  assert.deepEqual(result, { added: 0, replaced: 1 });
  const word = saved(backend).words.find((w) => w.id === 'seed-chat');
  assert.equal(word.es, 'el michi');
  assert.equal(word.createdAt, NOW.toISOString());
  assert.equal(word.updatedAt, LATER.toISOString());
});

test('si el navegador no deja guardar, avisa con StorageError y no cambia nada', async () => {
  const backend = new MemoryStorage();
  const store = makeStore(backend);
  await store.load();
  const before = backend.getItem(STORAGE_KEY);
  backend.failWith = Object.assign(new Error('lleno'), { name: 'QuotaExceededError' });
  await assert.rejects(store.saveWord({ fr: 'le pain', es: 'el pan', gender: 'm' }),
    (error) => error instanceof StorageError && error.code === 'quota');
  assert.equal(store.getWords().length, 2, 'la lista en memoria no cambia');
  assert.equal(backend.getItem(STORAGE_KEY), before);
  backend.failWith = new Error('bloqueado');
  await assert.rejects(store.deleteWord('seed-chat'), (error) => error instanceof StorageError && error.code === 'unavailable');
  assert.equal(store.getWords().length, 2);
});

test('si no se puede leer el almacenamiento, load avisa con StorageError', async () => {
  const backend = { getItem() { throw new Error('SecurityError'); }, setItem() {} };
  await assert.rejects(makeStore(backend).load(), (error) => error instanceof StorageError && error.code === 'unavailable');
});

// Otra copia de la app (pestaña o app instalada) cambia los datos: el navegador avisa con «storage»
function storageEvent(key) {
  const event = new Event('storage');
  Object.defineProperty(event, 'key', { value: key });
  return event;
}

test('watchExternalChanges recarga la lista cuando otra copia de la app guarda', async () => {
  const backend = new MemoryStorage();
  const store = makeStore(backend);
  await store.load();
  const target = new EventTarget();
  let changes = 0;
  store.watchExternalChanges(target, () => { changes += 1; });

  // La otra copia añade una palabra
  const other = makeStore(backend);
  await other.load();
  await other.saveWord({ fr: 'le pain', es: 'el pan', gender: 'm' });

  target.dispatchEvent(storageEvent(STORAGE_KEY));
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(changes, 1);
  assert.equal(store.getWords().length, 3);

  // Guardar aquí ya no borra la palabra de la otra copia
  await store.saveWord({ fr: 'le lait', es: 'la leche', gender: 'm' });
  assert.deepEqual(saved(backend).words.map((w) => w.fr).sort(), ['le chat', 'le lait', 'le pain', 'être']);
});

test('watchExternalChanges ignora cambios de otras claves', async () => {
  const store = makeStore();
  await store.load();
  const target = new EventTarget();
  let changes = 0;
  store.watchExternalChanges(target, () => { changes += 1; });
  target.dispatchEvent(storageEvent('otra-clave'));
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(changes, 0);
});

// --- Etapa 10: palabras versión 2 (lang y lemma) y migración desde la versión 1 ---
const V1_WORDS = [
  {
    id: 'w-ecole', fr: "l'école", es: 'la escuela', exampleFr: 'L’école est fermée.', exampleEs: 'La escuela está cerrada.',
    category: 'Casa', gender: 'f', needsReview: false, createdAt: '2026-10-01T09:00:00.000Z', updatedAt: '2026-10-02T09:00:00.000Z',
  },
  {
    id: 'w-peu', fr: 'un peu', es: 'un poco', exampleFr: '', exampleEs: '', category: '', gender: null,
    needsReview: true, createdAt: '2026-10-03T09:00:00.000Z', updatedAt: '2026-10-03T09:00:00.000Z',
  },
];
// Texto v1 con formato propio, para comprobar que la copia es idéntica letra por letra
const V1_RAW = JSON.stringify({ schemaVersion: 1, words: V1_WORDS }, null, 2);
const V1_COPY_KEY = `app-frances-v1-${NOW.toISOString()}`;
const v1Keys = (backend) => [...backend.data.keys()].filter((key) => key.startsWith('app-frances-v1-'));
const upgraded = (word) => ({ ...word, lang: 'fr', lemma: lemmaOf(word.fr, word.gender) });

// Almacenamiento que cuenta las escrituras y puede fallar en la escritura número failAt (1, 2, …)
class CountingStorage extends MemoryStorage {
  constructor(initial, failAt = null) {
    super(initial);
    this.writes = 0;
    this.failAt = failAt;
  }
  setItem(key, value) {
    this.writes += 1;
    if (this.writes === this.failAt) throw Object.assign(new Error('lleno'), { name: 'QuotaExceededError' });
    super.setItem(key, value);
  }
}

test('migra v1 a v2 sin cambiar ids ni otros campos', async () => {
  const backend = new MemoryStorage({ [STORAGE_KEY]: V1_RAW });
  const store = makeStore(backend);
  const result = await store.load();
  assert.equal(result.corruptBackupKey, null);
  assert.equal(result.migrationError, null);
  assert.deepEqual(result.words, V1_WORDS.map(upgraded));
  assert.equal(result.words[0].lemma, 'école');
  assert.equal(result.words[1].lemma, 'un peu');
  assert.deepEqual(saved(backend), { schemaVersion: 2, words: V1_WORDS.map(upgraded) });
  assert.deepEqual(store.getWords(), V1_WORDS.map(upgraded));
});

test('migrar conserva también campos que la app no conoce', async () => {
  const words = [{ ...V1_WORDS[0], extra: { a: 1 } }];
  const backend = new MemoryStorage({ [STORAGE_KEY]: JSON.stringify({ schemaVersion: 1, words }) });
  const result = await makeStore(backend).load();
  assert.deepEqual(result.words, words.map(upgraded));
});

test('guarda la copia v1 intacta en app-frances-v1-…', async () => {
  const backend = new MemoryStorage({ [STORAGE_KEY]: V1_RAW });
  await makeStore(backend).load();
  assert.deepEqual(v1Keys(backend), [V1_COPY_KEY]);
  assert.equal(backend.getItem(V1_COPY_KEY), V1_RAW);
});

test('no vuelve a migrar un documento v2', async () => {
  const backend = new MemoryStorage({ [STORAGE_KEY]: V1_RAW });
  await makeStore(backend).load();
  const afterFirst = backend.getItem(STORAGE_KEY);

  const counting = new CountingStorage(Object.fromEntries(backend.data));
  const result = await makeStore(counting, { now: () => LATER }).load();
  assert.equal(counting.writes, 0, 'no escribe nada');
  assert.equal(counting.getItem(STORAGE_KEY), afterFirst);
  assert.deepEqual(v1Keys(counting), [V1_COPY_KEY], 'no hace otra copia v1');
  assert.equal(result.migrationError, null);
  assert.deepEqual(result.words, V1_WORDS.map(upgraded));
});

test('migra 1000 palabras', async () => {
  const many = Array.from({ length: 1000 }, (_, i) => ({
    id: `w${i}`, fr: i % 2 ? `le mot${i}` : `mot${i} é`, es: `palabra ${i}`, exampleFr: '', exampleEs: '', category: `c${i % 10}`,
    gender: i % 2 ? 'm' : null, needsReview: false, createdAt: NOW.toISOString(), updatedAt: NOW.toISOString(),
  }));
  const raw = JSON.stringify({ schemaVersion: 1, words: many });
  const backend = new MemoryStorage({ [STORAGE_KEY]: raw });
  const result = await makeStore(backend).load();
  assert.equal(result.migrationError, null);
  assert.equal(result.words.length, 1000);
  assert.deepEqual(saved(backend).words, many.map(upgraded));
  assert.equal(saved(backend).words[1].lemma, 'mot1');
  assert.equal(saved(backend).words[2].lemma, 'mot2 é');
  assert.equal(backend.getItem(V1_COPY_KEY), raw);
});

test('si guardar falla, lo guardado sigue en v1 y load devuelve las palabras migradas y migrationError', async () => {
  // Falla la copia v1: no se intenta guardar la versión 2
  const first = new CountingStorage({ [STORAGE_KEY]: V1_RAW }, 1);
  const store = makeStore(first);
  const result = await store.load();
  assert.ok(result.migrationError instanceof StorageError);
  assert.equal(result.migrationError.code, 'quota');
  assert.equal(result.corruptBackupKey, null);
  assert.deepEqual(result.words, V1_WORDS.map(upgraded));
  assert.deepEqual(store.getWords(), V1_WORDS.map(upgraded));
  assert.equal(first.writes, 1, 'no intenta más escrituras');
  assert.equal(first.getItem(STORAGE_KEY), V1_RAW);
  assert.deepEqual(v1Keys(first), []);

  // Falla guardar la versión 2: lo guardado sigue siendo la v1 (la copia extra no molesta)
  const second = new CountingStorage({ [STORAGE_KEY]: V1_RAW }, 2);
  const other = await makeStore(second).load();
  assert.ok(other.migrationError instanceof StorageError);
  assert.equal(other.migrationError.code, 'quota');
  assert.deepEqual(other.words, V1_WORDS.map(upgraded));
  assert.equal(second.getItem(STORAGE_KEY), V1_RAW);
  assert.equal(second.getItem(V1_COPY_KEY), V1_RAW);
});

test('un documento sin schemaVersion se trata como v1', async () => {
  const raw = JSON.stringify({ words: V1_WORDS });
  const backend = new MemoryStorage({ [STORAGE_KEY]: raw });
  const result = await makeStore(backend).load();
  assert.equal(result.migrationError, null);
  assert.deepEqual(result.words, V1_WORDS.map(upgraded));
  assert.deepEqual(saved(backend), { schemaVersion: 2, words: V1_WORDS.map(upgraded) });
  assert.equal(backend.getItem(V1_COPY_KEY), raw);
});

test('la lista inicial se siembra en v2', async () => {
  const backend = new MemoryStorage();
  const result = await makeStore(backend).load();
  assert.equal(result.migrationError, null);
  assert.equal(saved(backend).schemaVersion, 2);
  for (const word of saved(backend).words) {
    assert.equal(word.lang, 'fr', word.id);
    assert.equal(word.lemma, lemmaOf(word.fr, word.gender), word.id);
  }
  assert.equal(saved(backend).words[0].lemma, 'chat');
  assert.deepEqual(result.words, saved(backend).words);
  assert.deepEqual(v1Keys(backend), [], 'sembrar no hace copia v1');
});

test('saveWord guarda lang y lemma, y los recalcula al editar', async () => {
  const backend = new MemoryStorage();
  const store = makeStore(backend);
  await store.load();
  const created = await store.saveWord({ fr: 'L’école', es: 'la escuela', gender: 'f' });
  assert.equal(created.word.lang, 'fr');
  assert.equal(created.word.lemma, 'école');
  const edited = await store.saveWord({ ...SEED[1], fr: 'Manger', es: 'comer' }, 'seed-etre');
  assert.equal(edited.word.lemma, 'manger');
  assert.equal(saved(backend).words.find((w) => w.id === 'seed-etre').lemma, 'manger');
});
