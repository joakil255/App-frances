import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BACKUP_FORMAT, BACKUP_VERSION, MAX_BACKUP_BYTES, buildBackup, backupFileName, readBackup, restoreBackup,
} from '../js/lib/backup.js';
import { createWordStore, StorageError, STORAGE_KEY } from '../js/lib/storage.js';
import { createStudyStore, STUDY_KEY } from '../js/lib/study-storage.js';
import { newCard, review, cardIdOf } from '../js/lib/scheduler.js';
import { buildQueue } from '../js/lib/queue.js';
import { lemmaOf } from '../js/lib/words.js';

// localStorage en memoria; failOn hace fallar la próxima escritura de esa clave
class MemoryStorage {
  constructor() {
    this.data = new Map();
    this.failOn = null;
    this.failAfter = null; // tras fallar failOn, también falla la escritura siguiente
  }
  getItem(key) { return this.data.has(key) ? this.data.get(key) : null; }
  setItem(key, value) {
    if (this.failOn === key || this.failAfter === 'now') {
      this.failAfter = this.failAfter === 'armed' ? 'now' : null;
      this.failOn = null;
      throw Object.assign(new Error('lleno'), { name: 'QuotaExceededError' });
    }
    this.data.set(key, String(value));
  }
  removeItem(key) { this.data.delete(key); }
}

const NOW = new Date('2026-11-23T10:00:00.000Z');
const TODAY = '2026-11-23';
const AT = '2026-11-23T10:00:00.000Z';
const FFFD = String.fromCodePoint(0xFFFD);

// Datos reales: palabras con acentos y <b>, 3 tarjetas (una fallada hoy), Estudiar + Quiz y ajustes cambiados
async function sampleStores(backend = new MemoryStorage()) {
  let n = 0;
  const wordStore = createWordStore(backend, { initialWords: [], makeId: () => `w${n += 1}`, now: () => NOW });
  const studyStore = createStudyStore(backend, { now: () => NOW });
  await wordStore.load();
  await studyStore.load();
  for (const [fr, es] of [["l'élève", 'el alumno'], ['le cœur', 'el corazón'], ['<b>gras</b>', 'grasa & <i>aceite</i>'],
    ['bonjour', 'hola']]) {
    await wordStore.saveWord({ fr, es, exampleFr: '', exampleEs: '', category: 'Prueba', gender: null, needsReview: true });
  }
  const answers = { w1: 'good', w2: 'again', w3: 'easy' };
  for (const [wordId, answer] of Object.entries(answers)) {
    const card = review(newCard(wordId, 'fr-es'), answer, TODAY, AT);
    await studyStore.recordReview(card, {
      at: AT, date: TODAY, cardId: card.id, wordId, direction: 'fr-es', answer, algorithm: 'sm2',
    });
  }
  await studyStore.recordQuizAnswer({
    kind: 'quiz', at: AT, date: TODAY, wordId: 'w4', mode: 'write', correct: false, accentOnly: true,
  });
  await studyStore.saveSettings({ algorithm: 'leitner', direction: 'fr-es', newPerDay: 5, requireAccents: true });
  return { wordStore, studyStore, backend };
}
const backupOf = ({ wordStore, studyStore }) => {
  const { cards, history, settings } = studyStore.getState();
  return buildBackup({ words: wordStore.getWords(), study: { cards, history, settings }, now: NOW });
};

test('constantes de la copia', () => {
  assert.equal(BACKUP_FORMAT, 'app-frances-copia');
  assert.equal(BACKUP_VERSION, 2);
  assert.equal(MAX_BACKUP_BYTES, 10 * 1024 * 1024);
});

