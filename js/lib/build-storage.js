// Almacén de "Construir frases": progreso por lección y tarjetas de repaso
// (ejercicios fallados dos veces y frases propias corregidas), en su propia clave.
// Mismas reglas que el estudio: primero se guarda y, si salió bien, cambia la memoria.
import { toStorageError } from './storage.js';
import { NEW_SM2, NEW_LEITNER, review } from './scheduler.js';
import { addDays } from './dates.js';

export const BUILD_KEY = 'app-frances-build';
const SCHEMA_VERSION = 2; // la 2 suma lastPractice (opcional) a cada lección

const isObject = (v) => Boolean(v) && typeof v === 'object' && !Array.isArray(v);
const isText = (v) => typeof v === 'string' && v.length > 0;
const isDateOrNull = (v) => v === null || (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v));
const isCount = (v) => Number.isInteger(v) && v >= 0;

// Mismas reglas que validCard de backup.js para sm2 y leitner
function validSchedule({ sm2, leitner }) {
  if (!isObject(sm2) || !['reps', 'interval', 'lapses'].every((k) => isCount(sm2[k])) || !isDateOrNull(sm2.due)) return false;
  if (typeof sm2.ease !== 'number' || !Number.isFinite(sm2.ease) || sm2.ease < 1.3 || sm2.ease > 3) return false;
  return isObject(leitner) && Number.isInteger(leitner.box) && leitner.box >= 0 && leitner.box <= 5 && isDateOrNull(leitner.due);
}

// Un error corregido por Claude: un objeto con sus cuatro textos
export const isSentenceError = (error) => isObject(error)
  && ['original', 'corrected', 'kind', 'explanation'].every((k) => typeof error[k] === 'string');

function validCard(card, key) {
  if (!isObject(card) || card.id !== key || !validSchedule(card)) return false;
  if (card.kind === 'exercise') return isText(card.lessonId) && isText(card.exerciseId);
  if (card.kind === 'own') {
    return ['original', 'corrected', 'situation'].every((k) => typeof card[k] === 'string') && Array.isArray(card.errors) && card.errors.every(isSentenceError);
  }
  return false;
}

const isDateOrNullStr = (v) => v === null || typeof v === 'string';

// Fecha de calendario real «AAAA-MM-DD» (no vale 2026-02-30)
function isRealDate(v) {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const [year, month, day] = v.split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}

// Resultado de la última práctica completa: 0 ≤ firstTry ≤ total, total ≥ 1
const validLastPractice = (p) => isObject(p) && isCount(p.firstTry) && Number.isInteger(p.total) && p.total >= 1
  && p.firstTry <= p.total && isRealDate(p.date);

// Una entrada mal formada rompería recordAttempt, así que se rechaza al leer
function validLesson(lesson) {
  if (!isObject(lesson) || !isDateOrNullStr(lesson.startedAt) || !isDateOrNullStr(lesson.completedAt) || !isObject(lesson.exercises)) return false;
  if ('lastPractice' in lesson && !validLastPractice(lesson.lastPractice)) return false;
  return Object.values(lesson.exercises).every((e) => isObject(e) && isCount(e.fails) && isDateOrNullStr(e.lastCorrectAt));
}

export function validateBuildDoc(doc) {
  if (!isObject(doc) || !isObject(doc.progress) || !isObject(doc.cards)) return false;
  if (!Object.values(doc.progress).every(validLesson)) return false;
  return Object.entries(doc.cards).every(([key, card]) => validCard(card, key));
}

// De la versión 1 a la 2 no cambia ningún dato: solo el número de versión
export const migrateBuildDoc = (doc) => ({ ...doc, schemaVersion: SCHEMA_VERSION });

const emptyState = () => ({ progress: {}, cards: {} });
const exerciseCardId = (lessonId, exerciseId) => `ex:${lessonId}:${exerciseId}`;

