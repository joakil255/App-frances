// Almacén de los textos de lectura (historias). Mismo patrón que storage.js:
// primero se guarda y, solo si salió bien, cambia la lista en memoria.
import { toStorageError } from './storage.js';
import { normalizeText } from './words.js';

export const TEXTS_KEY = 'app-frances-texts';
const SCHEMA_VERSION = 1;
export const TEXT_LEVELS = ['A1.1', 'A1.2', 'A2'];
export const QUIZ_LANGS = ['es', 'fr'];
const TEXT_LANGS = ['fr'];
const TEXT_STATUSES = ['review', 'approved'];
export const SUPPORT_LANGS = ['es'];
export const MAX_SENTENCES = 60;
export const MAX_SENTENCE_LETTERS = 600;
const QUESTION_COUNT = 4;
const TITLE_MAX = 80;
const BODY_MAX = 3000;

export const GENERATED_SOURCE = {
  kind: 'generated',
  name: 'Claude (Anthropic)',
  license: 'Historia original generada para uso personal',
};

// Misma comparación que el servidor: sin mayúsculas y con apóstrofos tipográficos (’ ‘ ʼ) como '
export const evidenceKey = (value) => normalizeText(value).toLowerCase().replace(/[’‘ʼ]/g, "'");

const letters = (value) => [...normalizeText(value)].length;
const isString = (value) => typeof value === 'string';
const isIsoDate = (value) => isString(value) && !Number.isNaN(Date.parse(value));

function questionError(q, bodyKey) {
  if (!q || typeof q !== 'object') return 'Pregunta inválida.';
  if (!isString(q.question) || letters(q.question) === 0) return 'Falta el enunciado.';
  if (!Array.isArray(q.options) || q.options.length < 3 || q.options.length > 4) return 'Debe tener 3 o 4 opciones.';
  if (!q.options.every((o) => isString(o) && letters(o) > 0)) return 'Hay opciones vacías.';
  // Igual que el servidor (trim y minúsculas): la app nunca es más estricta que él
  if (new Set(q.options.map((o) => o.trim().toLowerCase())).size !== q.options.length) return 'Hay opciones repetidas.';
  if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.options.length) return 'La respuesta no es válida.';
  if (!isString(q.explanation) || letters(q.explanation) === 0) return 'Falta la explicación.';
  if (!isString(q.evidence) || letters(q.evidence) === 0) return 'Falta la frase de evidencia.';
  if (!bodyKey.includes(evidenceKey(q.evidence))) return 'La evidencia no está en el texto.';
  return null;
}

const stripSpaces = (value) => value.normalize('NFC').replace(/\s+/g, '');

// Las frases, unidas y sin ningún espacio, deben ser el texto sin ningún espacio
export function sentencesMatchBody(sentences, body) {
  return stripSpaces(sentences.join('')) === stripSpaces(body);
}

// true si la historia o su traducción siguen pendientes de revisar
export const needsReview = (text) => text.status === 'review' || text.translation?.status === 'review';

const sentenceListOk = (list) => Array.isArray(list) && list.length >= 1 && list.length <= MAX_SENTENCES
  && list.every((s) => isString(s) && letters(s) > 0 && letters(s) <= MAX_SENTENCE_LETTERS);

// Recorta los bordes de cada frase; lo que no sea lista queda igual para que validateText lo rechace
const trimAll = (list) => (Array.isArray(list) ? list.map((s) => (isString(s) ? s.normalize('NFC').trim() : s)) : list);
const cleanTranslation = (t) => (t && typeof t === 'object' ? { ...t, sentences: trimAll(t.sentences) } : t);

function quizResultError(result) {
  if (result === null) return null;
  const valid = result && typeof result === 'object'
    && Number.isInteger(result.correct) && Number.isInteger(result.total)
    && result.total >= 1 && result.correct >= 0 && result.correct <= result.total;
  return valid ? null : 'El resultado no es válido.';
}

