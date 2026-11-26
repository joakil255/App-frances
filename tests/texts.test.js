import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createTextStore, validateText, TEXTS_KEY, TEXT_LEVELS, QUIZ_LANGS, GENERATED_SOURCE,
  SUPPORT_LANGS, MAX_SENTENCES, MAX_SENTENCE_LETTERS, sentencesMatchBody, needsReview,
} from '../js/lib/texts.js';
import { StorageError } from '../js/lib/storage.js';

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

const BODY = "Marie habite à Paris. Elle aime le café. Chaque matin, elle va à l’école. Le soir, elle lit un livre.";
const question = (i) => ({
  question: `Question ${i} ?`,
  options: ['A', 'B', 'C'],
  answer: 1,
  explanation: 'Porque sí.',
  evidence: 'Elle aime le café.',
});
const makeInput = (over = {}) => ({
  lang: 'fr',
  title: 'Marie à Paris',
  body: BODY,
  level: 'A1.2',
  topic: 'la ville',
  source: { ...GENERATED_SOURCE },
  quiz: { lang: 'es', questions: [question(1), question(2), question(3), question(4)] },
  ...over,
});
const makeText = (over = {}) => ({
  id: 't1',
  ...makeInput(),
  status: 'review',
  readAt: null,
  quizResult: null,
  createdAt: '2026-11-24T10:00:00.000Z',
  updatedAt: '2026-11-24T10:00:00.000Z',
  ...over,
});

const NOW = new Date('2026-11-24T10:00:00.000Z');
function makeStore(backend = new MemoryStorage(), { now = () => NOW } = {}) {
  let n = 0;
  return createTextStore(backend, { makeId: () => `id-${++n}`, now });
}
const saved = (backend) => JSON.parse(backend.getItem(TEXTS_KEY));

test('las constantes tienen los valores del diseño', () => {
  assert.equal(TEXTS_KEY, 'app-frances-texts');
  assert.deepEqual(TEXT_LEVELS, ['A1.1', 'A1.2', 'A2']);
  assert.deepEqual(QUIZ_LANGS, ['es', 'fr']);
  assert.deepEqual(GENERATED_SOURCE, {
    kind: 'generated',
    name: 'Claude (Anthropic)',
    license: 'Historia original generada para uso personal',
  });
});

test('validateText acepta un texto correcto', () => {
  assert.deepEqual(validateText(makeText()), { ok: true, errors: {} });
});

test('validateText acepta 4 opciones y quizResult válido', () => {
  const t = makeText({ status: 'approved', quizResult: { correct: 3, total: 4, at: NOW.toISOString() } });
  t.quiz.questions[0].options = ['A', 'B', 'C', 'D'];
  assert.equal(validateText(t).ok, true);
});

const INVALID = [
  ['lang', { lang: 'en' }],
  ['level', { level: 'B2' }],
  ['title', { title: '' }],
  ['title', { title: '   ' }],
  ['title', { title: 'x'.repeat(81) }],
  ['body', { body: '' }],
  ['body', { body: 'x'.repeat(3001) }],
  ['status', { status: 'draft' }],
  ['source', { source: { ...GENERATED_SOURCE, license: '  ' } }],
  ['source', { source: null }],
  ['quizResult', { quizResult: { correct: 5, total: 4, at: 'x' } }],
  ['quizResult', { quizResult: { correct: -1, total: 4, at: 'x' } }],
  ['quizResult', { quizResult: { correct: 1.5, total: 4, at: 'x' } }],
  ['quizResult', { quizResult: { correct: 1, total: 0, at: 'x' } }],
];
for (const [field, over] of INVALID) {
  test(`validateText rechaza ${field} inválido: ${JSON.stringify(over).slice(0, 40)}`, () => {
    const { ok, errors } = validateText(makeText(over));
    assert.equal(ok, false);
    assert.ok(errors[field], `falta error en ${field}`);
  });
}