test('ciclo completo: guardar, borrar y restaurar deja todo idéntico (y la misma cola de hoy)', async () => {
  const original = await sampleStores();
  const text = backupOf(original);

  const backend = new MemoryStorage(); // = datos del navegador borrados
  const read = readBackup(text);
  assert.equal(read.fatal, null);
  restoreBackup(backend, read.backup);

  const wordStore = createWordStore(backend, { initialWords: [], now: () => NOW });
  const studyStore = createStudyStore(backend, { now: () => NOW });
  const words = await wordStore.load();
  const study = await studyStore.load();
  assert.equal(words.corruptBackupKey, null);
  assert.equal(study.corruptBackupKey, null);
  assert.deepEqual(wordStore.getWords(), original.wordStore.getWords());
  assert.deepEqual(studyStore.getState(), original.studyStore.getState());
  const queue = (w, s) => buildQueue({ words: w.getWords(), cards: s.getState().cards, settings: s.getState().settings, today: TODAY });
  assert.deepEqual(queue(wordStore, studyStore), queue(original.wordStore, original.studyStore));
});

test('el archivo tiene formato, versión, fecha y sangría de 2 espacios', async () => {
  const text = backupOf(await sampleStores());
  const data = JSON.parse(text);
  assert.equal(data.format, 'app-frances-copia');
  assert.equal(data.version, 2);
  assert.equal(data.createdAt, AT);
  assert.ok(text.endsWith('\n') && text.includes('\n  "format"'));
  assert.deepEqual(Object.keys(data.study).sort(), ['cards', 'history', 'settings']);
});

test('summary cuenta palabras, tarjetas y respuestas', async () => {
  const read = readBackup(backupOf(await sampleStores()));
  assert.deepEqual(read.summary, { words: 4, cards: 3, answers: 4, createdAt: AT });
});

const DAMAGED = 'La copia está incompleta o dañada.';
const mutate = async (change) => {
  const data = JSON.parse(backupOf(await sampleStores()));
  change(data);
  return readBackup(JSON.stringify(data));
};

test('archivos que no son una copia válida se rechazan con su motivo', async () => {
  assert.equal(readBackup(`{"format":"app-frances-copia"${FFFD}}`).fatal, 'El archivo no está en UTF-8.');
  assert.equal(readBackup('esto no es JSON').fatal, 'El archivo no se puede leer.');
  assert.equal(readBackup(JSON.stringify({ format: 'app-frances-vocabulario', version: 1, words: [] })).fatal,
    'Este archivo es una lista de palabras: impórtalo en Vocabulario con «Importar».');
  assert.equal(readBackup(JSON.stringify({ format: 'otra-app' })).fatal, 'Este archivo no es una copia de seguridad de la app.');
  assert.equal(readBackup('null').fatal, 'Este archivo no es una copia de seguridad de la app.');
  assert.equal((await mutate((d) => { d.version = 3; })).fatal,
    'La copia es de una versión más nueva de la app. Actualiza la app y vuelve a intentarlo.');
  const bad = readBackup('esto no es JSON');
  assert.equal(bad.backup, null);
  assert.equal(bad.summary, null);
});

test('una copia con datos rotos por dentro se rechaza', async () => {
  const cases = {
    'tarjeta vacía': (d) => { d.study.cards['w1:fr-es'] = {}; },
    'caja de Leitner 7': (d) => { d.study.cards['w1:fr-es'].leitner.box = 7; },
    'cards como array': (d) => { d.study.cards = []; },
    'palabra sin id': (d) => { delete d.words[0].id; },
    'dos palabras con el mismo id': (d) => { d.words[1].id = d.words[0].id; },
    'dos palabras con el mismo francés': (d) => { d.words[1].fr = d.words[0].fr; },
    'id de tarjeta distinto de su clave': (d) => { d.study.cards['w1:fr-es'].id = 'otra'; },
    'ajustes inválidos': (d) => { d.study.settings.newPerDay = 500; },
    'sin historial': (d) => { delete d.study.history; },
    'palabra sin español': (d) => { d.words[0].es = ''; },
    'repasos negativos': (d) => { d.study.cards['w1:fr-es'].sm2.reps = -1; },
    'repasos con decimales': (d) => { d.study.cards['w1:fr-es'].sm2.reps = 0.5; },
    'intervalo negativo': (d) => { d.study.cards['w1:fr-es'].sm2.interval = -3; },
    'facilidad fuera de 1,3–3,0': (d) => { d.study.cards['w1:fr-es'].sm2.ease = 9; },
    'id de tarjeta que no corresponde a su palabra': (d) => {
      const card = d.study.cards['w1:fr-es'];
      delete d.study.cards['w1:fr-es'];
      d.study.cards['otra:fr-es'] = { ...card, id: 'otra:fr-es' };
    },
  };
  for (const [name, change] of Object.entries(cases)) {
    assert.equal((await mutate(change)).fatal, DAMAGED, name);
  }
});