// Devuelve { ok, errors }; errors tiene un mensaje por campo inválido
export function validateText(text) {
  const errors = {};
  if (!text || typeof text !== 'object') return { ok: false, errors: { text: 'Texto inválido.' } };

  if (!TEXT_LANGS.includes(text.lang)) errors.lang = 'Idioma no permitido.';
  if (!TEXT_LEVELS.includes(text.level)) errors.level = 'Nivel no permitido.';
  const titleLength = isString(text.title) ? letters(text.title) : 0;
  if (titleLength < 1 || titleLength > TITLE_MAX) errors.title = `El título debe tener de 1 a ${TITLE_MAX} letras.`;
  const bodyLength = isString(text.body) ? letters(text.body) : 0;
  if (bodyLength < 1 || bodyLength > BODY_MAX) errors.body = `El texto debe tener de 1 a ${BODY_MAX} letras.`;
  if (!TEXT_STATUSES.includes(text.status)) errors.status = 'Estado no permitido.';
  if (!text.source || !isString(text.source.license) || letters(text.source.license) === 0
    || !isString(text.source.name) || letters(text.source.name) === 0) {
    errors.source = 'Falta el nombre o la licencia del origen.';
  }
  if (!isIsoDate(text.createdAt)) errors.createdAt = 'La fecha de creación no es válida.';
  if (!isIsoDate(text.updatedAt)) errors.updatedAt = 'La fecha de cambio no es válida.';

  const quiz = text.quiz;
  if (!quiz || typeof quiz !== 'object' || !QUIZ_LANGS.includes(quiz.lang)
    || !Array.isArray(quiz.questions) || quiz.questions.length !== QUESTION_COUNT) {
    errors.quiz = `El cuestionario debe tener ${QUESTION_COUNT} preguntas.`;
  } else {
    const bodyKey = evidenceKey(isString(text.body) ? text.body : '');
    const found = quiz.questions.map((q) => questionError(q, bodyKey)).findIndex((e) => e !== null);
    if (found !== -1) errors.quiz = `Pregunta ${found + 1}: ${questionError(quiz.questions[found], bodyKey)}`;
  }

  if (text.sentences !== undefined) {
    if (!sentenceListOk(text.sentences) || !isString(text.body) || !sentencesMatchBody(text.sentences, text.body)) {
      errors.sentences = 'Las frases no coinciden con el texto.';
    }
  }
  if (text.translation !== undefined) {
    const t = text.translation;
    const valid = t && typeof t === 'object' && SUPPORT_LANGS.includes(t.lang) && TEXT_STATUSES.includes(t.status)
      && Array.isArray(text.sentences) && sentenceListOk(t.sentences) && t.sentences.length === text.sentences.length;
    if (!valid) errors.translation = 'La traducción no es válida.';
  }

  if (quizResultError(text.quizResult ?? null)) errors.quizResult = 'El resultado no es válido.';
  return { ok: Object.keys(errors).length === 0, errors };
}

