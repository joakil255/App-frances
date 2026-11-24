// Copia de seguridad completa: palabras, historias, tarjetas (estado de repaso), historial y ajustes.
// readBackup lo valida todo antes de devolver nada; restoreBackup nunca deja datos a medias.
// El historial solo tiene que ser una lista: Progreso ya ignora las respuestas raras, y exigir
// más podría dejar sin restaurar una copia hecha por la propia app.
import { validateWord, duplicateKey, upgradeWord } from './words.js';
import { STORAGE_KEY, toStorageError } from './storage.js';
import { STUDY_KEY, validateSettings } from './study-storage.js';
import { cardIdOf } from './scheduler.js';
import { TEXTS_KEY, validateText } from './texts.js';

export const BACKUP_FORMAT = 'app-frances-copia';
export const BACKUP_VERSION = 3;
export const MAX_BACKUP_BYTES = 10 * 1024 * 1024;
const WORDS_FORMAT = 'app-frances-vocabulario';
const SCHEMA_VERSION = 2; // palabras con lang y lemma
const STUDY_SCHEMA_VERSION = 1;
const TEXTS_SCHEMA_VERSION = 1;

const DIRECTIONS = ['fr-es', 'es-fr'];

export const BACKUP_ERRORS = Object.freeze({
  notUtf8: 'El archivo no está en UTF-8.',
  unreadable: 'El archivo no se puede leer.',
  wordList: 'Este archivo es una lista de palabras: impórtalo en Vocabulario con «Importar».',
  notBackup: 'Este archivo no es una copia de seguridad de la app.',
  newer: 'La copia es de una versión más nueva de la app. Actualiza la app y vuelve a intentarlo.',
  damaged: 'La copia está incompleta o dañada.',
});

const pad = (n) => String(n).padStart(2, '0');
const isText = (value) => typeof value === 'string' && value.length > 0;
const isDate = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
const isDateOrNull = (value) => value === null || isDate(value);
const isNumber = (value) => typeof value === 'number' && Number.isFinite(value);
const isCount = (value) => Number.isInteger(value) && value >= 0;
const isObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

export function buildBackup({ words, study, texts = [], now }) {
  const { cards, history, settings } = study;
  const data = { format: BACKUP_FORMAT, version: BACKUP_VERSION, createdAt: now.toISOString(), words: words.map(upgradeWord), study: { cards, history, settings }, texts };
  // El carácter de reemplazo se escribe como escape JSON: es el mismo texto al leerlo, y así
  // readBackup no lo confunde con un archivo mal codificado
  return `${JSON.stringify(data, null, 2).replace(/\uFFFD/g, '\\ufffd')}\n`;
}

export function backupFileName(now) {
  return `copia-frances-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`;
}

function validWords(words) {
  if (!Array.isArray(words)) return false;
  const ids = new Set();
  const keys = new Set();
  for (const word of words) {
    if (!isObject(word) || !isText(word.id) || ids.has(word.id)) return false;
    if (typeof word.createdAt !== 'string' || typeof word.updatedAt !== 'string') return false;
    if (!validateWord(word).ok) return false;
    const key = duplicateKey(word.fr);
    if (keys.has(key)) return false;
    ids.add(word.id);
    keys.add(key);
  }
  return true;
}

function validCard(card, key) {
  if (!isObject(card) || card.id !== key || !isText(card.wordId) || !DIRECTIONS.includes(card.direction)) return false;
  if (card.id !== cardIdOf(card.wordId, card.direction)) return false;
  if (!isDateOrNull(card.introducedOn)) return false;
  if (card.lastReviewedAt !== null && typeof card.lastReviewedAt !== 'string') return false;
  const { sm2, leitner } = card;
  // Números que el programador de repasos puede usar: enteros no negativos y facilidad de 1,3 a 3,0
  if (!isObject(sm2) || !['reps', 'interval', 'lapses'].every((k) => isCount(sm2[k])) || !isDateOrNull(sm2.due)) return false;
  if (!isNumber(sm2.ease) || sm2.ease < 1.3 || sm2.ease > 3) return false;
  return isObject(leitner) && Number.isInteger(leitner.box) && leitner.box >= 0 && leitner.box <= 5 && isDateOrNull(leitner.due);
}

