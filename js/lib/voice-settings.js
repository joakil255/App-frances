// Ajustes de voz guardados en el navegador. Quedan fuera de la copia de seguridad.
import { toStorageError } from './storage.js';

export const VOICE_KEY = 'app-frances-voice';

const SCHEMA_VERSION = 1;

export function createVoiceStore(backend) {
  return {
    // Nunca lanza: si falta o está dañado, valores por defecto
    load() {
      try {
        const doc = JSON.parse(backend.getItem(VOICE_KEY));
        if (!doc || doc.schemaVersion !== SCHEMA_VERSION) throw new Error('inválido');
        if (typeof doc.listenFirst !== 'boolean' || typeof doc.privacyAccepted !== 'boolean') throw new Error('inválido');
        return { listenFirst: doc.listenFirst, privacyAccepted: doc.privacyAccepted };
      } catch {
        return { listenFirst: true, privacyAccepted: false };
      }
    },

    save({ listenFirst, privacyAccepted }) {
      try {
        backend.setItem(VOICE_KEY, JSON.stringify({ schemaVersion: SCHEMA_VERSION, listenFirst, privacyAccepted }));
      } catch (error) {
        throw toStorageError(error);
      }
    },
  };
}
