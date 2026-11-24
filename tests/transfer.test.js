import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CSV_COLUMNS, MAX_IMPORT_BYTES, exportJson, exportCsv, exportFileName, readImport, planImport,
} from '../js/lib/transfer.js';
import { sortWords, upgradeWord } from '../js/lib/words.js';

const word = (fr, es, extra = {}) => ({
  fr, es, exampleFr: '', exampleEs: '', category: '', gender: null, needsReview: false, ...extra,
});
const csv = (...lines) => lines.join('\r\n') + '\r\n';
const fatalOf = (text, name = 'v.csv') => readImport(text, name).fatal;

test('constantes del formato', () => {
  assert.deepEqual(CSV_COLUMNS, ['frances', 'espanol', 'ejemplo_frances', 'ejemplo_espanol', 'categoria', 'genero', 'revisar']);
  assert.equal(MAX_IMPORT_BYTES, 2 * 1024 * 1024);
});

test('nombre del archivo exportado con la fecha local', () => {
  assert.equal(exportFileName('csv', new Date(2026, 10, 23, 23, 59)), 'vocabulario-2026-11-23.csv');
  assert.equal(exportFileName('json', new Date(2026, 0, 5)), 'vocabulario-2026-01-05.json');
});

test('rechaza archivos que no son .json ni .csv', () => {
  assert.equal(fatalOf('frances,espanol\n', 'lista.txt'), 'Solo se pueden importar archivos .json o .csv.');
});

test('rechaza un archivo vacío o con solo espacios', () => {
  assert.equal(fatalOf(''), 'El archivo está vacío.');
  assert.equal(fatalOf('\uFEFF  \r\n '), 'El archivo está vacío.');
  assert.equal(fatalOf('', 'v.json'), 'El archivo está vacío.');
});

test('rechaza un CSV con solo la cabecera o solo filas vacías', () => {
  assert.equal(fatalOf(csv('frances,espanol')), 'El archivo no tiene palabras.');
  assert.equal(fatalOf(csv('frances,espanol', ',', '')), 'El archivo no tiene palabras.');
});

test('rechaza un CSV sin las columnas obligatorias y dice cuáles faltan', () => {
  assert.equal(fatalOf(csv('palabra,traduccion', 'chat,gato')), 'Faltan las columnas: frances, espanol.');
  assert.equal(fatalOf(csv('frances', 'le chat')), 'Faltan las columnas: espanol.');
});

test('rechaza un archivo que no está en UTF-8', () => {
  assert.equal(fatalOf(csv('frances,espanol', 'le caf\uFFFD,el caf\uFFFD')),
    'El archivo no está en UTF-8. Guárdalo como «CSV UTF-8» y vuelve a intentarlo.');
});

test('rechaza comillas sin cerrar con su línea', () => {
  assert.equal(fatalOf(csv('frances,espanol', 'le chat,el gato', '"sin cerrar,x')), 'Hay unas comillas sin cerrar en la línea 3.');
});

test('rechaza JSON roto o de otro formato', () => {
  assert.equal(fatalOf('{ "words": [', 'v.json'), 'El archivo JSON no se puede leer.');
  assert.equal(fatalOf('{"format":"otra-app","words":[]}', 'v.json'), 'Este JSON no es una exportación de la app.');
  assert.equal(fatalOf('[1,2]', 'v.json'), 'Este JSON no es una exportación de la app.');
  assert.equal(fatalOf('{"format":"app-frances-vocabulario","version":1,"words":[]}', 'v.json'), 'El archivo no tiene palabras.');
});

test('acepta cabeceras con acentos, mayúsculas y en otro orden, e informa las desconocidas', () => {
  const result = readImport(csv('ESPAÑOL,Francés,Notas', 'el gato,le chat,x'), 'v.csv');
  assert.equal(result.fatal, null);
  assert.deepEqual(result.ignoredColumns, ['Notas']);
  assert.equal(result.rows[0].input.fr, 'le chat');
  assert.equal(result.rows[0].input.es, 'el gato');
  assert.equal(result.rows[0].row, 2);
});

test('importa un CSV de Excel en español (punto y coma, BOM, comillas)', () => {
  const text = '\uFEFFfrances;espanol;genero\r\n"le chat, noir";el gato negro;m\r\n';
  const plan = planImport(readImport(text, 'excel.csv').rows, []);
  assert.deepEqual(plan.newWords.map((n) => n.word.fr), ['le chat, noir']);
  assert.equal(plan.newWords[0].word.gender, 'm');
});

test('genero acepta m, f, masculino y femenino; otro valor es un error de la fila', () => {
  const text = csv('frances,espanol,genero', 'le chat,el gato,Masculino', 'la maison,la casa,F', 'le pain,el pan,x');
  const plan = planImport(readImport(text, 'v.csv').rows, []);
  assert.deepEqual(plan.newWords.map((n) => n.word.gender), ['m', 'f']);
  assert.deepEqual(plan.invalid, [{ row: 4, reasons: ['El género debe ser m, f o estar vacío.'] }]);
});

test('revisar acepta sí/no y similares; otro valor es un error de la fila', () => {
  const text = csv('frances,espanol,revisar', 'être,ser,sí', 'avoir,tener,0', 'aller,ir,quizá');
  const plan = planImport(readImport(text, 'v.csv').rows, []);
  assert.deepEqual(plan.newWords.map((n) => n.word.needsReview), [true, false]);
  assert.deepEqual(plan.invalid, [{ row: 4, reasons: ['La columna revisar debe ser sí, no o estar vacía.'] }]);
});

