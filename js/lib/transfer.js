// Importar y exportar el vocabulario en JSON y CSV.
// La importación nunca cambia nada: solo lee el archivo y prepara un plan
// (nuevas, duplicadas, inválidas) para que el usuario decida.
import { parseCsv, toCsv, CsvError } from './csv.js';
import { validateWord, duplicateKey, sortWords, searchKey } from './words.js';

export const MAX_IMPORT_BYTES = 2 * 1024 * 1024;
export const CSV_COLUMNS = ['frances', 'espanol', 'ejemplo_frances', 'ejemplo_espanol', 'categoria', 'genero', 'revisar'];

const JSON_FORMAT = 'app-frances-vocabulario';
const EXPORT_FIELDS = ['fr', 'es', 'exampleFr', 'exampleEs', 'category', 'gender', 'needsReview'];
const COLUMN_FIELD = {
  frances: 'fr', espanol: 'es', ejemplo_frances: 'exampleFr', ejemplo_espanol: 'exampleEs', categoria: 'category',
};
const REQUIRED_COLUMNS = ['frances', 'espanol'];
// Orden en que se muestran los motivos de una fila inválida
const FIELD_ORDER = ['fr', 'es', 'exampleFr', 'exampleEs', 'category', 'gender'];
// Celdas que una hoja de cálculo ejecutaría como fórmula
const FORMULA_START = /^[=+\-@]/;

function pick(word) {
  return Object.fromEntries(EXPORT_FIELDS.map((field) => [field, word[field] ?? (field === 'gender' ? null : '')]));
}

export function exportJson(words, now) {
  const data = { format: JSON_FORMAT, version: 1, exportedAt: now.toISOString(), words: sortWords(words).map(pick) };
  return JSON.stringify(data, null, 2) + '\n';
}

// Una celda que empieza por = + - @ se exporta con ' delante para que no sea fórmula
function guardCell(value) {
  const text = String(value ?? '');
  return FORMULA_START.test(text) ? `'${text}` : text;
}

export function exportCsv(words) {
  const rows = sortWords(words).map((w) => [
    w.fr, w.es, w.exampleFr, w.exampleEs, w.category, w.gender ?? '', w.needsReview ? 'si' : '',
  ].map(guardCell));
  return toCsv([CSV_COLUMNS, ...rows]);
}

export function exportFileName(kind, now) {
  const pad = (n) => String(n).padStart(2, '0');
  return `vocabulario-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.${kind}`;
}

const fatal = (message) => ({ fatal: message, rows: [], ignoredColumns: [] });

// Devuelve { fatal, rows: [{ row, input, problems }], ignoredColumns }
export function readImport(text, fileName) {
  const extension = String(fileName).toLowerCase().split('.').pop();
  if (extension !== 'json' && extension !== 'csv') return fatal('Solo se pueden importar archivos .json o .csv.');
  if (text.replace(/^\uFEFF/, '').trim() === '') return fatal('El archivo está vacío.');
  if (text.includes('\uFFFD')) {
    return fatal('El archivo no está en UTF-8. Guárdalo como «CSV UTF-8» y vuelve a intentarlo.');
  }
  return extension === 'json' ? readJson(text) : readCsv(text);
}

function readJson(text) {
  let data;
  try {
    data = JSON.parse(text.replace(/^\uFEFF/, ''));
  } catch {
    return fatal('El archivo JSON no se puede leer.');
  }
  if (!data || data.format !== JSON_FORMAT || !Array.isArray(data.words)) {
    return fatal('Este JSON no es una exportación de la app.');
  }
  if (data.words.length === 0) return fatal('El archivo no tiene palabras.');
  const rows = data.words.map((item, index) => ({
    row: index + 1,
    input: item && typeof item === 'object' ? { ...item } : {},
    problems: [],
  }));
  return { fatal: null, rows, ignoredColumns: [] };
}

// «Ejemplo francés» → «ejemplo_frances»
function columnKey(header) {
  return searchKey(header).replace(/[\s-]+/g, '_');
}

// Quita el ' que pusimos al exportar delante de una posible fórmula
function unguardCell(value) {
  return /^'[=+\-@]/.test(value) ? value.slice(1) : value;
}

function parseGender(value) {
  const key = searchKey(value);
  if (key === '') return { gender: null };
  if (key === 'm' || key === 'masculino') return { gender: 'm' };
  if (key === 'f' || key === 'femenino') return { gender: 'f' };
  return { gender: null, problem: 'El género debe ser m, f o estar vacío.' };
}

function parseReview(value) {
  const key = searchKey(value);
  if (['', 'no', '0', 'false'].includes(key)) return { needsReview: false };
  if (['si', '1', 'true'].includes(key)) return { needsReview: true };
  return { needsReview: false, problem: 'La columna revisar debe ser sí, no o estar vacía.' };
}

function readCsv(text) {
  let records;
  try {
    ({ records } = parseCsv(text));
  } catch (error) {
    if (error instanceof CsvError) return fatal(`Hay unas comillas sin cerrar en la línea ${error.line}.`);
    throw error;
  }

  const [header, ...dataRecords] = records;
  const columnIndex = {};
  const ignoredColumns = [];
  header.fields.forEach((name, index) => {
    const key = columnKey(name);
    if (CSV_COLUMNS.includes(key)) {
      if (!(key in columnIndex)) columnIndex[key] = index;
    } else if (name.trim() !== '') {
      ignoredColumns.push(name.trim());
    }
  });

  const missing = REQUIRED_COLUMNS.filter((column) => !(column in columnIndex));
  if (missing.length > 0) return fatal(`Faltan las columnas: ${missing.join(', ')}.`);

  const rows = [];
  for (const record of dataRecords) {
    if (record.fields.every((field) => field.trim() === '')) continue; // fila vacía
    const cell = (column) => (column in columnIndex ? unguardCell(record.fields[columnIndex[column]] ?? '') : '');
    const input = {};
    for (const [column, field] of Object.entries(COLUMN_FIELD)) input[field] = cell(column);
    const gender = parseGender(cell('genero'));
    const review = parseReview(cell('revisar'));
    input.gender = gender.gender;
    input.needsReview = review.needsReview;
    rows.push({ row: record.line, input, problems: [gender.problem, review.problem].filter(Boolean) });
  }

  if (rows.length === 0) return fatal('El archivo no tiene palabras.');
  return { fatal: null, rows, ignoredColumns };
}

// Clasifica las filas leídas en nuevas, duplicadas (ya en la lista) e inválidas
export function planImport(rows, existingWords) {
  const existingByKey = new Map(existingWords.map((w) => [duplicateKey(w.fr), w]));
  const firstRowByKey = new Map();
  const plan = { newWords: [], duplicates: [], invalid: [] };

  for (const { row, input, problems = [] } of rows) {
    const { errors, word } = validateWord(input);
    const reasons = [...FIELD_ORDER.filter((f) => errors[f]).map((f) => errors[f]), ...problems];
    if (reasons.length > 0) {
      plan.invalid.push({ row, reasons });
      continue;
    }

    const key = duplicateKey(word.fr);
    if (firstRowByKey.has(key)) {
      plan.invalid.push({ row, reasons: [`Repite la fila ${firstRowByKey.get(key)}.`] });
      continue;
    }
    firstRowByKey.set(key, row);

    const existing = existingByKey.get(key);
    if (existing) plan.duplicates.push({ row, word, existingId: existing.id });
    else plan.newWords.push({ row, word });
  }
  return plan;
}
