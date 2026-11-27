import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { INDEX_FORMAT, EXERCISE_TYPES, validateLesson, validateLessonIndex } from '../js/lib/lessons.js';
import { checkExercise } from '../js/lib/sentence-check.js';
import { normalizeAnswer } from '../js/lib/answer-check.js';
import { textProblems } from './helpers/content-checks.js';

// --- Lecciones de «Construir frases» (data/lessons/fr) ---

const DIR = new URL('../data/lessons/fr/', import.meta.url);
const DOC = new URL('../docs/contenido/construir-frases.md', import.meta.url);
const ITEM_KEYS = ['idea', 'think', 'examples', 'pitfalls', 'exercises', 'situations'];

const readJson = (url) => JSON.parse(readFileSync(url, 'utf8'));
const index = () => readJson(new URL('index.json', DIR));
const lessonUrl = (id) => new URL(`${id}.json`, DIR);
const lessons = () => index().lessons.filter((e) => e.status === 'available').map(({ id }) => ({ id, lesson: readJson(lessonUrl(id)) }));

// Frase completa de un hueco: el autor incluye los espacios en before y after
const gapSentence = (ex, answer) => ex.before + answer + ex.after;

const EXPECTED_INDEX = [
  ['fr-a1-01', 'La frase básica'], ['fr-a1-02', "Être, avoir, c'est, il y a"], ['fr-a1-03', 'Los artículos'],
  ['fr-a1-04', 'Verbos en -er en presente'], ['fr-a1-05', 'La negación'], ['fr-a1-06', 'Preguntas simples'],
  ['fr-a1-07', 'Los adjetivos'], ['fr-a1-08', 'Aller, faire y el futuro próximo'], ['fr-a1-09', 'Querer, poder y deber'],
  ['fr-a1-10', 'Posesivos y demostrativos'], ['fr-a1-11', 'Verbos pronominales'], ['fr-a1-12', 'El imperativo'],
  ['fr-a1-13', 'Venir de / il faut + infinitivo'], ['fr-a1-14', 'Preposiciones de lugar y de tiempo'],
  ['fr-a1-15', 'Conectores: et, ou, mais, parce que, pour'], ['fr-a2-01', 'Passé composé con avoir'],
  ['fr-a2-02', 'Passé composé con être'], ['fr-a2-03', 'Pronombres de complemento directo (le, la, les)'],
  ['fr-a2-04', 'Los pronombres y / en'], ['fr-a2-05', 'El imperfecto (iniciación)'], ['fr-a2-06', 'El futuro simple'],
  ['fr-a2-07', 'Comparativo y superlativo'], ['fr-a2-08', 'Qui, que, où para unir frases'], ['fr-a2-09', 'Ortografía avanzada'],
];

// Lecciones disponibles, en orden (cada lección nueva agrega su id)
const AVAILABLE_IDS = ['fr-a1-01', 'fr-a1-02', 'fr-a1-03', 'fr-a1-04', 'fr-a1-05', 'fr-a1-06', 'fr-a1-07', 'fr-a1-08', 'fr-a1-09', 'fr-a1-10', 'fr-a2-01', 'fr-a2-02', 'fr-a2-03', 'fr-a2-04'];

test('el índice v2 es válido, tiene las 24 lecciones en orden y solo las disponibles tienen archivo', () => {
  const data = index();
  assert.equal(data.format, INDEX_FORMAT);
  assert.equal(data.lang, 'fr');
  assert.deepEqual(validateLessonIndex(data), { ok: true, errors: [] });
  assert.deepEqual(data.lessons.map((e) => [e.id, e.title]), EXPECTED_INDEX);
  data.lessons.forEach((e) => {
    const available = AVAILABLE_IDS.includes(e.id);
    assert.equal(e.status, available ? 'available' : 'planned', e.id);
    assert.equal(existsSync(lessonUrl(e.id)), available, `archivo de ${e.id}`);
    if (available) assert.equal(readJson(lessonUrl(e.id)).title, e.title, e.id);
  });
  assert.deepEqual(data.lessons.filter((e) => e.status === 'available').map((e) => e.id), AVAILABLE_IDS);
});

test('cada lección pasa validateLesson y su id coincide con el nombre del archivo', () => {
  for (const { id, lesson } of lessons()) {
    const result = validateLesson(lesson);
    assert.deepEqual(result.errors, [], id);
    assert.equal(lesson.id, id);
    assert.equal(lesson.lang, 'fr');
    assert.equal(lesson.explainLang, 'es');
  }
});