test('las filas inválidas llevan su número y todos sus motivos', () => {
  const text = csv('frances,espanol,ejemplo_frances,genero', ',el gato,,', 'maison,la casa,Une phrase.,f');
  const plan = planImport(readImport(text, 'v.csv').rows, []);
  assert.deepEqual(plan.invalid, [
    { row: 2, reasons: ['Escribe la palabra en francés.'] },
    { row: 3, reasons: ["Con género, escribe el artículo: le, la, l', les, un, une o des.", 'Falta la traducción del ejemplo.'] },
  ]);
});

test('separa las duplicadas de la lista y las repetidas dentro del archivo', () => {
  const existing = [{ id: 'w1', ...word('le chat', 'el gato', { gender: 'm' }) }];
  const text = csv('frances,espanol', 'Le Chat,el gato', 'la maison,la casa', 'la  maison,la casa otra vez');
  const plan = planImport(readImport(text, 'v.csv').rows, existing);
  assert.deepEqual(plan.duplicates.map((d) => [d.row, d.existingId]), [[2, 'w1']]);
  assert.deepEqual(plan.newWords.map((n) => n.row), [3]);
  assert.deepEqual(plan.invalid, [{ row: 4, reasons: ['Repite la fila 3.'] }]);
});

test('en JSON la fila es la posición de la palabra', () => {
  const text = JSON.stringify({ format: 'app-frances-vocabulario', version: 1, words: [word('être', 'ser'), { fr: '' }] });
  const plan = planImport(readImport(text, 'v.json').rows, []);
  assert.deepEqual(plan.newWords.map((n) => n.row), [1]);
  assert.equal(plan.invalid[0].row, 2);
});

test('exportCsv neutraliza celdas que una hoja de cálculo tomaría por fórmulas', () => {
  const text = exportCsv([word('être', 'ser', { category: '=SUMA(1)', exampleFr: '+33 1 23', exampleEs: '@a' })]);
  assert.ok(text.includes("'=SUMA(1)"));
  assert.ok(text.includes("'+33 1 23"));
  assert.ok(text.includes("'@a"));
  assert.ok(text.startsWith('\uFEFFfrances,espanol,ejemplo_frances,ejemplo_espanol,categoria,genero,revisar\r\n'));
});

// 1.000 palabras con todos los caracteres delicados
function manyWords() {
  return Array.from({ length: 1000 }, (_, i) => word(`le mot ${i} «ç» œ`, `palabra "${i}", con ; y ñ`, {
    exampleFr: `L’œuf n°${i}, «très» bon.`,
    exampleEs: `El huevo ${i}; "muy" bueno.`,
    category: i % 7 === 0 ? '=SUMA(1)' : `Categoría ${i % 5}`,
    gender: 'm',
    needsReview: i % 3 === 0,
  }));
}

test('ida y vuelta en CSV de 1.000 palabras con caracteres especiales', () => {
  const words = manyWords();
  const plan = planImport(readImport(exportCsv(words), 'v.csv').rows, []);
  assert.equal(plan.invalid.length, 0);
  // Al importar, cada palabra recibe lang y lemma (Etapa 10)
  assert.deepEqual(sortWords(plan.newWords.map((n) => n.word)), sortWords(words.map(upgradeWord)));
});

test('ida y vuelta en JSON de 1.000 palabras con caracteres especiales', () => {
  const words = manyWords();
  const text = exportJson(words, new Date('2026-11-23T10:00:00Z'));
  assert.equal(JSON.parse(text).format, 'app-frances-vocabulario');
  assert.equal(JSON.parse(text).exportedAt, '2026-11-23T10:00:00.000Z');
  const plan = planImport(readImport(text, 'v.json').rows, []);
  // Al importar, cada palabra recibe lang y lemma (Etapa 10)
  assert.deepEqual(sortWords(plan.newWords.map((n) => n.word)), sortWords(words.map(upgradeWord)));
});

test('la exportación no incluye datos internos (id, fechas)', () => {
  const text = exportJson([{ id: 'x', createdAt: 'a', updatedAt: 'b', ...word('être', 'ser') }], new Date());
  assert.deepEqual(Object.keys(JSON.parse(text).words[0]), ['fr', 'es', 'exampleFr', 'exampleEs', 'category', 'gender', 'needsReview']);
});

test('revisa una importación de 1.000 filas en menos de 1 segundo', () => {
  const text = exportCsv(manyWords());
  const start = performance.now();
  const plan = planImport(readImport(text, 'v.csv').rows, manyWords().slice(0, 500).map((w, i) => ({ id: `e${i}`, ...w })));
  assert.ok(performance.now() - start < 1000, 'demasiado lento');
  assert.equal(plan.duplicates.length, 500);
  assert.equal(plan.newWords.length, 500);
});

// --- Mejora B de la auditoría ---
test('importar «l’eau» sobre una lista con «l\'eau» la marca como ya existente', () => {
  const read = readImport(csv('frances,espanol', 'l’eau,el agua'), 'v.csv');
  const plan = planImport(read.rows, [word("l'eau", 'el agua', { id: 'w1' })]);
  assert.equal(plan.newWords.length, 0);
  assert.equal(plan.duplicates.length, 1);
});
