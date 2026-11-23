// Copia de seguridad completa: palabras, tarjetas (estado de repaso), historial y ajustes.
// readBackup lo valida todo antes de devolver nada; restoreBackup nunca deja datos a medias.
// El historial solo tiene que ser una lista: Progreso ya ignora las respuestas raras, y exigir
// más podría dejar sin restaurar una copia hecha por la propia app.
import { validateWord, duplicateKey } from './words.js';
import { STORAGE_KEY, toStorageError } from './storage.js';
import { STUDY_KEY, validateSettings } from './study-storage.js';

export const BACKUP_FORMAT = 'app-frances-copia';
export const BACKUP_VERSION = 1;
export const MAX_BACKUP_BYTES = 10 * 1024 * 1024;
const WORDS_FORMAT = 'app-frances-vocabulario';
const SCHEMA_VERSION = 1;

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
const isObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

export function buildBackup({ words, study, now }) {
  const { cards, history, settings } = study;
  const data = { format: BACKUP_FORMAT, version: BACKUP_VERSION, createdAt: now.toISOString(), words, study: { cards, history, settings } };
  return `${JSON.stringify(data, null, 2)}\n`;
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
  if (!isDateOrNull(card.introducedOn)) return false;
  if (card.lastReviewedAt !== null && typeof card.lastReviewedAt !== 'string') return false;
  const { sm2, leitner } = card;
  if (!isObject(sm2) || !['reps', 'interval', 'ease', 'lapses'].every((k) => isNumber(sm2[k])) || !isDateOrNull(sm2.due)) return false;
  return isObject(leitner) && Number.isInteger(leitner.box) && leitner.box >= 0 && leitner.box <= 5 && isDateOrNull(leitner.due);
}

function validStudy(study) {
  if (!isObject(study) || !isObject(study.cards) || !Array.isArray(study.history)) return false;
  if (!isObject(study.settings) || !validateSettings(study.settings).ok) return false;
  return Object.entries(study.cards).every(([key, card]) => validCard(card, key));
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
  if (data.version !== BACKUP_VERSION || typeof data.createdAt !== 'string' || Number.isNaN(Date.parse(data.createdAt))
    || !validWords(data.words) || !validStudy(data.study)) {
    return failed(BACKUP_ERRORS.damaged);
  }
  const { cards, history, settings } = data.study;
  return {
    fatal: null,
    backup: { words: data.words, study: { cards, history, settings }, createdAt: data.createdAt },
    summary: { words: data.words.length, cards: Object.keys(cards).length, answers: history.length, createdAt: data.createdAt },
  };
}

// Escribe palabras y progreso; si lo segundo falla, deja las palabras como estaban
export function restoreBackup(backend, backup) {
  const { words, study } = backup;
  const previousWords = backend.getItem(STORAGE_KEY);
  try {
    backend.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: SCHEMA_VERSION, words }));
  } catch (error) {
    throw toStorageError(error);
  }
  try {
    backend.setItem(STUDY_KEY, JSON.stringify({ schemaVersion: SCHEMA_VERSION, ...study }));
  } catch (error) {
    if (previousWords === null) backend.removeItem(STORAGE_KEY);
    else backend.setItem(STORAGE_KEY, previousWords);
    throw toStorageError(error);
  }
}
