import { LEVELS } from './prompt.js';

const MAX_MESSAGE = 500;
const MAX_TURN = 2000;
const MAX_HISTORY = 20;

const isText = (value) => typeof value === 'string';
const letters = (text) => [...text].length;

// Valida el cuerpo de /chat y recorta la historia a los últimos 20 mensajes
export function validateChatInput(body) {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return { ok: false };
  const { level, history, message } = body;
  if (!LEVELS.includes(level)) return { ok: false };
  if (!isText(message) || message.trim() === '' || letters(message) > MAX_MESSAGE) return { ok: false };
  if (!Array.isArray(history)) return { ok: false };
  for (const turn of history) {
    if (turn === null || typeof turn !== 'object') return { ok: false };
    if (turn.role !== 'user' && turn.role !== 'assistant') return { ok: false };
    if (!isText(turn.content) || letters(turn.content) > MAX_TURN) return { ok: false };
  }
  const recent = history.slice(-MAX_HISTORY).map(({ role, content }) => ({ role, content }));
  // La conversación debe empezar con un mensaje del alumno
  while (recent.length > 0 && recent[0].role === 'assistant') recent.shift();
  return { ok: true, value: { level, history: recent, message } };
}
