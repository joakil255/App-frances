import { ProviderError } from './errors.js';

const isText = (value) => typeof value === 'string';

// Texto comparable: minúsculas, apóstrofo recto, sin espacios ni .!? al final
function comparable(text) {
  return text.toLowerCase().replace(/[’ʼ]/g, "'").trim().replace(/[.!?]+$/, '').trim();
}

// Valida la salida del modelo y descarta correcciones que no cambian nada
export function normalizeOutput(raw) {
  const bad = () => new ProviderError('bad_output');
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) throw bad();
  const keys = Object.keys(raw);
  if (keys.length !== 2 || !keys.includes('reply') || !keys.includes('corrections')) throw bad();
  if (!isText(raw.reply) || raw.reply.trim() === '' || !Array.isArray(raw.corrections)) throw bad();

  const corrections = [];
  for (const item of raw.corrections) {
    if (item === null || typeof item !== 'object' || Object.keys(item).length !== 3) throw bad();
    const { original, corrected, explanation } = item;
    if (!isText(original) || !isText(corrected) || !isText(explanation)) throw bad();
    if (comparable(original) !== comparable(corrected)) corrections.push({ original, corrected, explanation });
  }
  return { reply: raw.reply, corrections };
}
