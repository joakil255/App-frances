const WORD_PATTERN = /^[\p{L}'’-]{1,40}$/u;
const MAX_SENTENCE = 1000;

// Minúsculas y apóstrofo recto, para comparar sin distinguir el tipo
export const straighten = (text) => text.toLowerCase().replace(/[’‘ʼ]/g, "'");

// Valida el cuerpo de /lookup: una palabra y la frase donde aparece
export function validateLookupInput(body) {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return { ok: false };
  const { lang, word, sentence } = body;
  if (lang !== 'fr') return { ok: false };
  if (typeof word !== 'string' || !WORD_PATTERN.test(word)) return { ok: false };
  if (typeof sentence !== 'string' || sentence.trim() === '' || [...sentence].length > MAX_SENTENCE) return { ok: false };
  if (!straighten(sentence).includes(straighten(word))) return { ok: false };
  return { ok: true, value: { lang, word, sentence } };
}