export function createBuildStore(backend, { now = () => new Date(), makeId = () => crypto.randomUUID() } = {}) {
  let state = emptyState();

  function write(key, value) {
    try {
      backend.setItem(key, value);
    } catch (error) {
      throw toStorageError(error);
    }
  }

  function persist(next) {
    write(BUILD_KEY, JSON.stringify({ schemaVersion: SCHEMA_VERSION, ...next }));
    state = next;
  }

  const copy = () => structuredClone(state);

  const newCard = (fields, today) => ({
    ...fields,
    createdAt: now().toISOString(),
    introducedOn: today,
    lastReviewedAt: null,
    sm2: { ...NEW_SM2, due: addDays(today, 1) },
    leitner: { ...NEW_LEITNER, due: addDays(today, 1) },
  });

  const store = {
    // Devuelve { corruptBackupKey, migrationError }. migrationError (StorageError o null) avisa
    // si no se pudo guardar la versión 2: los datos siguen en memoria, como en Palabras.
    async load() {
      let raw;
      try {
        raw = backend.getItem(BUILD_KEY);
      } catch (error) {
        throw toStorageError(error);
      }
      if (raw === null) {
        persist(emptyState());
        return { corruptBackupKey: null, migrationError: null };
      }
      let doc;
      try {
        doc = JSON.parse(raw);
      } catch {
        doc = null;
      }
      // Una versión desconocida (por ejemplo, de una app más nueva) se trata como dañada
      const version = doc?.schemaVersion ?? 1;
      if ((version === 1 || version === SCHEMA_VERSION) && validateBuildDoc(doc)) {
        state = { progress: doc.progress, cards: doc.cards };
        let migrationError = null;
        if (version === 1) {
          try {
            write(BUILD_KEY, JSON.stringify(migrateBuildDoc(doc)));
          } catch (error) {
            migrationError = error; // lo guardado sigue en v1; el próximo guardado escribe la v2
          }
        }
        return { corruptBackupKey: null, migrationError };
      }
      // Datos dañados: se copian intactos aparte y se empieza de cero
      const corruptBackupKey = `${BUILD_KEY}-corrupt-${now().toISOString()}`;
      write(corruptBackupKey, raw);
      persist(emptyState());
      return { corruptBackupKey, migrationError: null };
    },

    getState: copy,

    // Anota un intento; el 2.º fallo (seguido o no) crea la tarjeta, una sola vez
    recordAttempt({ lessonId, exerciseId, correct, today }) {
      const next = copy();
      const lesson = next.progress[lessonId] ?? { startedAt: today, completedAt: null, exercises: {} };
      next.progress[lessonId] = lesson;
      lesson.startedAt ??= today;
      const entry = lesson.exercises[exerciseId] ?? { fails: 0, lastCorrectAt: null };
      lesson.exercises[exerciseId] = entry;
      if (correct) entry.lastCorrectAt = today;
      else entry.fails += 1;

      const id = exerciseCardId(lessonId, exerciseId);
      const cardCreated = !correct && entry.fails >= 2 && !next.cards[id];
      if (cardCreated) next.cards[id] = newCard({ id, kind: 'exercise', lessonId, exerciseId }, today);
      persist(next);
      return { cardCreated };
    },

    completeLesson(lessonId, today) {
      const next = copy();
      const lesson = next.progress[lessonId] ?? { startedAt: today, completedAt: null, exercises: {} };
      next.progress[lessonId] = lesson;
      if (lesson.completedAt !== null) return;
      lesson.completedAt = today;
      persist(next);
    },

    // Guarda o reemplaza el resultado de la última práctica completa de la lección.
    // Un resultado imposible no se guarda: dejaría todo el progreso como dañado al volver a abrir.
    recordPractice({ lessonId, firstTry, total, today }) {
      const lastPractice = { firstTry, total, date: today };
      if (!validLastPractice(lastPractice)) return;
      const next = copy();
      const lesson = next.progress[lessonId] ?? { startedAt: today, completedAt: null, exercises: {} };
      next.progress[lessonId] = lesson;
      lesson.lastPractice = lastPractice;
      persist(next);
    },

    addOwnCard({ situation, original, corrected, errors, today }) {
      const id = `own:${makeId()}`;
      const next = copy();
      next.cards[id] = newCard({ id, kind: 'own', situation, original, corrected, errors }, today);
      persist(next);
      return id;
    },

    // Acierto = «good», fallo = «again»; no toca los fallos del ejercicio
    reviewCard(cardId, correct, today, nowIso) {
      const card = state.cards[cardId];
      if (!card) return;
      const next = copy();
      next.cards[cardId] = review(card, correct ? 'good' : 'again', today, nowIso);
      persist(next);
    },

    // Solo se pueden borrar las frases propias
    removeCard(cardId) {
      if (state.cards[cardId]?.kind !== 'own') return;
      const next = copy();
      delete next.cards[cardId];
      persist(next);
    },

    watchExternalChanges(target, onChange) {
      target.addEventListener('storage', async (event) => {
        if (event.key !== BUILD_KEY && event.key !== null) return; // null = se borró todo
        await store.load();
        onChange();
      });
    },
  };
  return store;
}