test('validateText acepta título de 80 letras y cuerpo de 3000 con la evidencia dentro', () => {
  const body = `Elle aime le café. ${'a'.repeat(3000 - 19)}`;
  assert.equal(body.length, 3000);
  assert.equal(validateText(makeText({ title: 'é'.repeat(80), body })).ok, true);
});

test('validateText rechaza un quiz mal formado', () => {
  const cases = {
    'no es objeto': null,
    'idioma': { lang: 'de', questions: makeInput().quiz.questions },
    'solo 3 preguntas': { lang: 'es', questions: makeInput().quiz.questions.slice(0, 3) },
    '5 preguntas': { lang: 'es', questions: [...makeInput().quiz.questions, question(5)] },
  };
  for (const [name, quiz] of Object.entries(cases)) {
    const { ok, errors } = validateText(makeText({ quiz }));
    assert.equal(ok, false, name);
    assert.ok(errors.quiz, name);
  }
});

test('validateText rechaza preguntas inválidas', () => {
  const bad = [
    { question: '' },
    { question: '   ' },
    { options: ['A', 'B'] },
    { options: ['A', 'B', 'C', 'D', 'E'] },
    { options: ['A', 'a', 'C'] },
    { options: ['A', '', 'C'] },
    { answer: 3 },
    { answer: -1 },
    { answer: 1.5 },
    { answer: '1' },
    { explanation: '' },
    { evidence: '' },
    { evidence: 'Elle déteste le thé.' },
  ];
  for (const over of bad) {
    const t = makeText();
    t.quiz.questions[2] = { ...question(3), ...over };
    const { ok, errors } = validateText(t);
    assert.equal(ok, false, JSON.stringify(over));
    assert.ok(errors.quiz, JSON.stringify(over));
  }
});

test('validateText compara la evidencia sin mayúsculas y con apóstrofos tipográficos', () => {
  const t = makeText();
  t.quiz.questions[0].evidence = "CHAQUE MATIN, ELLE VA À L'ÉCOLE.";
  assert.equal(validateText(t).ok, true);
  t.quiz.questions[1].evidence = 'chaque matin, elle va à l’école.';
  t.body = BODY.replace('’', "'");
  assert.equal(validateText(t).ok, true);
});

test('validateText no falla con entradas vacías o de tipo raro', () => {
  assert.equal(validateText(null).ok, false);
  assert.equal(validateText(undefined).ok, false);
  assert.equal(validateText({}).ok, false);
  assert.equal(validateText('texto').ok, false);
});

test('la primera carga no guarda nada y devuelve lista vacía', async () => {
  const backend = new MemoryStorage();
  const { texts, corruptBackupKey } = await makeStore(backend).load();
  assert.deepEqual(texts, []);
  assert.equal(corruptBackupKey, null);
});

test('addText crea el texto en revisión y lo guarda', async () => {
  const backend = new MemoryStorage();
  const store = makeStore(backend);
  await store.load();
  const result = await store.addText(makeInput());
  assert.equal(result.ok, true);
  assert.equal(result.text.id, 'id-1');
  assert.equal(result.text.status, 'review');
  assert.equal(result.text.readAt, null);
  assert.equal(result.text.quizResult, null);
  assert.equal(result.text.createdAt, NOW.toISOString());
  assert.equal(result.text.updatedAt, NOW.toISOString());
  assert.equal(saved(backend).schemaVersion, 1);
  assert.equal(saved(backend).texts.length, 1);
  assert.deepEqual(store.getText('id-1'), result.text);
});

test('addText con datos inválidos devuelve errores y no guarda', async () => {
  const backend = new MemoryStorage();
  const store = makeStore(backend);
  await store.load();
  const result = await store.addText(makeInput({ title: '' }));
  assert.equal(result.ok, false);
  assert.ok(result.errors.title);
  assert.deepEqual(store.getTexts(), []);
  assert.equal(backend.getItem(TEXTS_KEY), null);
});

test('addText ignora status, readAt y quizResult que vengan en la entrada', async () => {
  const store = makeStore();
  await store.load();
  const { text } = await store.addText(makeInput({ status: 'approved', readAt: 'x', quizResult: { correct: 1, total: 1, at: 'x' } }));
  assert.equal(text.status, 'review');
  assert.equal(text.readAt, null);
  assert.equal(text.quizResult, null);
});