function validStudy(study) {
  if (!isObject(study) || !isObject(study.cards) || !Array.isArray(study.history)) return false;
  if (!isObject(study.settings) || !validateSettings(study.settings).ok) return false;
  return Object.entries(study.cards).every(([key, card]) => validCard(card, key));
}

function validTexts(texts) {
  if (!Array.isArray(texts)) return false;
  const ids = new Set();
  for (const text of texts) {
    if (!isObject(text) || !isText(text.id) || ids.has(text.id) || !validateText(text).ok) return false;
    ids.add(text.id);
  }
  return true;
}

const failed = (fatal) => ({ fatal, backup: null, summary: null });

export function readBackup(text) {
  if (text.includes('\uFFFD')) return failed(BACKUP_ERRORS.notUtf8);
  let data;
  try {
    data = JSON.parse(text.replace(/^\uFEFF/, ''));
  } catch {
    return failed(BACKUP_ERRORS.unreadable);
  }
  if (isObject(data) && data.format === WORDS_FORMAT) return failed(BACKUP_ERRORS.wordList);
  if (!isObject(data) || data.format !== BACKUP_FORMAT) return failed(BACKUP_ERRORS.notBackup);
  if (isNumber(data.version) && data.version > BACKUP_VERSION) return failed(BACKUP_ERRORS.newer);
  // Se leen la versión 1 (sin lang ni lemma), la 2 (sin historias) y la 3
  if (![1, 2, BACKUP_VERSION].includes(data.version) || typeof data.createdAt !== 'string' || Number.isNaN(Date.parse(data.createdAt))
    || !validWords(data.words) || !validStudy(data.study) || (data.version === BACKUP_VERSION && !validTexts(data.texts))) {
    return failed(BACKUP_ERRORS.damaged);
  }
  const { cards, history, settings } = data.study;
  const texts = data.version === BACKUP_VERSION ? data.texts : null; // null = la copia no traía historias
  return {
    fatal: null,
    // lang y lemma se recalculan siempre: no se confía en lo que traiga el archivo
    backup: { words: data.words.map(upgradeWord), study: { cards, history, settings }, texts, createdAt: data.createdAt },
    summary: {
      words: data.words.length, cards: Object.keys(cards).length, answers: history.length, createdAt: data.createdAt,
      ...(texts ? { texts: texts.length } : {}),
    },
  };
}

// Escribe palabras, progreso e historias; si una escritura falla, deja las claves como estaban.
// Una copia sin historias (texts: null) no toca las historias guardadas.
export function restoreBackup(backend, backup) {
  const { words, study, texts } = backup;
  const writes = [
    [STORAGE_KEY, JSON.stringify({ schemaVersion: SCHEMA_VERSION, words })],
    [STUDY_KEY, JSON.stringify({ schemaVersion: STUDY_SCHEMA_VERSION, ...study })],
  ];
  if (texts) writes.push([TEXTS_KEY, JSON.stringify({ schemaVersion: TEXTS_SCHEMA_VERSION, texts })]);
  const previous = new Map(writes.map(([key]) => [key, backend.getItem(key)]));
  const done = [];
  for (const [key, value] of writes) {
    try {
      backend.setItem(key, value);
      done.push(key);
    } catch (error) {
      for (const written of done) {
        try {
          if (previous.get(written) === null) backend.removeItem(written);
          else backend.setItem(written, previous.get(written));
        } catch {
          // si ni siquiera se puede volver atrás, se informa del error original
        }
      }
      throw toStorageError(error);
    }
  }
}

// Texto de la ventana de restaurar: dice con exactitud qué se reemplaza
export function restoreWarning({ texts }) {
  const replaced = texts
    ? 'Se reemplazarán tus palabras, tu progreso y tus historias.'
    : 'Se reemplazarán tus palabras y tu progreso (esta copia no trae historias: las tuyas se mantienen).';
  return `${replaced} No se puede deshacer. Si quieres conservarlos, guarda antes una copia.`;
}
