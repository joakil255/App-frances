// Lógica de la conversación con la IA: dirección del servidor, guardado local y envío.
// Sin DOM: la pantalla (js/screens/chat.js) pinta todo con textContent.
import { toStorageError } from './storage.js';

export const CHAT_KEY = 'app-frances-chat';
export const CHAT_CODE_KEY = 'app-frances-chat-code';
export const MAX_MESSAGE = 500;
export const PRODUCTION_CHAT_URL = 'https://app-frances-chat.app-frances-chat.workers.dev/chat'; // Worker publicado

const SCHEMA_VERSION = 1;
const LEVELS = ['A1.1', 'A1.2'];
const HISTORY_LIMIT = 20;
const LOCAL_URL = 'http://127.0.0.1:8787/chat';

export function chatUrl(hostname) {
  return hostname === '127.0.0.1' || hostname === 'localhost' ? LOCAL_URL : PRODUCTION_CHAT_URL;
}

function isValidTurn(turn) {
  return Boolean(turn) && (turn.role === 'user' || turn.role === 'assistant') && typeof turn.text === 'string';
}

export function createChatStore(backend) {
  function write(key, value) {
    try {
      backend.setItem(key, value);
    } catch (error) {
      throw toStorageError(error);
    }
  }

  return {
    // Un chat dañado no se copia aparte: se empieza vacío
    load() {
      try {
        const raw = backend.getItem(CHAT_KEY);
        if (raw === null) throw new Error('vacío');
        const doc = JSON.parse(raw);
        if (!doc || doc.schemaVersion !== SCHEMA_VERSION || !LEVELS.includes(doc.level)) throw new Error('inválido');
        if (!Array.isArray(doc.turns) || !doc.turns.every(isValidTurn)) throw new Error('inválido');
        return { level: doc.level, turns: doc.turns };
      } catch {
        return { level: 'A1.2', turns: [] };
      }
    },

    save({ level, turns }) {
      write(CHAT_KEY, JSON.stringify({ schemaVersion: SCHEMA_VERSION, level, turns }));
    },

    loadCode() {
      try {
        return backend.getItem(CHAT_CODE_KEY);
      } catch {
        return null;
      }
    },

    saveCode(code) {
      write(CHAT_CODE_KEY, code);
    },

    clearCode() {
      try {
        backend.removeItem(CHAT_CODE_KEY);
      } catch (error) {
        throw toStorageError(error);
      }
    },
  };
}

// El historial lleva solo role y text (sin correcciones), los últimos 20
export function buildRequestBody({ level, turns, message }) {
  const history = turns.slice(-HISTORY_LIMIT).map(({ role, text }) => ({ role, text }));
  return { level, history, message };
}

// Envío común al servidor (chat y consulta). Nunca lanza: devuelve { ok: true, data } o { ok: false, error }
// El Worker puede reintentar a Claude hasta 3 × 30 s: el navegador espera un poco más
export async function postJson({ url, code, body, fetch, isOnline, timeoutMs = 100000 }) {
  if (!isOnline) return { ok: false, error: 'offline' };

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${code}`, 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    if (error?.name === 'TimeoutError' || error?.name === 'AbortError') return { ok: false, error: 'unavailable' };
    return { ok: false, error: 'network' };
  }

  let data;
  try {
    data = await response.json();
  } catch {
    return { ok: false, error: 'bad_output' };
  }

  if (data && typeof data.error === 'string') return { ok: false, error: data.error };
  if (!response.ok) return { ok: false, error: 'unavailable' };
  return { ok: true, data };
}

// Nunca lanza: devuelve { ok: true, reply, corrections, remaining } o { ok: false, error }
export async function sendChat(options) {
  const sent = await postJson(options);
  if (!sent.ok) return sent;
  const { data } = sent;
  if (!data || typeof data.reply !== 'string' || !Array.isArray(data.corrections) || typeof data.remaining !== 'number') {
    return { ok: false, error: 'bad_output' };
  }
  return { ok: true, reply: data.reply, corrections: data.corrections, remaining: data.remaining };
}

// Devuelve una lista nueva; la original no se toca
export function appendExchange(turns, message, result) {
  return [...turns, { role: 'user', text: message, corrections: result.corrections }, { role: 'assistant', text: result.reply }];
}