test('approve pasa el texto a aprobado', async () => {
  const backend = new MemoryStorage();
  const store = makeStore(backend, { now: () => new Date('2026-11-25T10:00:00.000Z') });
  await store.load();
  await store.addText(makeInput());
  const text = await store.approve('id-1');
  assert.equal(text.status, 'approved');
  assert.equal(text.updatedAt, '2026-11-25T10:00:00.000Z');
  assert.equal(saved(backend).texts[0].status, 'approved');
});

test('markRead guarda la fecha de lectura', async () => {
  const backend = new MemoryStorage();
  const store = makeStore(backend);
  await store.load();
  await store.addText(makeInput());
  const text = await store.markRead('id-1');
  assert.equal(text.readAt, NOW.toISOString());
  assert.equal(saved(backend).texts[0].readAt, NOW.toISOString());
});

test('saveQuizResult guarda el resultado y repetirlo lo reemplaza', async () => {
  const backend = new MemoryStorage();
  let current = NOW;
  const store = makeStore(backend, { now: () => current });
  await store.load();
  await store.addText(makeInput());
  const first = await store.saveQuizResult('id-1', { correct: 2, total: 4 });
  assert.deepEqual(first.quizResult, { correct: 2, total: 4, at: NOW.toISOString() });
  current = new Date('2026-11-26T10:00:00.000Z');
  const second = await store.saveQuizResult('id-1', { correct: 4, total: 4 });
  assert.deepEqual(second.quizResult, { correct: 4, total: 4, at: current.toISOString() });
  assert.deepEqual(store.getText('id-1').quizResult, second.quizResult);
  assert.deepEqual(saved(backend).texts[0].quizResult, second.quizResult);
});

test('saveQuizResult con números inválidos devuelve null y no cambia nada', async () => {
  const store = makeStore();
  await store.load();
  await store.addText(makeInput());
  assert.equal(await store.saveQuizResult('id-1', { correct: 5, total: 4 }), null);
  assert.equal(store.getText('id-1').quizResult, null);
});

test('deleteText quita el texto', async () => {
  const backend = new MemoryStorage();
  const store = makeStore(backend);
  await store.load();
  await store.addText(makeInput());
  await store.deleteText('id-1');
  assert.deepEqual(store.getTexts(), []);
  assert.equal(store.getText('id-1'), null);
  assert.deepEqual(saved(backend).texts, []);
});

test('con un id que no existe, las acciones devuelven null y no guardan', async () => {
  const backend = new MemoryStorage();
  const store = makeStore(backend);
  await store.load();
  assert.equal(await store.approve('nada'), null);
  assert.equal(await store.markRead('nada'), null);
  assert.equal(await store.saveQuizResult('nada', { correct: 1, total: 4 }), null);
  await store.deleteText('nada');
  assert.equal(backend.getItem(TEXTS_KEY), null);
});

test('getTexts devuelve de más nuevo a más viejo, también con la misma fecha', async () => {
  let current = new Date('2026-11-24T10:00:00.000Z');
  const store = makeStore(new MemoryStorage(), { now: () => current });
  await store.load();
  await store.addText(makeInput({ title: 'Uno' }));
  current = new Date('2026-11-25T10:00:00.000Z');
  await store.addText(makeInput({ title: 'Dos' }));
  await store.addText(makeInput({ title: 'Tres' }));
  assert.deepEqual(store.getTexts().map((t) => t.title), ['Tres', 'Dos', 'Uno']);
});

test('getTexts devuelve una copia de la lista', async () => {
  const store = makeStore();
  await store.load();
  await store.addText(makeInput());
  store.getTexts().pop();
  assert.equal(store.getTexts().length, 1);
});

