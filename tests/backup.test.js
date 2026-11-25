import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BACKUP_FORMAT, BACKUP_VERSION, MAX_BACKUP_BYTES, buildBackup, backupFileName, readBackup, restoreBackup, restoreWarning,
} from '../js/lib/backup.js';
import { createWordStore, StorageError, STORAGE_KEY } from '../js/lib/storage.js';
import { createStudyStore, STUDY_KEY } from '../js/lib/study-storage.js';
import { newCard, review, cardIdOf } from '../js/lib/scheduler.js';
import { buildQueue } from '../js/lib/queue.js';
import { lemmaOf } from '../js/lib/words.js';
import { TEXTS_KEY, GENERATED_SOURCE } from '../js/lib/texts.js';
import { BUILD_KEY } from '../js/lib/build-storage.js';

// localStorage en memoria; failOn hace fallar la próxima escritura de esa clave
class MemoryStorage {
  constructor(initial = {}) {
    this.data = new Map(Object.entries(initial));
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
  assert.equal(BACKUP_VERSION, 4);
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
  assert.equal(data.version, 4);
  assert.equal(data.createdAt, AT);
  assert.ok(text.endsWith('\n') && text.includes('\n  "format"'));
  assert.deepEqual(Object.keys(data.study).sort(), ['cards', 'history', 'settings']);
});