test('una copia hecha por la app se restaura aunque el historial tenga respuestas que la app ignora', async () => {
  const original = await sampleStores();
  // Progreso ignora estas respuestas; la app las guarda y las carga sin problema
  const odd = [
    { at: AT, date: '', cardId: 'w1:fr-es', wordId: 'w1', direction: 'fr-es', answer: 'good', algorithm: 'sm2' },
    { at: AT, date: TODAY, cardId: 'w1:fr-es', wordId: 'w1', direction: 'fr-es', answer: 'maybe', algorithm: 'sm2' },
    { kind: 'quiz', at: AT, date: TODAY, wordId: 'w4', mode: 'write', correct: 'sí', accentOnly: false },
    {},
  ];
  for (const entry of odd) await original.studyStore.recordQuizAnswer(entry);
  const read = readBackup(backupOf(original));
  assert.equal(read.fatal, null);
  const backend = new MemoryStorage();
  restoreBackup(backend, read.backup);
  const studyStore = createStudyStore(backend, { now: () => NOW });
  await studyStore.load();
  assert.deepEqual(studyStore.getState(), original.studyStore.getState());
});

test('una palabra con el carácter de reemplazo «\uFFFD» no impide guardar ni restaurar la copia', async () => {
  const original = await sampleStores();
  await original.wordStore.saveWord({ fr: `le caf${FFFD}`, es: 'el café', exampleFr: '', exampleEs: '', category: '', gender: 'm', needsReview: false });
  const read = readBackup(backupOf(original));
  assert.equal(read.fatal, null);
  const backend = new MemoryStorage();
  restoreBackup(backend, read.backup);
  const wordStore = createWordStore(backend, { initialWords: [], now: () => NOW });
  await wordStore.load();
  assert.deepEqual(wordStore.getWords(), original.wordStore.getWords());
});

test('si también falla la vuelta atrás, se informa del error original (falta de espacio)', async () => {
  const { backend } = await sampleStores();
  const { backup } = readBackup(backupOf(await sampleStores()));
  backend.failOn = STUDY_KEY;
  backend.failAfter = 'armed';
  assert.throws(() => restoreBackup(backend, backup), (error) => error instanceof StorageError && error.code === 'quota');
});

test('una copia vacía (sin palabras ni historial) es válida', () => {
  const text = buildBackup({ words: [], study: { cards: {}, history: [], settings: { algorithm: 'sm2', direction: 'fr-es', newPerDay: 10, requireAccents: false } }, now: NOW });
  const read = readBackup(text);
  assert.equal(read.fatal, null);
  assert.deepEqual(read.summary, { words: 0, cards: 0, answers: 0, createdAt: AT });
});

test('si falla la escritura del progreso, las palabras vuelven a como estaban', async () => {
  const { backend } = await sampleStores();
  const before = backend.getItem(STORAGE_KEY);
  const otherBackup = readBackup(buildBackup({ words: [], study: { cards: {}, history: [], settings: { algorithm: 'sm2', direction: 'fr-es', newPerDay: 10, requireAccents: false } }, now: NOW })).backup;
  backend.failOn = STUDY_KEY;
  assert.throws(() => restoreBackup(backend, otherBackup), (error) => error instanceof StorageError && error.code === 'quota');
  assert.equal(backend.getItem(STORAGE_KEY), before);
});

test('si antes no había palabras guardadas y falla, la clave de palabras queda sin escribir', async () => {
  const backend = new MemoryStorage();
  const { backup } = readBackup(backupOf(await sampleStores()));
  backend.failOn = STUDY_KEY;
  assert.throws(() => restoreBackup(backend, backup), StorageError);
  assert.equal(backend.getItem(STORAGE_KEY), null);
});