test('load lee lo guardado antes', async () => {
  const backend = new MemoryStorage({ [TEXTS_KEY]: JSON.stringify({ schemaVersion: 1, texts: [makeText()] }) });
  const store = makeStore(backend);
  const { texts, corruptBackupKey } = await store.load();
  assert.equal(corruptBackupKey, null);
  assert.deepEqual(texts.map((t) => t.id), ['t1']);
  assert.equal(store.getText('t1').title, 'Marie à Paris');
});

test('si los datos están dañados, los copia aparte y empieza vacío', async () => {
  for (const raw of ['{ "texts": [ roto', '{"schemaVersion":1}', 'null', '{"texts":"no"}']) {
    const backend = new MemoryStorage({ [TEXTS_KEY]: raw });
    const store = makeStore(backend);
    const { texts, corruptBackupKey } = await store.load();
    assert.deepEqual(texts, [], raw);
    assert.equal(corruptBackupKey, `${TEXTS_KEY}-corrupt-${NOW.toISOString()}`, raw);
    assert.equal(backend.getItem(corruptBackupKey), raw);
    assert.deepEqual(saved(backend).texts, []);
  }
});

test('si setItem lanza al agregar, falla con StorageError y la memoria queda igual', async () => {
  const backend = new MemoryStorage();
  const store = makeStore(backend);
  await store.load();
  backend.failWith = Object.assign(new Error('lleno'), { name: 'QuotaExceededError' });
  await assert.rejects(store.addText(makeInput()), (error) => error instanceof StorageError && error.code === 'quota');
  assert.deepEqual(store.getTexts(), []);
});

test('si setItem lanza al aprobar, marcar, borrar o guardar resultado, la memoria queda igual', async () => {
  const backend = new MemoryStorage();
  const store = makeStore(backend);
  await store.load();
  await store.addText(makeInput());
  const before = store.getText('id-1');
  const actions = [
    () => store.approve('id-1'),
    () => store.markRead('id-1'),
    () => store.saveQuizResult('id-1', { correct: 1, total: 4 }),
    () => store.deleteText('id-1'),
  ];
  for (const action of actions) {
    backend.failWith = new Error('bloqueado');
    await assert.rejects(action(), (error) => error instanceof StorageError && error.code === 'unavailable');
    assert.deepEqual(store.getText('id-1'), before);
  }
});

test('si getItem lanza al cargar, falla con StorageError', async () => {
  const backend = { getItem() { throw new Error('bloqueado'); }, setItem() {} };
  await assert.rejects(createTextStore(backend, {}).load(), (error) => error instanceof StorageError);
});

test('si la copia de datos dañados no se puede guardar, falla con StorageError', async () => {
  const backend = new MemoryStorage({ [TEXTS_KEY]: 'roto' });
  backend.failWith = new Error('bloqueado');
  await assert.rejects(makeStore(backend).load(), (error) => error instanceof StorageError);
});

test('watchExternalChanges vuelve a leer cuando cambia la clave de textos', async () => {
  const backend = new MemoryStorage();
  const store = makeStore(backend);
  await store.load();
  let listener;
  const target = { addEventListener: (name, fn) => { assert.equal(name, 'storage'); listener = fn; } };
  let calls = 0;
  store.watchExternalChanges(target, () => { calls += 1; });

  backend.setItem(TEXTS_KEY, JSON.stringify({ schemaVersion: 1, texts: [makeText()] }));
  await listener({ key: TEXTS_KEY });
  assert.equal(calls, 1);
  assert.equal(store.getTexts().length, 1);

  await listener({ key: 'otra-clave' });
  assert.equal(calls, 1);
  await listener({ key: null });
  assert.equal(calls, 2);
});

test('validateText pliega ʼ (U+02BC) igual que el servidor', () => {
  const t = makeText();
  t.body = BODY.replace('’', '\u02BC');
  t.quiz.questions[0].evidence = "chaque matin, elle va à l'école.";
  assert.equal(validateText(t).ok, true);
  t.body = BODY;
  t.quiz.questions[0].evidence = 'chaque matin, elle va à l\u02BCécole.';
  assert.equal(validateText(t).ok, true);
});

