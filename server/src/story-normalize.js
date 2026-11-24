import { ProviderError } from './errors.js';
import { straighten } from './lookup-validate.js';

const MAX_TITLE = 80;
const MAX_BODY_LETTERS = 3000;
const MIN_WORDS = 80;
const MAX_WORDS = 300;
const MIN_SENTENCES = 4;
const QUESTIONS = 4;

const isText = (value) => typeof value === 'string' && value.trim() !== '';
// HTML: cualquier <etiqueta>. Markdown: ** __ ` y líneas que empiezan con #, - o *
const HAS_MARKUP = /<\/?[a-z!][^>]*>|\*\*|__|`|^\s*(#|[-*]\s)/im;
// Frases: trozos que terminan en . ! ? o … (varios signos seguidos cuentan como un final)
const countSentences = (text) => text.split(/[.!?…]+/).filter((part) => /\p{L}/u.test(part)).length;

// Valida la historia que devuelve Claude; si algo no cumple lanza bad_output
export function normalizeStory(raw) {
  const bad = () => new ProviderError('bad_output');
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) throw bad();
  const { title, body, questions } = raw;
  if (!isText(title) || [...title].length > MAX_TITLE || HAS_MARKUP.test(title)) throw bad();
  if (!isText(body) || [...body].length > MAX_BODY_LETTERS || HAS_MARKUP.test(body)) throw bad();
  const words = body.trim().split(/\s+/).length;
  if (words < MIN_WORDS || words > MAX_WORDS || countSentences(body) < MIN_SENTENCES) throw bad();
  if (!Array.isArray(questions) || questions.length !== QUESTIONS) throw bad();

  const text = straighten(body);
  const clean = questions.map((item) => {
    if (item === null || typeof item !== 'object') throw bad();
    const { question, options, answer, explanation, evidence } = item;
    if (!isText(question) || !isText(explanation) || !isText(evidence)) throw bad();
    if (!Array.isArray(options) || options.length < 3 || options.length > 4 || !options.every(isText)) throw bad();
    if (new Set(options.map((option) => option.trim().toLowerCase())).size !== options.length) throw bad();
    if (!Number.isInteger(answer) || answer < 0 || answer >= options.length) throw bad();
    if (!text.includes(straighten(evidence.trim()))) throw bad();
    return { question, options, answer, explanation, evidence };
  });
  return { title, body, questions: clean };
}
