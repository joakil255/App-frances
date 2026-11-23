// Capa de datos de las palabras. Hoy guarda en localStorage; todas las funciones
// devuelven promesas, como haría IndexedDB, para poder cambiarlo sin tocar el resto.
// Regla: primero se guarda y, solo si salió bien, cambia la lista en memoria.
import { validateWord } from './words.js';

export const STORAGE_KEY = 'app-frances';
const SCHEMA_VERSION = 1;

export class StorageError extends Error {
  // code: 'quota' (no hay espacio) o 'unavailable' (el navegador no deja leer o guardar)
  constructor(code, cause) {
    super(code === 'quota' ? 'No hay espacio para guardar.' : 'No se puede usar el almacenamiento.');
    this.name = 'StorageError';
    this.code = code;
    this.cause = cause;
  }
}

function toStorageError(error) {
  const isQuota = error && (error.name === 'QuotaExceededError' || error.code === 22);
  return new StorageError(isQuota ? 'quota' : 'unavailable', error);
}

export function createWordStore(backend, { initialWords, makeId = () => crypto.randomUUID(), now = () => new Date() }) {
  let words = [];

  function write(key, value) {
    try {
      backend.setItem(key, value);
    } catch (error) {
      throw toStorageError(error);
    }
  }

  // Guarda la lista completa; si falla, la lista en memoria no cambia
  function persist(nextWords) {
    write(STORAGE_KEY, JSON.stringify({ schemaVersion: SCHEMA_VERSION, words: nextWords }));
    words = nextWords;
  }

  const store = {
    // Devuelve { words, corruptBackupKey }. corruptBackupKey indica dónde se copiaron datos dañados.
    async load() {
      let raw;
      try {
        raw = backend.getItem(STORAGE_KEY);
      } catch (error) {
        throw toStorageError(error);
      }

      if (raw === null) {
        const stamp = now().toISOString();
        persist(initialWords.map((word) => ({ ...word, createdAt: stamp, updatedAt: stamp })));
        return { words: [...words], corruptBackupKey: null };
      }

      try {
        const doc = JSON.parse(raw);
        if (!doc || !Array.isArray(doc.words)) throw new Error('sin lista de palabras');
        words = doc.words;
        return { words: [...words], corruptBackupKey: null };
      } catch {
        // Datos dañados: se copian intactos aparte y se empieza con la lista vacía
        const corruptBackupKey = `${STORAGE_KEY}-corrupt-${now().toISOString()}`;
        write(corruptBackupKey, raw);
        persist([]);
        return { words: [], corruptBackupKey };
      }
    },

    getWords() {
      return [...words];
    },

    // Crea (id = null) o edita una palabra. Devuelve { ok: true, word } o { ok: false, errors }.
    async saveWord(input, id = null) {
      const { ok, errors, word } = validateWord(input, words, id);
      if (!ok) return { ok: false, errors };

      const stamp = now().toISOString();
      if (id === null) {
        const created = { id: makeId(), ...word, createdAt: stamp, updatedAt: stamp };
        persist([...words, created]);
        return { ok: true, word: created };
      }

      const existing = words.find((w) => w.id === id);
      if (!existing) return { ok: false, errors: { fr: 'Esta palabra ya no está en tu lista.' } };
      const updated = { ...existing, ...word, updatedAt: stamp };
      persist(words.map((w) => (w.id === id ? updated : w)));
      return { ok: true, word: updated };
    },

    async deleteWord(id) {
      persist(words.filter((w) => w.id !== id));
    },

    // Aplica un plan de planImport. Las duplicadas solo se tocan con replaceDuplicates.
    async applyImport(plan, { replaceDuplicates }) {
      const stamp = now().toISOString();
      const added = plan.newWords.map(({ word }) => ({ id: makeId(), ...word, createdAt: stamp, updatedAt: stamp }));
      let next = [...words, ...added];
      let replaced = 0;

      if (replaceDuplicates) {
        const byId = new Map(plan.duplicates.map((d) => [d.existingId, d.word]));
        next = next.map((w) => {
          if (!byId.has(w.id)) return w;
          replaced += 1;
          return { ...w, ...byId.get(w.id), updatedAt: stamp };
        });
      }

      persist(next);
      return { added: added.length, replaced };
    },

    // Si otra copia de la app (otra pestaña o la app instalada) guarda cambios, el navegador
    // lanza «storage» en esta: se vuelve a leer para no borrar lo que hizo la otra al guardar.
    watchExternalChanges(target, onChange) {
      target.addEventListener('storage', async (event) => {
        if (event.key !== STORAGE_KEY && event.key !== null) return; // null = se borró todo
        await store.load();
        onChange();
      });
    },
  };
  return store;
}