test('validateText no es más estricto que el servidor con las opciones repetidas', () => {
  // El servidor compara trim().toLowerCase(): estas opciones le parecen distintas
  const t = makeText();
  t.quiz.questions[0].options = ['a  b', 'a b', 'C'];
  assert.equal(validateText(t).ok, true);
  t.quiz.questions[0].options = ['\u00e9', 'e\u0301', 'C']; // é compuesta y descompuesta
  assert.equal(validateText(t).ok, true);
  t.quiz.questions[0].options = [' Lyon ', 'lyon', 'C']; // el servidor sí las ve iguales
  assert.equal(validateText(t).ok, false);
});

for (const [name, over] of Object.entries({
  'sin createdAt': { createdAt: undefined },
  'createdAt no es fecha': { createdAt: 'ayer' },
  'sin updatedAt': { updatedAt: undefined },
  'updatedAt no es texto': { updatedAt: 5 },
  'sin nombre de origen': { source: { kind: 'generated', license: 'x' } },
  'nombre de origen vacío': { source: { kind: 'generated', name: ' ', license: 'x' } },
})) {
  test(`validateText rechaza una historia ${name}`, () => {
    const { ok, errors } = validateText(makeText(over));
    assert.equal(ok, false);
    assert.ok(errors.createdAt || errors.updatedAt || errors.source);
  });
}

// --- Frases y traducción (Etapa 15) ---
const FR_SENTENCES = ['Marie habite à Paris.', 'Elle aime le café.', 'Chaque matin, elle va à l’école.', 'Le soir, elle lit un livre.'];
const ES_SENTENCES = ['María vive en París.', 'Le gusta el café.', 'Cada mañana va a la escuela.', 'Por la noche lee un libro.'];
const withTranslation = (over = {}) => makeText({
  sentences: [...FR_SENTENCES],
  translation: { lang: 'es', status: 'review', sentences: [...ES_SENTENCES] },
  ...over,
});

test('las constantes de traducción tienen los valores del diseño', () => {
  assert.deepEqual(SUPPORT_LANGS, ['es']);
  assert.equal(MAX_SENTENCES, 60);
  assert.equal(MAX_SENTENCE_LETTERS, 600);
});

test('sentencesMatchBody ignora todo espacio y respeta acentos', () => {
  assert.equal(sentencesMatchBody(['Fin.', 'Début.'], 'Fin.Début.'), true);
  assert.equal(sentencesMatchBody(['Fin.', 'Début.'], 'Fin.\n\nDébut.  '), true);
  assert.equal(sentencesMatchBody(['Elle va à l’école.'], 'Elle  va à\nl’école.'), true);
  assert.equal(sentencesMatchBody(['Ça va.', 'é'], 'Ça va. é'), true);
  assert.equal(sentencesMatchBody(['Ça va.'], 'Ca va.'), false);
  assert.equal(sentencesMatchBody(['Fin.'], 'Fin. Début.'), false);
  // NFC: «é» descompuesta también cuenta igual
  assert.equal(sentencesMatchBody(['e\u0301cole'], '\u00e9cole'), true);
});

test('validateText acepta un texto sin frases ni traducción', () => {
  assert.equal(validateText(makeText()).ok, true);
});

test('validateText acepta frases y traducción válidas, y frases solas', () => {
  assert.deepEqual(validateText(withTranslation()), { ok: true, errors: {} });
  assert.equal(validateText(makeText({ sentences: [...FR_SENTENCES] })).ok, true);
});

test('validateText rechaza traducción sin frases', () => {
  const t = withTranslation();
  delete t.sentences;
  assert.ok(validateText(t).errors.translation);
});