test('cuentas: 4 a 6 ejemplos, 8 a 10 ejercicios (2 de cada tipo) y 1 o 2 situaciones con 2 a 4 modelos', () => {
  for (const { id, lesson } of lessons()) {
    const { examples, exercises, situations, pitfalls, think } = lesson;
    assert.ok(examples.length >= 4 && examples.length <= 6, `${id}: ${examples.length} ejemplos`);
    assert.ok(exercises.length >= 8 && exercises.length <= 10, `${id}: ${exercises.length} ejercicios`);
    for (const type of EXERCISE_TYPES) {
      const n = exercises.filter((e) => e.type === type).length;
      assert.ok(n >= 2, `${id}: ${n} ejercicios ${type}`);
    }
    assert.ok(situations.length >= 1 && situations.length <= 2, `${id}: ${situations.length} situaciones`);
    for (const s of situations) {
      assert.ok(s.models.length >= 2 && s.models.length <= 4, `${id} ${s.id}: ${s.models.length} modelos`);
    }
    assert.ok(pitfalls.length >= 1, `${id}: sin trampa`);
    assert.ok(think.length >= 1, `${id}: sin «cómo pensarlo»`);
  }
});

test('checkExercise acepta cada respuesta (también con apóstrofo tipográfico) y no acepta los errores previstos', () => {
  for (const { id, lesson } of lessons()) {
    for (const ex of lesson.exercises) {
      for (const answer of ex.answers) {
        for (const typed of [answer, answer.replaceAll("'", '\u2019')]) {
          assert.equal(checkExercise(ex, typed, { requireAccents: true }).correct, true, `${id} ${ex.id}: «${typed}»`);
        }
      }
      for (const m of ex.mistakes ?? []) {
        assert.equal(checkExercise(ex, m.answer, { requireAccents: true }).correct, false, `${id} ${ex.id} error previsto: «${m.answer}»`);
        assert.ok(!ex.answers.includes(m.answer), `${id} ${ex.id}: el error previsto «${m.answer}» es una respuesta aceptada`);
      }
    }
  }
});

// Los errores previstos de un ejercicio «order» se pueden armar con sus fichas (las fichas se unen con espacio)
test('cada error previsto de un ejercicio de ordenar se arma con exactamente las fichas del ejercicio', () => {
  const words = (text) => normalizeAnswer(text).split(' ').sort().join('|');
  for (const { id, lesson } of lessons()) {
    for (const ex of lesson.exercises.filter((e) => e.type === 'order')) {
      for (const m of ex.mistakes ?? []) {
        assert.equal(words(m.answer), words(ex.tiles.join(' ')), `${id} ${ex.id}: «${m.answer}» no se arma con las fichas`);
      }
    }
  }
});

// Todos los textos de un valor JSON, con su ruta
function collectTexts(value, path, out) {
  if (typeof value === 'string') out.push([path, value]);
  else if (Array.isArray(value)) value.forEach((v, i) => collectTexts(v, `${path}[${i}]`, out));
  else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) collectTexts(v, `${path}.${k}`, out);
  }
  return out;
}

test('ningún texto tiene problemas de codificación, espacios ni apóstrofo tipográfico', () => {
  for (const { id, lesson } of lessons()) {
    // before y after de un hueco llevan espacios a propósito: se revisa la frase entera
    const plain = structuredClone(lesson);
    for (const ex of plain.exercises.filter((e) => e.type === 'gap')) {
      ex.sentences = ex.answers.map((a) => gapSentence(ex, a));
      delete ex.before;
      delete ex.after;
    }
    for (const [path, text] of collectTexts(plain, id, [])) {
      assert.deepEqual(textProblems(text), [], `${path}: «${text}»`);
    }
  }
});

// Falta de elisión: «je aime», «le eau», «de amis»… (las letras vecinas no cuentan como límite)
const MISSING_ELISION = /(?<!\p{L})(je|me|te|se|le|la|de|ne|que) [aeiouéèêàâîôûœh]/iu;
// Palabras con h aspirada que se usan en las lecciones (no se eliden). Vacía: no se usa ninguna.
const ASPIRATED_H = [];

const missingElision = (text) => {
  const match = text.match(MISSING_ELISION);
  if (!match) return false;
  const next = text.slice(match.index + match[0].length - 1).split(/[\s.,!?]/)[0].toLowerCase();
  return !ASPIRATED_H.includes(next);
};

test('el detector de elisión ve los errores y deja pasar lo correcto', () => {
  assert.equal(missingElision('Je aime le café.'), true);
  assert.equal(missingElision('Le eau est froide.'), true);
  assert.equal(missingElision("J'ai beaucoup de amis."), true);
  assert.equal(missingElision('Je habite à Lyon.'), true);
  assert.equal(missingElision("J'aime le café."), false);
  assert.equal(missingElision("Il n'y a pas de pain."), false);
  assert.equal(missingElision('La fête a lieu demain.'), false);
});