export function createTextStore(backend, { makeId = () => crypto.randomUUID(), now = () => new Date() } = {}) {
  let texts = []; // el más nuevo primero

  function write(key, value) {
    try {
      backend.setItem(key, value);
    } catch (error) {
      throw toStorageError(error);
    }
  }

  function persist(nextTexts) {
    write(TEXTS_KEY, JSON.stringify({ schemaVersion: SCHEMA_VERSION, texts: nextTexts }));
    texts = nextTexts;
  }

  // Cambia un texto y lo guarda. Devuelve el texto nuevo, o null si el id no existe.
  function update(id, change) {
    const existing = texts.find((t) => t.id === id);
    if (!existing) return null;
    const updated = { ...existing, ...change, updatedAt: now().toISOString() };
    persist(texts.map((t) => (t.id === id ? updated : t)));
    return updated;
  }

  const store = {
    // Devuelve { texts, corruptBackupKey }. Si los datos están dañados, se copian aparte.
    async load() {
      let raw;
      try {
        raw = backend.getItem(TEXTS_KEY);
      } catch (error) {
        throw toStorageError(error);
      }
      if (raw === null) {
        texts = [];
        return { texts: [], corruptBackupKey: null };
      }
      try {
        const doc = JSON.parse(raw);
        if (!doc || !Array.isArray(doc.texts)) throw new Error('sin lista de textos');
        texts = doc.texts;
      } catch {
        const corruptBackupKey = `${TEXTS_KEY}-corrupt-${now().toISOString()}`;
        write(corruptBackupKey, raw);
        persist([]);
        return { texts: [], corruptBackupKey };
      }
      return { texts: store.getTexts(), corruptBackupKey: null };
    },

    // De más nuevo a más viejo; con la misma fecha, el agregado después va primero
    getTexts() {
      return texts
        .map((text, index) => ({ text, index }))
        .sort((a, b) => b.text.createdAt.localeCompare(a.text.createdAt) || a.index - b.index)
        .map(({ text }) => text);
    },

    getText(id) {
      return texts.find((t) => t.id === id) ?? null;
    },

    // Devuelve { ok: true, text } o { ok: false, errors }. Siempre queda en revisión.
    async addText(input) {
      const stamp = now().toISOString();
      const text = {
        id: makeId(),
        lang: input?.lang,
        title: isString(input?.title) ? normalizeText(input.title) : input?.title,
        body: isString(input?.body) ? input.body.normalize('NFC').trim() : input?.body,
        level: input?.level,
        status: 'review',
        readAt: null,
        source: input?.source,
        topic: isString(input?.topic) ? normalizeText(input.topic) : '',
        quiz: input?.quiz,
        quizResult: null,
        createdAt: stamp,
        updatedAt: stamp,
      };
      if (input?.sentences !== undefined) text.sentences = trimAll(input.sentences);
      if (input?.translation !== undefined) text.translation = cleanTranslation(input.translation);
      const { ok, errors } = validateText(text);
      if (!ok) return { ok: false, errors };
      persist([text, ...texts]);
      return { ok: true, text };
    },

    async approve(id) {
      const translation = store.getText(id)?.translation;
      return update(id, translation ? { status: 'approved', translation: { ...translation, status: 'approved' } } : { status: 'approved' });
    },

    // Agrega frases y traducción a una historia. La traducción nueva queda en revisión.
    // Devuelve null (sin guardar) si el id no existe o el resultado no valida.
    async addTranslation(id, { sentences, translation }) {
      const existing = store.getText(id);
      if (!existing) return null;
      const candidate = { ...existing, sentences: trimAll(sentences), translation: cleanTranslation(translation) };
      if (!validateText(candidate).ok) return null;
      return update(id, { sentences: candidate.sentences, translation: candidate.translation });
    },

    async approveTranslation(id) {
      const translation = store.getText(id)?.translation;
      if (!translation) return null;
      return update(id, { translation: { ...translation, status: 'approved' } });
    },

    async discardTranslation(id) {
      const existing = store.getText(id);
      if (!existing) return null;
      const updated = { ...existing, updatedAt: now().toISOString() };
      delete updated.sentences;
      delete updated.translation;
      persist(texts.map((t) => (t.id === id ? updated : t)));
      return updated;
    },

    async markRead(id) {
      return update(id, { readAt: now().toISOString() });
    },

    // Reemplaza el resultado anterior. Devuelve null si el id no existe o los números no valen.
    async saveQuizResult(id, { correct, total }) {
      const quizResult = { correct, total, at: now().toISOString() };
      if (quizResultError(quizResult)) return null;
      return update(id, { quizResult });
    },

    async deleteText(id) {
      if (!texts.some((t) => t.id === id)) return;
      persist(texts.filter((t) => t.id !== id));
    },

    // Si otra pestaña guarda cambios, se vuelve a leer para no pisarlos
    watchExternalChanges(target, onChange) {
      target.addEventListener('storage', async (event) => {
        if (event.key !== TEXTS_KEY && event.key !== null) return;
        await store.load();
        onChange();
      });
    },
  };
  return store;
}