test('nombre del archivo con la fecha local', () => {
  assert.equal(backupFileName(new Date(2026, 10, 23, 23, 59)), 'copia-frances-2026-11-23.json');
});

test('una copia grande se arma y se lee en menos de 1 s', () => {
  const words = Array.from({ length: 5000 }, (_, i) => ({
    id: `w${i}`, fr: `mot ${i}`, es: `palabra ${i}`, exampleFr: '', exampleEs: '', category: '', gender: null,
    needsReview: false, createdAt: AT, updatedAt: AT,
  }));
  const history = Array.from({ length: 20000 }, (_, i) => ({
    at: AT, date: TODAY, cardId: `w${i % 5000}:fr-es`, wordId: `w${i % 5000}`, direction: 'fr-es', answer: 'good', algorithm: 'sm2',
  }));
  const start = performance.now();
  const text = buildBackup({ words, study: { cards: {}, history, settings: { algorithm: 'sm2', direction: 'fr-es', newPerDay: 10, requireAccents: false } }, now: NOW });
  const read = readBackup(text);
  const elapsed = performance.now() - start;
  assert.equal(read.fatal, null);
  assert.equal(read.summary.answers, 20000);
  assert.ok(elapsed < 1000, `tardó ${elapsed} ms`);
});

// --- Etapa 10: copia v2 con lang y lemma, y lectura de copias v1 ---

// Copia v1 como la escribía la app antes de la Etapa 10: sin lang ni lemma
async function v1Backup() {
  const data = JSON.parse(backupOf(await sampleStores()));
  data.version = 1;
  for (const word of data.words) { delete word.lang; delete word.lemma; }
  return data;
}

test('buildBackup escribe version 2 y palabras con lang y lemma', async () => {
  const data = JSON.parse(backupOf(await sampleStores()));
  assert.equal(data.version, 2);
  for (const word of data.words) {
    assert.equal(word.lang, 'fr');
    assert.equal(word.lemma, lemmaOf(word.fr, word.gender));
  }
});

test('readBackup lee una copia v1 y calcula lang y lemma', async () => {
  const data = await v1Backup();
  data.words[0].gender = 'm';
  data.words[0].fr = "l'élève";
  const read = readBackup(JSON.stringify(data));
  assert.equal(read.fatal, null);
  assert.equal(read.backup.words[0].lemma, 'élève');
  for (const word of read.backup.words) {
    assert.equal(word.lang, 'fr');
    assert.equal(word.lemma, lemmaOf(word.fr, word.gender));
  }
});

test('una copia v1 restaurada conserva las tarjetas enlazadas y se guarda como schema 2', async () => {
  const data = await v1Backup();
  const read = readBackup(JSON.stringify(data));
  const backend = new MemoryStorage();
  restoreBackup(backend, read.backup);
  assert.equal(JSON.parse(backend.getItem(STORAGE_KEY)).schemaVersion, 2);
  const wordStore = createWordStore(backend, { initialWords: [], now: () => NOW });
  const studyStore = createStudyStore(backend, { now: () => NOW });
  await wordStore.load();
  await studyStore.load();
  // La migración no se repite: no hay copia v1 extra
  assert.deepEqual([...backend.data.keys()].filter((k) => k.startsWith(`${STORAGE_KEY}-v1`)), []);
  const ids = new Set(wordStore.getWords().map((w) => w.id));
  const { cards } = studyStore.getState();
  assert.equal(Object.keys(cards).length, 3);
  for (const [id, card] of Object.entries(cards)) {
    assert.ok(ids.has(card.wordId), id);
    assert.equal(id, cardIdOf(card.wordId, card.direction));
  }
});

test('el lemma guardado en la copia no se cree: se recalcula', async () => {
  const data = JSON.parse(backupOf(await sampleStores()));
  data.words[0].lemma = 'mentira';
  const read = readBackup(JSON.stringify(data));
  assert.equal(read.backup.words[0].lemma, lemmaOf(data.words[0].fr, data.words[0].gender));
});

test('una copia v2 con lang distinto de fr está dañada', async () => {
  assert.equal((await mutate((d) => { d.words[0].lang = 'en'; })).fatal, DAMAGED);
});