test('validateText rechaza traducciones mal formadas', () => {
  const bad = (translation) => validateText(withTranslation({ translation })).errors.translation;
  assert.ok(bad({ lang: 'es', status: 'review', sentences: ES_SENTENCES.slice(1) }));
  assert.ok(bad({ lang: 'es', status: 'review', sentences: ['', ...ES_SENTENCES.slice(1)] }));
  assert.ok(bad({ lang: 'en', status: 'review', sentences: ES_SENTENCES }));
  assert.ok(bad({ lang: 'es', status: 'x', sentences: ES_SENTENCES }));
  assert.ok(bad({ lang: 'es', status: 'review', sentences: ['a'.repeat(601), ...ES_SENTENCES.slice(1)] }));
  assert.ok(bad(null));
  assert.equal(bad({ lang: 'es', status: 'review', sentences: ['a'.repeat(600), ...ES_SENTENCES.slice(1)] }), undefined);
});

test('validateText rechaza frases que no reconstruyen el texto', () => {
  assert.ok(validateText(makeText({ sentences: FR_SENTENCES.slice(1) })).errors.sentences);
  assert.ok(validateText(makeText({ sentences: ['', ...FR_SENTENCES] })).errors.sentences);
  assert.ok(validateText(makeText({ sentences: 'texto' })).errors.sentences);
  assert.ok(validateText(makeText({ sentences: [] })).errors.sentences);
});

test('validateText: 60 frases pasan y 61 no', () => {
  const make = (n) => {
    const parts = Array.from({ length: n }, (_, i) => `Phrase ${i}.`);
    return makeText({ body: parts.join(' '), sentences: parts, quiz: makeInput().quiz, source: { ...GENERATED_SOURCE } });
  };
  const ok = make(60);
  ok.quiz.questions.forEach((q) => { q.evidence = 'Phrase 1.'; });
  assert.equal(validateText(ok).errors.sentences, undefined);
  const over = make(61);
  assert.ok(validateText(over).errors.sentences);
});

test('addText copia frases y traducción recortando bordes', async () => {
  const store = makeStore();
  const res = await store.addText(makeInput({
    sentences: FR_SENTENCES.map((s) => ` ${s} `),
    translation: { lang: 'es', status: 'review', sentences: ES_SENTENCES.map((s) => `${s}\n`) },
  }));
  assert.equal(res.ok, true);
  assert.deepEqual(res.text.sentences, FR_SENTENCES);
  assert.deepEqual(res.text.translation, { lang: 'es', status: 'review', sentences: ES_SENTENCES });
});

test('addText rechaza frases que no cuadran con el texto', async () => {
  const backend = new MemoryStorage();
  const res = await makeStore(backend).addText(makeInput({ sentences: ['Otra cosa.'] }));
  assert.equal(res.ok, false);
  assert.ok(res.errors.sentences);
  assert.equal(backend.getItem(TEXTS_KEY), null);
});

test('approve también aprueba la traducción', async () => {
  const store = makeStore();
  const { text } = await store.addText(makeInput({
    sentences: FR_SENTENCES, translation: { lang: 'es', status: 'review', sentences: ES_SENTENCES },
  }));
  const approved = await store.approve(text.id);
  assert.equal(approved.status, 'approved');
  assert.equal(approved.translation.status, 'approved');
  assert.equal(needsReview(approved), false);
});

test('approve sin traducción no inventa una', async () => {
  const store = makeStore();
  const { text } = await store.addText(makeInput());
  const approved = await store.approve(text.id);
  assert.equal('translation' in approved, false);
});

test('needsReview mira el texto y la traducción', () => {
  assert.equal(needsReview(makeText()), true);
  assert.equal(needsReview(makeText({ status: 'approved' })), false);
  assert.equal(needsReview(withTranslation({ status: 'approved' })), true);
  assert.equal(needsReview(withTranslation({ status: 'approved', translation: { lang: 'es', status: 'approved', sentences: ES_SENTENCES } })), false);
});

test('addTranslation en historia aprobada deja la traducción en revisión', async () => {
  const backend = new MemoryStorage();
  const store = makeStore(backend);
  const { text } = await store.addText(makeInput());
  await store.approve(text.id);
  const res = await store.addTranslation(text.id, {
    sentences: FR_SENTENCES, translation: { lang: 'es', status: 'review', sentences: ES_SENTENCES },
  });
  assert.equal(res.status, 'approved');
  assert.equal(res.translation.status, 'review');
  assert.equal(needsReview(res), true);
  assert.deepEqual(saved(backend).texts[0].sentences, FR_SENTENCES);
});

