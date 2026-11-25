const LEVELS = ['A1.1', 'A1.2', 'A2'];
const QUIZ_LANGS = ['es', 'fr'];
export const SUPPORT_LANGS = ['es'];
export const SUPPORT_LANG_NAMES = { es: 'español' };
const MAX_TOPIC = 60;

// Valida el cuerpo de /story: nivel, tema opcional (sin saltos de línea) idioma de las preguntas e idioma de apoyo (ausente = es, para la app vieja)
export function validateStoryInput(body) {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return { ok: false };
  const { lang, level, topic, quizLang, supportLang = 'es' } = body;
  if (lang !== 'fr' || !LEVELS.includes(level) || !QUIZ_LANGS.includes(quizLang)) return { ok: false };
  if (!SUPPORT_LANGS.includes(supportLang)) return { ok: false };
  if (typeof topic !== 'string' || /[\r\n]/.test(topic) || [...topic].length > MAX_TOPIC) return { ok: false };
  return { ok: true, value: { lang, level, topic, quizLang, supportLang } };
}
