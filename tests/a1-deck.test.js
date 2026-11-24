import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readImport, planImport } from '../js/lib/transfer.js';
import { duplicateKey, lemmaOf } from '../js/lib/words.js';
import { INITIAL_WORDS } from '../js/data/initial-words.js';
import { exampleWordCount, textProblems } from './helpers/content-checks.js';

// --- Ayudantes de comprobación ---

test('exampleWordCount cuenta palabras y no la puntuación suelta', () => {
  assert.equal(exampleWordCount("Qu'est-ce que c'est ?"), 3);
  assert.equal(exampleWordCount('Bonjour, madame !'), 2);
});

test('textProblems detecta NFD, U+FFFD, espacios y apóstrofo tipográfico', () => {
  assert.ok(textProblems('e\u0301te\u0301').includes('no NFC'));
  assert.ok(textProblems('caf\uFFFD').includes('U+FFFD'));
  assert.ok(textProblems(' le  chat').includes('espacios'));
  assert.ok(textProblems('l\u2019ami').includes('apóstrofo tipográfico'));
  assert.deepEqual(textProblems('le café'), []);
});

// --- Mazo A1 (data/a1-deck.json) ---

const FILE = new URL('../data/a1-deck.json', import.meta.url);
const DOC = new URL('../docs/contenido/a1-deck.md', import.meta.url);
const KEYS = ['category', 'es', 'exampleEs', 'exampleFr', 'fr', 'gender', 'needsReview'];
const TEXT_KEYS = ['fr', 'es', 'exampleFr', 'exampleEs', 'category'];
const COUNTS = { Saludos: 12, 'Números': 21, Familia: 12, Comida: 20, Verbos: 20, Lugares: 15 };
const NUMBERS = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze',
  'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf', 'vingt'];
const SPAIN = ['vosotros', 'vosotras', 'patata', 'patatas', 'zumo', 'coche', 'coches', 'fresa', 'fresas', 'melocotón',
  'aguacate', 'judías', 'piso', 'ordenador', 'móvil', 'gafas'];
// Palabras correctas en Chile que terminan como las formas de «vosotros» (-áis, -éis)
const NOT_VOSOTROS = ['dieciséis', 'veintiséis'];

const load = () => {
  const buffer = readFileSync(FILE);
  const text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  return { buffer, text, data: JSON.parse(text) };
};
const words = () => load().data.words;
const label = (entry) => `«${entry.fr}»`;

test('UTF-8 válido, sin BOM y textos sin problemas de codificación ni espacios', () => {
  const { buffer } = load();
  assert.ok(!(buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF), 'tiene BOM');
  for (const entry of words()) {
    for (const key of TEXT_KEYS) assert.deepEqual(textProblems(entry[key]), [], `${label(entry)} ${key}`);
  }
});

test('formato de exportación de la app', () => {
  const { data } = load();
  assert.equal(data.format, 'app-frances-vocabulario');
  assert.equal(data.version, 1);
  assert.ok(!Number.isNaN(Date.parse(data.exportedAt)) && data.exportedAt === new Date(data.exportedAt).toISOString());
  assert.ok(Array.isArray(data.words));
});

test('regla 1: campos completos y exactos', () => {
  for (const entry of words()) {
    assert.deepEqual(Object.keys(entry).sort(), KEYS, label(entry));
    for (const key of TEXT_KEYS) assert.ok(entry[key].length > 0, `${label(entry)} sin ${key}`);
    assert.ok(['m', 'f', null].includes(entry.gender), `${label(entry)} género`);
    assert.equal(typeof entry.needsReview, 'boolean', label(entry));
  }
});