test('addTranslation devuelve null sin guardar si el id no existe o no valida', async () => {
  const backend = new MemoryStorage();
  const store = makeStore(backend);
  const { text } = await store.addText(makeInput());
  const before = backend.getItem(TEXTS_KEY);
  const good = { sentences: FR_SENTENCES, translation: { lang: 'es', status: 'review', sentences: ES_SENTENCES } };
  assert.equal(await store.addTranslation('nope', good), null);
  assert.equal(await store.addTranslation(text.id, { ...good, sentences: FR_SENTENCES.slice(1) }), null);
  assert.equal(await store.addTranslation(text.id, { sentences: FR_SENTENCES, translation: { lang: 'en', status: 'review', sentences: ES_SENTENCES } }), null);
  assert.equal(backend.getItem(TEXTS_KEY), before);
  assert.equal('sentences' in store.getText(text.id), false);
});

test('approveTranslation y discardTranslation cambian y guardan', async () => {
  const backend = new MemoryStorage();
  const store = makeStore(backend);
  const { text } = await store.addText(makeInput({
    sentences: FR_SENTENCES, translation: { lang: 'es', status: 'review', sentences: ES_SENTENCES },
  }));
  const approved = await store.approveTranslation(text.id);
  assert.equal(approved.translation.status, 'approved');
  assert.equal(approved.status, 'review');
  assert.equal(saved(backend).texts[0].translation.status, 'approved');
  const discarded = await store.discardTranslation(text.id);
  assert.equal('sentences' in discarded, false);
  assert.equal('translation' in discarded, false);
  assert.equal('translation' in saved(backend).texts[0], false);
  assert.equal(await store.approveTranslation('nope'), null);
  assert.equal(await store.discardTranslation('nope'), null);
});

test('approveTranslation sin traducción devuelve null', async () => {
  const store = makeStore();
  const { text } = await store.addText(makeInput());
  assert.equal(await store.approveTranslation(text.id), null);
});

test('si el guardado falla, las traducciones no cambian la memoria', async () => {
  const backend = new MemoryStorage();
  const store = makeStore(backend);
  const { text } = await store.addText(makeInput());
  const good = { sentences: FR_SENTENCES, translation: { lang: 'es', status: 'review', sentences: ES_SENTENCES } };
  const before = store.getText(text.id);
  backend.failWith = new Error('lleno');
  await assert.rejects(() => store.addTranslation(text.id, good), StorageError);
  assert.deepEqual(store.getText(text.id), before);
  await store.addTranslation(text.id, good);
  const withT = store.getText(text.id);
  backend.failWith = new Error('lleno');
  await assert.rejects(() => store.approveTranslation(text.id), StorageError);
  assert.deepEqual(store.getText(text.id), withT);
  backend.failWith = new Error('lleno');
  await assert.rejects(() => store.discardTranslation(text.id), StorageError);
  assert.deepEqual(store.getText(text.id), withT);
});

test('addTranslation siempre guarda la traducción en revisión', async () => {
  const store = makeStore();
  const { text } = await store.addText(makeInput());
  const res = await store.addTranslation(text.id, {
    sentences: FR_SENTENCES, translation: { lang: 'es', status: 'approved', sentences: ES_SENTENCES },
  });
  assert.equal(res.translation.status, 'review');
});

test('addTranslation sin frases o sin traducción devuelve null y no guarda', async () => {
  const backend = new MemoryStorage();
  const store = makeStore(backend);
  const { text } = await store.addText(makeInput());
  const before = backend.getItem(TEXTS_KEY);
  const tr = { lang: 'es', status: 'review', sentences: ES_SENTENCES };
  assert.equal(await store.addTranslation(text.id, { translation: tr }), null);
  assert.equal(await store.addTranslation(text.id, { sentences: FR_SENTENCES }), null);
  assert.equal(backend.getItem(TEXTS_KEY), before);
});
