// Corrección de frases: pedirla al servidor y validar la respuesta. Sin DOM.
import { chatUrl, postJson } from './chat.js';
import { isSentenceError } from './build-storage.js';

// Cambia /chat por /sentence en la dirección del servidor
export function sentenceUrl(hostname) {
  return chatUrl(hostname).replace(/\/chat$/, '/sentence');
}

function isValidSentence(data) {
  return Boolean(data) && typeof data.correct === 'boolean' && typeof data.corrected === 'string'
    && Array.isArray(data.errors) && data.errors.every(isSentenceError) && typeof data.suggestion === 'string'
    && typeof data.remainingSentences === 'number';
}

// Nunca lanza: devuelve { ok: true, result } (con remaining) o { ok: false, error }
export async function sendSentence(options) {
  const sent = await postJson(options);
  if (!sent.ok) return sent;
  if (!isValidSentence(sent.data)) return { ok: false, error: 'bad_output' };
  const { correct, corrected, errors, suggestion, remainingSentences } = sent.data;
  return { ok: true, result: { correct, corrected, errors, suggestion, remaining: remainingSentences } };
}
