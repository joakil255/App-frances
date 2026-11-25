import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { INDEX_FORMAT, EXERCISE_TYPES, validateLesson } from '../js/lib/lessons.js';
import { textProblems } from './helpers/content-checks.js';

// --- Lecciones de «Construir frases» (data/lessons/fr) ---

const DIR = new URL('../data/lessons/fr/', import.meta.url);
const DOC = new URL('../docs/contenido/construir-frases.md', import.meta.url);
const ITEM_KEYS = ['idea', 'think', 'examples', 'pitfalls', 'exercises', 'situations'];

const readJson = (url) => JSON.parse(readFileSync(url, 'utf8'));
const index = () => readJson(new URL('index.json', DIR));
const lessonUrl = (id) => new URL(`${id}.json`, DIR);
const lessons = () => index().lessons.map((id) => ({ id, lesson: readJson(lessonUrl(id)) }));

// Frase completa de un hueco: el autor incluye los espacios en before y after
const gapSentence = (ex, answer) => ex.before + answer + ex.after;

test('el índice tiene su formato y solo lista archivos que existen', () => {
  const data = index();
  assert.equal(data.format, INDEX_FORMAT);
  assert.equal(data.version, 1);
  assert.equal(data.lang, 'fr');
  assert.deepEqual(data.lessons, ['fr-a1-01', 'fr-a1-02', 'fr-a1-03', 'fr-a1-04', 'fr-a1-05', 'fr-a1-06']);
  assert.equal(new Set(data.lessons).size, data.lessons.length, 'lecciones repetidas');
  for (const id of data.lessons) assert.ok(existsSync(lessonUrl(id)), `no existe ${id}.json`);
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