test('regla 2: sustantivos con artículo definido y género concordante; el resto sin artículo', () => {
  for (const entry of words()) {
    if (entry.gender !== null) {
      assert.match(entry.fr, /^(le |la |les |l')/, `${label(entry)} sin artículo`);
      if (entry.fr.startsWith('le ')) assert.equal(entry.gender, 'm', label(entry));
      if (entry.fr.startsWith('la ')) assert.equal(entry.gender, 'f', label(entry));
    } else {
      assert.doesNotMatch(entry.fr, /^(le |la |les |l'|un |une |des )/, `${label(entry)} tiene artículo sin género`);
    }
  }
});

test('regla 3: los verbos van en infinitivo y sin género', () => {
  for (const entry of words().filter((e) => e.category === 'Verbos')) {
    assert.equal(entry.gender, null, label(entry));
    assert.match(entry.fr, /(er|ir|re|oir)$/, `${label(entry)} no es infinitivo`);
  }
});

test('regla 4: ejemplos de 3 a 7 palabras, con mayúscula, punto final y espacio antes de ? y !', () => {
  for (const entry of words()) {
    const n = exampleWordCount(entry.exampleFr);
    assert.ok(n >= 3 && n <= 7, `${label(entry)}: ${n} palabras`);
    assert.match(entry.exampleFr, /^\p{Lu}/u, `${label(entry)} sin mayúscula`);
    assert.match(entry.exampleFr, /[.!?]$/, `${label(entry)} sin punto final`);
    assert.doesNotMatch(entry.exampleFr, /\S[?!]/, `${label(entry)}: falta espacio antes de ? o !`);
  }
});

test('regla 6: la lista de excepciones deja pasar «dieciséis» pero no «coméis»', () => {
  const vosotros = (token) => !NOT_VOSOTROS.includes(token) && /(áis|éis)$/.test(token);
  assert.equal(vosotros('dieciséis'), false);
  assert.equal(vosotros('coméis'), true);
  assert.equal(vosotros('habláis'), true);
});

test('regla 6: sin formas del español de España', () => {
  for (const entry of words()) {
    for (const key of ['es', 'exampleEs']) {
      const tokens = entry[key].toLowerCase().split(/[^\p{L}]+/u).filter(Boolean);
      for (const token of tokens) {
        assert.ok(!SPAIN.includes(token), `${label(entry)} ${key}: «${token}»`);
        if (!NOT_VOSOTROS.includes(token)) {
          assert.ok(!/(áis|éis)$/.test(token), `${label(entry)} ${key}: «${token}» (vosotros)`);
        }
      }
    }
  }
});

test('regla 7: sin duplicados dentro del mazo ni con las 60 iniciales', () => {
  const seen = new Set();
  const initial = new Set(INITIAL_WORDS.map((w) => duplicateKey(w.fr)));
  for (const entry of words()) {
    const key = duplicateKey(entry.fr);
    assert.ok(!seen.has(key), `${label(entry)} repetida`);
    assert.ok(!initial.has(key), `${label(entry)} ya está en las 60`);
    seen.add(key);
  }
});

test('regla 8: cantidades exactas por categoría y números del 0 al 20 en orden', () => {
  const counts = {};
  for (const entry of words()) counts[entry.category] = (counts[entry.category] ?? 0) + 1;
  assert.deepEqual(counts, COUNTS);
  assert.equal(words().length, 100);
  assert.deepEqual(words().filter((e) => e.category === 'Números').map((e) => e.fr), NUMBERS);
});

test('regla 10: la importación de la Etapa 2 lo acepta entero', () => {
  const read = readImport(load().text, 'a1-deck.json');
  assert.equal(read.fatal, null);
  for (const existing of [[], INITIAL_WORDS]) {
    const plan = planImport(read.rows, existing);
    assert.equal(plan.newWords.length, 100);
    assert.equal(plan.duplicates.length, 0);
    assert.deepEqual(plan.invalid, []);
    for (const { word } of plan.newWords) {
      assert.equal(word.lang, 'fr');
      assert.equal(word.lemma, lemmaOf(word.fr, word.gender));
    }
  }
});

// --- Documento de revisión (docs/contenido/a1-deck.md) ---

const cells = (line) => line.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
// Filas de datos de las tablas de una parte del documento (sin cabecera ni separador)
function tableRows(markdown) {
  const lines = markdown.split('\n').filter((l) => l.trim().startsWith('|'));
  return lines.filter((l, i) => !/^\|[\s:-]+\|/.test(l) && !/^\|[\s:-]+\|/.test(lines[i + 1] ?? '')).map(cells);
}
function section(markdown, title, nextTitle) {
  const start = markdown.indexOf(title);
  assert.ok(start >= 0, `falta la sección «${title}»`);
  const end = nextTitle ? markdown.indexOf(nextTitle, start) : markdown.length;
  return markdown.slice(start, end < 0 ? markdown.length : end);
}

test('regla 12: el documento dice que está pendiente de revisión', () => {
  assert.ok(readFileSync(DOC, 'utf8').includes('Pendiente de revisión del usuario'));
});

test('el documento tiene las mismas cantidades por categoría', () => {
  const doc = readFileSync(DOC, 'utf8');
  const rows = tableRows(section(doc, '## Entradas por categoría', '\n## '));
  const counts = Object.fromEntries(rows.filter(([name]) => name !== 'Total').map(([name, n]) => [name, Number(n)]));
  assert.deepEqual(counts, COUNTS);
});

test('las tablas del documento coinciden una a una con el JSON', () => {
  const doc = readFileSync(DOC, 'utf8');
  const tables = section(doc, '## Tabla completa', '## Lista REVISAR');
  const rows = tableRows(tables).map(([fr, es, gender, exampleFr, exampleEs, review]) => (
    { fr, es, gender, exampleFr, exampleEs, review }));
  const expected = words().map((e) => ({
    fr: e.fr, es: e.es, gender: e.gender ?? '—', exampleFr: e.exampleFr, exampleEs: e.exampleEs, review: e.needsReview ? 'sí' : '',
  }));
  assert.deepEqual(rows, expected);
});

test('regla 11: la lista REVISAR es exactamente la de entradas marcadas, cada una con motivo', () => {
  const doc = readFileSync(DOC, 'utf8');
  const rows = tableRows(section(doc, '## Lista REVISAR'));
  for (const [fr, reason] of rows) assert.ok(reason && reason.length > 0, `«${fr}» sin motivo`);
  const listed = rows.map(([fr]) => fr).sort();
  const marked = words().filter((e) => e.needsReview).map((e) => e.fr).sort();
  assert.deepEqual(listed, marked);
});
