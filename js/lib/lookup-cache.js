// Caché local de consultas de palabras: la misma palabra en la misma frase no se pide dos veces.
// Sin DOM. Nunca lanza: si no se puede leer o guardar, se trabaja sin caché.
import { duplicateKey, normalizeText } from './words.js';

export const LOOKUP_CACHE_KEY = 'app-frances-lookups';
const SCHEMA_VERSION = 1;
const DEFAULT_MAX = 500;

function isValidEntry(entry) {
  return Boolean(entry) && typeof entry.key === 'string' && typeof entry.usedAt === 'number'
    && Boolean(entry.result) && typeof entry.result === 'object';
}

export function createLookupCache(backend, { max = DEFAULT_MAX, now = () => Date.now() } = {}) {
  const keyOf = (lang, word, sentence) => `${lang}|${duplicateKey(word)}|${normalizeText(sentence)}`;

  // Datos dañados o de otra versión: se empieza vacío
  function load() {
    try {
      const doc = JSON.parse(backend.getItem(LOOKUP_CACHE_KEY));
      if (!doc || doc.schemaVersion !== SCHEMA_VERSION || !Array.isArray(doc.entries)) return [];
      return doc.entries.every(isValidEntry) ? doc.entries : [];
    } catch {
      return [];
    }
  }

  function save(entries) {
    try {
      backend.setItem(LOOKUP_CACHE_KEY, JSON.stringify({ schemaVersion: SCHEMA_VERSION, entries }));
    } catch {
      // Sin espacio: la consulta ya se mostró, solo se pierde la caché
    }
  }

  return {
    get(lang, word, sentence) {
      const key = keyOf(lang, word, sentence);
      const entries = load();
      const entry = entries.find((item) => item.key === key);
      if (!entry) return null;
      entry.usedAt = now();
      save(entries);
      return entry.result;
    },

    set(lang, word, sentence, result) {
      const key = keyOf(lang, word, sentence);
      const entries = load().filter((item) => item.key !== key);
      entries.push({ key, usedAt: now(), result });
      // Se queda con las más recientes
      entries.sort((a, b) => b.usedAt - a.usedAt);
      save(entries.slice(0, max));
    },
  };
}
