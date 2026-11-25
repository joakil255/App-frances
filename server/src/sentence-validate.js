const LEVELS = ['A1', 'A2'];
const MAX_TEXT = 300;

const isText = (value) => typeof value === 'string' && value.trim() !== '' && [...value].length <= MAX_TEXT;

// Valida el cuerpo de /sentence: situación, foco y la frase del usuario (una sola línea)
export function validateSentenceInput(body) {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return { ok: false };
  const { lang, explainLang, level, situation, focus, sentence } = body;
  if (lang !== 'fr' || explainLang !== 'es' || !LEVELS.includes(level)) return { ok: false };
  if (!isText(situation) || !isText(focus) || !isText(sentence) || /[\r\n]/.test(sentence)) return { ok: false };
  return { ok: true, value: { lang, explainLang, level, situation, focus, sentence } };
}
