import { ProviderError } from './errors.js';
import { straighten } from './lookup-validate.js';
import { HAS_MARKUP } from './story-normalize.js';

const KINDS = ['grammar', 'syntax', 'spelling'];
const MAX_TEXT = 300;

const isText = (value) => typeof value === 'string';
const hasKeys = (object, keys) => {
  const found = Object.keys(object);
  return found.length === keys.length && keys.every((key) => found.includes(key));
};
// Igual que normalizeAnswer de la app: minúsculas, apóstrofo recto, sin puntuación ni espacios de más
const PUNCTUATION = /[.,;:!?¿¡«»"“”…()]/g;
function wordsKey(text) {
  return text.normalize('NFC').toLowerCase().replace(/[’‘ʼ]/g, "'").replace(PUNCTUATION, ' ')
    .replace(/\s+/g, ' ').replace(/ ?' ?/g, "'").trim();
}
// Texto libre válido: hasta 300 letras y sin HTML ni Markdown
const isCleanText = (value) => isText(value) && [...value].length <= MAX_TEXT && !HAS_MARKUP.test(value);

// Valida la corrección de una frase; si algo no cumple lanza bad_output
export function normalizeSentence(raw, sentence) {
  const bad = () => new ProviderError('bad_output');
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) throw bad();
  if (!hasKeys(raw, ['errors', 'corrected', 'suggestion'])) throw bad();
  if (!Array.isArray(raw.errors) || !isText(raw.corrected) || !isCleanText(raw.suggestion)) throw bad();

  const text = straighten(sentence);
  const errors = [];
  for (const item of raw.errors) {
    if (item === null || typeof item !== 'object' || !hasKeys(item, ['original', 'corrected', 'kind', 'explanation'])) throw bad();
    const { original, corrected, kind, explanation } = item;
    if (!isText(original) || !isText(corrected) || !isCleanText(explanation) || !KINDS.includes(kind)) throw bad();
    if (original.trim() === '' || !text.includes(straighten(original))) throw bad();
    // Solo puntuación o mayúsculas no es un error de A1: se descarta
    if (wordsKey(original) !== wordsKey(corrected)) errors.push({ original, corrected, kind, explanation });
  }
  if (errors.length === 0) return { correct: true, corrected: sentence, errors, suggestion: raw.suggestion };
  if (raw.corrected.trim() === '') throw bad();
  return { correct: false, corrected: raw.corrected, errors, suggestion: raw.suggestion };
}
