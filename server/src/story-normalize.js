import { ProviderError } from './errors.js';
import { straighten } from './lookup-validate.js';

const MAX_TITLE = 80;
const MAX_BODY_LETTERS = 3000;
const MAX_TRANSLATION = 600;
const MAX_SENTENCES = 60;
export const MIN_WORDS = 80;
export const MAX_WORDS = 300;
export const MIN_SENTENCES = 4;
const QUESTIONS = 4;

const isText = (value) => typeof value === 'string' && value.trim() !== '';
// HTML: cualquier <etiqueta>. Markdown: ** __ ` y líneas que empiezan con #, - o *
export const HAS_MARKUP = /<\/?[a-z!][^>]*>|\*\*|__|`|^\s*(#|[-*]\s)/im;
// Frases: trozos que terminan en . ! ? o … (varios signos seguidos cuentan como un final)
export const countSentences = (text) => text.split(/[.!?…]+/).filter((part) => /\p{L}/u.test(part)).length;

export const countWords = (text) => text.trim().split(/\s+/).length;

// Valida la historia que devuelve Claude; si algo no cumple lanza bad_output
export function normalizeStory(raw) {
  const bad = () => new ProviderError('bad_output');
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) throw bad();
  const { title, sentences, questions } = raw;
  if (!isText(title) || [...title].length > MAX_TITLE || HAS_MARKUP.test(title)) throw bad();
  if (!Array.isArray(sentences) || sentences.length < MIN_SENTENCES || sentences.length > MAX_SENTENCES) throw bad();
  const pairs = sentences.map((pair) => {
    if (pair === null || typeof pair !== 'object') throw bad();
    const { text, translation } = pair;
    if (!isText(text) || !isText(translation) || HAS_MARKUP.test(text)) throw bad();
    if ([...translation].length > MAX_TRANSLATION || HAS_MARKUP.test(translation)) throw bad();
    return { text, translation };
  });
  const body = pairs.map((pair) => pair.text).join(' ');
  if (!isText(body) || [...body].length > MAX_BODY_LETTERS || HAS_MARKUP.test(body)) throw bad();
  const words = countWords(body);
  if (words < MIN_WORDS || words > MAX_WORDS) throw bad();
  return { title, body, sentences: pairs, questions: cleanQuestions(questions, body) };
}

// Valida las preguntas contra el texto; si algo no cumple lanza bad_output
export function cleanQuestions(questions, body) {
  const bad = () => new ProviderError('bad_output');
  if (!Array.isArray(questions) || questions.length !== QUESTIONS) throw bad();

  const text = straighten(body);
  return questions.map((item) => {
    if (item === null || typeof item !== 'object') throw bad();
    const { question, options, answer, explanation, evidence } = item;
    if (!isText(question) || !isText(explanation) || !isText(evidence)) throw bad();
    if (!Array.isArray(options) || options.length < 3 || options.length > 4 || !options.every(isText)) throw bad();
    if (new Set(options.map((option) => option.trim().toLowerCase())).size !== options.length) throw bad();
    if (!Number.isInteger(answer) || answer < 0 || answer >= options.length) throw bad();
    if (!text.includes(straighten(evidence.trim()))) throw bad();
    return { question, options, answer, explanation, evidence };
  });
}
