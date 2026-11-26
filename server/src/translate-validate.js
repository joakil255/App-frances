import { SUPPORT_LANGS } from './story-validate.js';

const LEVELS = ['A1.1', 'A1.2', 'A2'];
const MAX_SENTENCES = 60;
const MAX_LETTERS = 600;

// Valida el cuerpo de /translate: nivel, idioma de apoyo y de 1 a 60 frases de una sola línea
export function validateTranslateInput(body) {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return { ok: false };
  const { lang, level, supportLang, sentences } = body;
  if (lang !== 'fr' || !LEVELS.includes(level) || !SUPPORT_LANGS.includes(supportLang)) return { ok: false };
  if (!Array.isArray(sentences) || sentences.length < 1 || sentences.length > MAX_SENTENCES) return { ok: false };
  const valid = sentences.every((text) => typeof text === 'string' && text.trim() !== '' && !/[\r\n]/.test(text) && [...text].length <= MAX_LETTERS);
  if (!valid) return { ok: false };
  return { ok: true, value: { lang, level, supportLang, sentences } };
}