test('summary cuenta palabras, tarjetas y respuestas', async () => {
  const read = readBackup(backupOf(await sampleStores()));
  assert.deepEqual(read.summary, { words: 4, cards: 3, answers: 4, createdAt: AT, texts: 0 });
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
    'Este archivo es una lista de palabras: impórtalo en Palabras con «Importar».');
  assert.equal(readBackup(JSON.stringify({ format: 'otra-app' })).fatal, 'Este archivo no es una copia de seguridad de la app.');
  assert.equal(readBackup('null').fatal, 'Este archivo no es una copia de seguridad de la app.');
  assert.equal((await mutate((d) => { d.version = 5; })).fatal,
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
  assert.deepEqual(read.summary, { words: 0, cards: 0, answers: 0, createdAt: AT, texts: 0 });
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

test('buildBackup escribe version 4 y palabras con lang y lemma', async () => {
  const data = JSON.parse(backupOf(await sampleStores()));
  assert.equal(data.version, 4);
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

// --- Etapa 11: copia v3 con historias ---

const settings = { algorithm: 'sm2', direction: 'fr-es', newPerDay: 10, requireAccents: false };
const emptyStudy = { cards: {}, history: [], settings };
const BODY = "Marie habite à Paris. Elle aime le café. Chaque matin, elle va à l’école. Le soir, elle lit un livre.";
const makeStory = (over = {}) => ({
  id: 't1',
  lang: 'fr',
  title: 'Marie à Paris',
  body: BODY,
  level: 'A1.2',
  topic: 'la ville',
  source: { ...GENERATED_SOURCE },
  quiz: {
    lang: 'es',
    questions: [1, 2, 3, 4].map((i) => ({
      question: `Pregunta ${i} ?`, options: ['A', 'B', 'C'], answer: 1, explanation: 'Porque sí.', evidence: 'Elle aime le café.',
    })),
  },
  status: 'approved',
  readAt: null,
  quizResult: { correct: 3, total: 4, at: AT },
  createdAt: AT,
  updatedAt: AT,
  ...over,
});
const v4Data = async (texts = [makeStory(), makeStory({ id: 't2', title: "L'été à la mer" })]) => JSON.parse(buildBackup({
  words: (await sampleStores()).wordStore.getWords(), study: emptyStudy, texts, now: NOW,
}));

test('buildBackup v4 incluye las historias', async () => {
  const data = await v4Data();
  assert.equal(data.version, 4);
  assert.equal(data.texts.length, 2);
  assert.equal(data.texts[1].title, "L'été à la mer");
});

test('readBackup lee v1 y v2 con texts y build null (no traían historias ni frases)', async () => {
  for (const version of [1, 2]) {
    const data = await v4Data();
    data.version = version;
    delete data.texts;
    delete data.build;
    if (version === 1) for (const w of data.words) { delete w.lang; delete w.lemma; }
    const read = readBackup(JSON.stringify(data));
    assert.equal(read.fatal, null, `v${version}`);
    assert.equal(read.backup.texts, null);
    assert.equal(read.backup.build, null);
    assert.equal(read.summary.texts, undefined);
  }
});

test('readBackup lee v4 con historias y las cuenta', async () => {
  const read = readBackup(JSON.stringify(await v4Data()));
  assert.equal(read.fatal, null);
  assert.equal(read.backup.texts.length, 2);
  assert.equal(read.summary.texts, 2);
  assert.equal(readBackup(JSON.stringify(await v4Data([]))).backup.texts.length, 0);
});

test('v4 con historias inválidas o sin historias está dañada; v5 es más nueva', async () => {
  const cases = {
    'sin texts': (d) => { delete d.texts; },
    'texts no es lista': (d) => { d.texts = {}; },
    'historia sin evidencia en el texto': (d) => { d.texts[0].quiz.questions[0].evidence = 'no está'; },
    'historia con nivel raro': (d) => { d.texts[0].level = 'C2'; },
    'historia sin id': (d) => { delete d.texts[0].id; },
    'dos historias con el mismo id': (d) => { d.texts[1].id = d.texts[0].id; },
    'elemento que no es objeto': (d) => { d.texts[0] = 5; },
  };
  for (const [name, change] of Object.entries(cases)) {
    const data = await v4Data();
    change(data);
    assert.equal(readBackup(JSON.stringify(data)).fatal, DAMAGED, name);
  }
  const data = await v4Data();
  data.version = 5;
  assert.match(readBackup(JSON.stringify(data)).fatal, /más nueva/);
});

test('restaurar una v4 reemplaza palabras, progreso e historias, con ida y vuelta idéntica', async () => {
  const texts = [makeStory(), makeStory({ id: 't2', title: "L'été à la mer" })];
  const original = await sampleStores();
  const { cards, history, settings: s } = original.studyStore.getState();
  const text = buildBackup({ words: original.wordStore.getWords(), study: { cards, history, settings: s }, texts, now: NOW });
  const backend = new MemoryStorage({});
  backend.setItem(TEXTS_KEY, JSON.stringify({ schemaVersion: 1, texts: [makeStory({ id: 'viejo' })] }));
  restoreBackup(backend, readBackup(text).backup);
  assert.deepEqual(JSON.parse(backend.getItem(TEXTS_KEY)), { schemaVersion: 1, texts });
  const again = readBackup(buildBackup({ words: original.wordStore.getWords(), study: { cards, history, settings: s }, texts: JSON.parse(backend.getItem(TEXTS_KEY)).texts, now: NOW }));
  assert.deepEqual(again.backup.texts, texts);
});

test('restaurar una copia sin historias no toca las historias guardadas', async () => {
  const data = await v4Data();
  data.version = 2;
  delete data.texts;
  delete data.build;
  const backend = new MemoryStorage({});
  const mine = JSON.stringify({ schemaVersion: 1, texts: [makeStory({ id: 'mia' })] });
  backend.setItem(TEXTS_KEY, mine);
  restoreBackup(backend, readBackup(JSON.stringify(data)).backup);
  assert.equal(backend.getItem(TEXTS_KEY), mine);
  const empty = new MemoryStorage({});
  restoreBackup(empty, readBackup(JSON.stringify(data)).backup);
  assert.equal(empty.getItem(TEXTS_KEY), null);
});

test('si falla escribir las historias, se deshacen palabras y progreso (con datos previos o sin ellos)', async () => {
  const { backup } = readBackup(JSON.stringify(await v4Data()));
  const previous = await sampleStores();
  const before = { words: previous.backend.getItem(STORAGE_KEY), study: previous.backend.getItem(STUDY_KEY) };
  previous.backend.setItem(TEXTS_KEY, '{"schemaVersion":1,"texts":[]}');
  previous.backend.failOn = TEXTS_KEY;
  assert.throws(() => restoreBackup(previous.backend, backup), StorageError);
  assert.equal(previous.backend.getItem(STORAGE_KEY), before.words);
  assert.equal(previous.backend.getItem(STUDY_KEY), before.study);
  assert.equal(previous.backend.getItem(TEXTS_KEY), '{"schemaVersion":1,"texts":[]}');

  const fresh = new MemoryStorage({});
  fresh.failOn = TEXTS_KEY;
  assert.throws(() => restoreBackup(fresh, backup), StorageError);
  assert.deepEqual([...fresh.data.keys()], []);
});

test('si falla escribir el progreso en una v4, las historias no se tocan y las palabras se deshacen', async () => {
  const { backup } = readBackup(JSON.stringify(await v4Data()));
  const backend = new MemoryStorage({});
  backend.failOn = STUDY_KEY;
  assert.throws(() => restoreBackup(backend, backup), StorageError);
  assert.deepEqual([...backend.data.keys()], []);
});

test('el texto de la ventana de restaurar dice qué se reemplaza', () => {
  const tail = ' No se puede deshacer. Si quieres conservarlos, guarda antes una copia.';
  assert.equal(restoreWarning({ texts: [], build: { progress: {}, cards: {} } }),
    `Se reemplazarán tus palabras, tu progreso, tus historias y tus frases.${tail}`);
  assert.equal(restoreWarning({ texts: [], build: null }),
    `Se reemplazarán tus palabras, tu progreso y tus historias (esta copia no trae tus frases: las tuyas se mantienen).${tail}`);
  assert.equal(restoreWarning({ texts: null, build: null }),
    `Se reemplazarán tus palabras y tu progreso (esta copia no trae historias ni frases: las tuyas se mantienen).${tail}`);
});

test('una copia grande con historias se arma y se lee bien', async () => {
  const texts = Array.from({ length: 200 }, (_, i) => makeStory({ id: `t${i}` }));
  const read = readBackup(buildBackup({ words: [], study: emptyStudy, texts, now: NOW }));
  assert.equal(read.fatal, null);
  assert.equal(read.summary.texts, 200);
});

// --- Frases (Construir frases) ---
const BUILD_SM2 = { reps: 0, interval: 0, ease: 2.5, lapses: 0, due: '2026-05-02' };
const sampleBuild = () => ({
  progress: { 'fr-a1-01': { startedAt: '2026-05-01', completedAt: null, exercises: { e1: { fails: 2, lastCorrectAt: null } } } },
  cards: {
    'ex:fr-a1-01:e1': {
      id: 'ex:fr-a1-01:e1', kind: 'exercise', lessonId: 'fr-a1-01', exerciseId: 'e1', createdAt: AT, introducedOn: '2026-05-01',
      lastReviewedAt: null, sm2: BUILD_SM2, leitner: { box: 0, due: '2026-05-02' },
    },
  },
});
const v4WithBuild = async (build = sampleBuild()) => JSON.parse(buildBackup({
  words: [], study: emptyStudy, texts: [], build, now: NOW,
}));

test('v4 guarda las frases y la ida y vuelta es idéntica', async () => {
  const build = sampleBuild();
  const data = await v4WithBuild(build);
  assert.equal(data.version, 4);
  assert.deepEqual(data.build, build);
  const read = readBackup(JSON.stringify(data));
  assert.equal(read.fatal, null);
  assert.deepEqual(read.backup.build, build);
  const backend = new MemoryStorage({});
  restoreBackup(backend, read.backup);
  assert.deepEqual(JSON.parse(backend.getItem(BUILD_KEY)), { schemaVersion: 1, ...build });
  const again = readBackup(buildBackup({ words: [], study: emptyStudy, texts: [], build: JSON.parse(backend.getItem(BUILD_KEY)), now: NOW }));
  assert.deepEqual(again.backup.build, build);
});

test('una v3 se lee con build null y restaurarla deja intacto app-frances-build', async () => {
  const data = await v4WithBuild();
  data.version = 3;
  delete data.build;
  const read = readBackup(JSON.stringify(data));
  assert.equal(read.fatal, null);
  assert.equal(read.backup.build, null);
  const backend = new MemoryStorage({});
  const mine = JSON.stringify({ schemaVersion: 1, ...sampleBuild() });
  backend.setItem(BUILD_KEY, mine);
  restoreBackup(backend, read.backup);
  assert.equal(backend.getItem(BUILD_KEY), mine);
  const empty = new MemoryStorage({});
  restoreBackup(empty, read.backup);
  assert.equal(empty.getItem(BUILD_KEY), null);
});

test('una v4 con frases inválidas o sin ellas está dañada', async () => {
  const cases = {
    'sin build': (d) => { delete d.build; },
    'build no es objeto': (d) => { d.build = []; },
    'tarjeta con kind raro': (d) => { d.build.cards['ex:fr-a1-01:e1'].kind = 'x'; },
    'progreso mal formado': (d) => { d.build.progress['fr-a1-01'] = 5; },
    'frase propia con un error null': (d) => {
      const { sm2, leitner, createdAt } = d.build.cards['ex:fr-a1-01:e1'];
      d.build.cards['own:1'] = { id: 'own:1', kind: 'own', situation: 's', original: 'a', corrected: 'b', errors: [null], createdAt, introducedOn: null, lastReviewedAt: null, sm2, leitner };
    },
  };
  for (const [name, change] of Object.entries(cases)) {
    const data = await v4WithBuild();
    change(data);
    assert.equal(readBackup(JSON.stringify(data)).fatal, DAMAGED, name);
  }
});

test('si falla escribir las frases, se deshacen las cuatro claves', async () => {
  const { backup } = readBackup(JSON.stringify(await v4WithBuild()));
  const previous = await sampleStores();
  const old = { words: previous.backend.getItem(STORAGE_KEY), study: previous.backend.getItem(STUDY_KEY) };
  previous.backend.setItem(TEXTS_KEY, '{"schemaVersion":1,"texts":[]}');
  previous.backend.setItem(BUILD_KEY, '{"schemaVersion":1,"progress":{},"cards":{}}');
  previous.backend.failOn = BUILD_KEY;
  assert.throws(() => restoreBackup(previous.backend, backup), StorageError);
  assert.equal(previous.backend.getItem(STORAGE_KEY), old.words);
  assert.equal(previous.backend.getItem(STUDY_KEY), old.study);
  assert.equal(previous.backend.getItem(TEXTS_KEY), '{"schemaVersion":1,"texts":[]}');
  assert.equal(previous.backend.getItem(BUILD_KEY), '{"schemaVersion":1,"progress":{},"cards":{}}');
  const fresh = new MemoryStorage({});
  fresh.failOn = BUILD_KEY;
  assert.throws(() => restoreBackup(fresh, backup), StorageError);
  assert.deepEqual([...fresh.data.keys()], []);
});