test('elisión: ninguna respuesta, ejemplo, modelo ni forma correcta olvida el apóstrofo', () => {
  for (const { id, lesson } of lessons()) {
    const texts = [
      ...lesson.examples.map((e) => [e.id, e.text]),
      ...lesson.think.map((t) => [t.id, t.target]),
      ...lesson.pitfalls.map((p) => [p.id, p.right]),
      ...lesson.situations.flatMap((s) => s.models.map((m) => [s.id, m])),
      ...lesson.exercises.flatMap((ex) => ex.answers.map((a) => [ex.id, ex.type === 'gap' ? gapSentence(ex, a) : a])),
    ];
    for (const [itemId, text] of texts) assert.equal(missingElision(text), false, `${id} ${itemId}: «${text}»`);
  }
});

test('el francés usa espacio antes de ? y ! en ejemplos, respuestas y modelos', () => {
  for (const { id, lesson } of lessons()) {
    const texts = [
      ...lesson.examples.map((e) => e.text),
      ...lesson.situations.flatMap((s) => s.models),
      ...lesson.exercises.flatMap((ex) => ex.answers.map((a) => (ex.type === 'gap' ? gapSentence(ex, a) : a))),
    ];
    for (const text of texts) assert.doesNotMatch(text, /\S[?!]/, `${id}: «${text}»`);
  }
});

// --- Documento de revisión (docs/contenido/construir-frases.md) ---

const cells = (line) => line.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
// Filas de datos de las tablas de un trozo del documento (sin cabecera ni separador)
function tableRows(markdown) {
  const lines = markdown.split('\n').filter((l) => l.trim().startsWith('|'));
  return lines.filter((l, i) => !/^\|[\s:-]+\|/.test(l) && !/^\|[\s:-]+\|/.test(lines[i + 1] ?? '')).map(cells);
}
// Parte del documento de una lección: desde su título hasta el siguiente «## »
function lessonSection(markdown, id) {
  const start = markdown.search(new RegExp(`^## .*\\(${id}\\)`, 'm'));
  assert.ok(start >= 0, `falta la sección de ${id}`);
  const next = markdown.indexOf('\n## ', start + 1);
  return markdown.slice(start, next < 0 ? markdown.length : next);
}

// Texto francés principal de cada elemento (las ideas están en español: «—»)
const FRENCH = {
  idea: () => '—',
  think: (t) => t.target,
  examples: (e) => e.text,
  pitfalls: (p) => p.right,
  exercises: (x) => x.answers[0],
  situations: (s) => s.models[0],
};

test('fr-a2-02: x1 acepta la frase sin punto final ni mayúscula inicial', () => {
  const x1 = readJson(lessonUrl('fr-a2-02')).exercises.find((x) => x.id === 'x1');
  for (const typed of ['Elle est arrivée en retard ce matin', 'elle est arrivée en retard ce matin.', 'ce matin, elle est arrivée en retard']) {
    assert.equal(checkExercise(x1, typed, { requireAccents: true }).correct, true, typed);
  }
});

test('el documento dice que está pendiente de revisión y nombra las fuentes', () => {
  const doc = readFileSync(DOC, 'utf8');
  assert.ok(doc.includes('Estado: Pendiente de revisión del usuario.'));
  for (const url of [
    'https://www.eaquals.org/wp-content/uploads/Inventaire_ONLINE_full.pdf',
    'https://bop.fipf.org/wp-content/uploads/2017/03/refa343342.pdf',
    'https://vitrinelinguistique.oqlf.gouv.qc.ca/',
  ]) assert.ok(doc.includes(url), `falta la fuente ${url}`);
});

test('las tablas del documento coinciden con los JSON: id, francés y REVISAR, sin filas de más', () => {
  const doc = readFileSync(DOC, 'utf8');
  for (const { id, lesson } of lessons()) {
    const rows = tableRows(lessonSection(doc, id));
    const expected = ITEM_KEYS.flatMap((key) => lesson[key].map((item) => (
      { id: item.id, fr: FRENCH[key](item), review: item.review ? 'sí' : '' })));
    const actual = rows.map((r) => {
      assert.equal(r.length, 6, `${id}: la fila «${r[0]}» no tiene 6 columnas`);
      return { id: r[0], fr: r[2], review: r[5] };
    });
    assert.deepEqual(actual, expected, id);
  }
});
