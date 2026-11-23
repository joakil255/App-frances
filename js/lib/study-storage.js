// Almacén del estudio: tarjetas, historial de repasos y ajustes, en su propia clave.
// Mismas reglas que las palabras: primero se guarda y, si salió bien, cambia la memoria.
import { toStorageError } from './storage.js';

export const STUDY_KEY = 'app-frances-study';
const SCHEMA_VERSION = 1;
export const DEFAULT_SETTINGS = Object.freeze({ algorithm: 'sm2', direction: 'fr-es', newPerDay: 10 });
const ALGORITHMS = ['sm2', 'leitner'];
const DIRECTIONS = ['fr-es', 'es-fr'];

// Devuelve { ok, errors, settings }; newPerDay puede llegar como texto del formulario
export function validateSettings(input) {
  const errors = {};
  if (!ALGORITHMS.includes(input.algorithm)) errors.algorithm = 'Elige un algoritmo.';
  if (!DIRECTIONS.includes(input.direction)) errors.direction = 'Elige una dirección.';
  const text = String(input.newPerDay ?? '').trim();
  const newPerDay = Number(text);
  if (!/^\d+$/.test(text) || newPerDay > 100) errors.newPerDay = 'Escribe un número entero entre 0 y 100.';
  const ok = Object.keys(errors).length === 0;
  return { ok, errors, settings: ok ? { algorithm: input.algorithm, direction: input.direction, newPerDay } : null };
}

function isValidDoc(doc) {
  return Boolean(doc) && typeof doc.cards === 'object' && doc.cards !== null && !Array.isArray(doc.cards)
    && Array.isArray(doc.history) && Boolean(doc.settings) && validateSettings(doc.settings).ok;
}

export function createStudyStore(backend, { now = () => new Date() } = {}) {
  let state = { cards: {}, history: [], settings: { ...DEFAULT_SETTINGS } };

  function write(key, value) {
    try {
      backend.setItem(key, value);
    } catch (error) {
      throw toStorageError(error);
    }
  }

  // Guarda todo el estado en una sola escritura; si falla, la memoria no cambia
  function persist(next) {
    write(STUDY_KEY, JSON.stringify({ schemaVersion: SCHEMA_VERSION, ...next }));
    state = next;
  }

  const copy = () => ({ cards: { ...state.cards }, history: [...state.history], settings: { ...state.settings } });
  const empty = () => ({ cards: {}, history: [], settings: { ...DEFAULT_SETTINGS } });

  const store = {
    // Devuelve { cards, history, settings, corruptBackupKey }
    async load() {
      let raw;
      try {
        raw = backend.getItem(STUDY_KEY);
      } catch (error) {
        throw toStorageError(error);
      }

      if (raw === null) {
        persist(empty());
        return { ...copy(), corruptBackupKey: null };
      }

      let doc;
      try {
        doc = JSON.parse(raw);
      } catch {
        doc = null;
      }
      if (isValidDoc(doc)) {
        state = { cards: doc.cards, history: doc.history, settings: validateSettings(doc.settings).settings };
        return { ...copy(), corruptBackupKey: null };
      }

      // Datos dañados: se copian intactos aparte y se empieza de cero
      const corruptBackupKey = `${STUDY_KEY}-corrupt-${now().toISOString()}`;
      write(corruptBackupKey, raw);
      persist(empty());
      return { ...copy(), corruptBackupKey };
    },

    getState() {
      return copy();
    },

    // Guarda la tarjeta repasada y su entrada del historial juntas
    async recordReview(card, entry) {
      persist({
        cards: { ...state.cards, [card.id]: card },
        history: [...state.history, entry],
        settings: state.settings,
      });
    },

    // Devuelve { ok: true } o { ok: false, errors }
    async saveSettings(input) {
      const { ok, errors, settings } = validateSettings(input);
      if (!ok) return { ok: false, errors };
      persist({ ...state, settings });
      return { ok: true };
    },

    // Si otra copia de la app guarda el estudio, se vuelve a leer
    watchExternalChanges(target, onChange) {
      target.addEventListener('storage', async (event) => {
        if (event.key !== STUDY_KEY && event.key !== null) return; // null = se borró todo
        await store.load();
        onChange();
      });
    },
  };
  return store;
}
