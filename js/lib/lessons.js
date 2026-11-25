// Formato, validación y carga de las lecciones de «Construir frases» (funciones puras).
import { normalizeAnswer } from './answer-check.js';

export const LESSON_FORMAT = 'app-frances-leccion';
export const INDEX_FORMAT = 'app-frances-lecciones';
export const LESSON_LEVELS = ['A1', 'A2'];
export const LESSON_AREAS = ['grammar', 'syntax', 'spelling'];
export const EXERCISE_TYPES = ['order', 'gap', 'fix'];

const LESSON_ID = /^[a-z]{2}-a[12]-\d{2}$/;
const LANG_CODE = /^[a-z]{2}$/;
const TYPOGRAPHIC_APOSTROPHE = /[’‘ʼ]/;

const isString = (value) => typeof value === 'string';
const isText = (value) => isString(value) && value.trim() !== '';
const isList = (value) => Array.isArray(value);
const isTextList = (value) => isList(value) && value.length > 0 && value.every(isText);

// Revisa lo común a todos los elementos: id único, fuentes y REVISAR
function checkItem(item, label, ctx, { needSources = true } = {}) {
  const { errors, ids, sourceIds } = ctx;
  if (!item || typeof item !== 'object') {
    errors.push(`${label}: elemento inválido.`);
    return null;
  }
  const name = isText(item.id) ? item.id : label;
  if (!isText(item.id)) errors.push(`${label}: falta el id.`);
  else if (ids.has(item.id)) errors.push(`${name}: id repetido.`);
  else ids.add(item.id);

  if (!isList(item.sourceIds) || !item.sourceIds.every(isString)) {
    errors.push(`${name}: sourceIds debe ser una lista.`);
  } else {
    if (needSources && item.sourceIds.length === 0) errors.push(`${name}: falta al menos una fuente.`);
    for (const sid of item.sourceIds) {
      if (!sourceIds.has(sid)) errors.push(`${name}: la fuente «${sid}» no existe.`);
    }
  }
  if (typeof item.review !== 'boolean') errors.push(`${name}: review debe ser true o false.`);
  else if (item.review && !isText(item.reviewNote)) errors.push(`${name}: review true exige reviewNote.`);
  return name;
}

function checkTexts(item, name, fields, errors) {
  for (const field of fields) {
    if (!isText(item[field])) errors.push(`${name}: falta ${field}.`);
  }
}

function checkExercise(ex, name, errors) {
  if (!EXERCISE_TYPES.includes(ex.type)) {
    errors.push(`${name}: tipo de ejercicio desconocido.`);
    return;
  }
  checkTexts(ex, name, ['prompt', 'rule'], errors);
  if (!isTextList(ex.answers)) {
    errors.push(`${name}: answers debe ser una lista con texto.`);
    return;
  }
  if (ex.answers.some((a) => TYPOGRAPHIC_APOSTROPHE.test(a))) {
    errors.push(`${name}: las respuestas usan apóstrofo recto (').`);
  }
  const accepted = ex.answers.map(normalizeAnswer);

  if (ex.type === 'order') {
    if (!isTextList(ex.tiles)) {
      errors.push(`${name}: tiles debe ser una lista con texto.`);
      return;
    }
    if (ex.tiles.some((t) => TYPOGRAPHIC_APOSTROPHE.test(t))) errors.push(`${name}: las fichas usan apóstrofo recto (').`);
    const built = normalizeAnswer(ex.tiles.join(' '));
    // Se compara sin importar el orden de las fichas, solo que sean las mismas palabras
    const sorted = (text) => text.split(' ').sort().join(' ');
    if (!accepted.every((a) => sorted(a) === sorted(built))) {
      errors.push(`${name}: cada respuesta debe usar exactamente las fichas.`);
    }
    return;
  }

  if (ex.type === 'gap' && (!isString(ex.before) || !isString(ex.after))) errors.push(`${name}: faltan before y after.`);
  if (ex.type === 'fix') {
    if (!isText(ex.wrong)) errors.push(`${name}: falta wrong.`);
    else if (accepted.includes(normalizeAnswer(ex.wrong))) errors.push(`${name}: wrong coincide con una respuesta aceptada.`);
  }
  if (!isList(ex.mistakes)) {
    errors.push(`${name}: mistakes debe ser una lista.`);
    return;
  }
  for (const m of ex.mistakes) {
    if (!m || !isText(m.answer) || !isText(m.explanation)) {
      errors.push(`${name}: cada mistake necesita answer y explanation.`);
    } else if (accepted.includes(normalizeAnswer(m.answer))) {
      errors.push(`${name}: el mistake «${m.answer}» coincide con una respuesta aceptada.`);
    }
  }
}

export function validateLesson(lesson) {
  const errors = [];
  if (!lesson || typeof lesson !== 'object') return { ok: false, errors: ['La lección no es un objeto.'] };

  if (lesson.format !== LESSON_FORMAT) errors.push('format no es el de una lección.');
  if (lesson.version !== 1) errors.push('version no es 1.');
  if (!isString(lesson.id) || !LESSON_ID.test(lesson.id)) errors.push('id de lección inválido (ej. fr-a1-01).');
  if (!isString(lesson.lang) || !LANG_CODE.test(lesson.lang)) errors.push('lang debe ser un código de 2 letras.');
  if (!isString(lesson.explainLang) || !LANG_CODE.test(lesson.explainLang)) errors.push('explainLang debe ser un código de 2 letras.');
  if (!LESSON_LEVELS.includes(lesson.level)) errors.push('level debe ser A1 o A2.');
  if (!isText(lesson.title)) errors.push('Falta title.');
  if (!isList(lesson.areas) || lesson.areas.length === 0 || !lesson.areas.every((a) => LESSON_AREAS.includes(a))) {
    errors.push('areas debe ser una lista de grammar, syntax o spelling.');
  }

  const sources = isList(lesson.sources) ? lesson.sources : [];
  if (!isList(lesson.sources)) errors.push('sources debe ser una lista.');
  const sourceIds = new Set();
  for (const source of sources) {
    if (!source || !isText(source.id)) errors.push('Una fuente no tiene id.');
    else if (sourceIds.has(source.id)) errors.push(`${source.id}: fuente repetida.`);
    else sourceIds.add(source.id);
  }

  const ctx = { errors, ids: new Set(), sourceIds };
  const eachItem = (key, needSources, check) => {
    if (!isList(lesson[key])) {
      errors.push(`${key} debe ser una lista.`);
      return;
    }
    lesson[key].forEach((item, index) => {
      const name = checkItem(item, `${key}[${index}]`, ctx, { needSources });
      if (name && check) check(item, name);
    });
  };

  eachItem('idea', true, (i, n) => checkTexts(i, n, ['text'], errors));
  eachItem('think', true, (i, n) => checkTexts(i, n, ['source', 'target', 'note'], errors));
  eachItem('examples', false, (i, n) => checkTexts(i, n, ['text', 'translation'], errors));
  eachItem('pitfalls', true, (i, n) => checkTexts(i, n, ['wrong', 'right', 'explanation'], errors));
  eachItem('exercises', true, (i, n) => checkExercise(i, n, errors));
  eachItem('situations', true, (i, n) => {
    checkTexts(i, n, ['situation', 'focus'], errors);
    if (!isTextList(i.models)) errors.push(`${n}: models debe ser una lista con texto.`);
  });

  if (!isList(lesson.pattern)) errors.push('pattern debe ser una lista.');
  else if (!lesson.pattern.every((b) => b && isText(b.label) && isTextList(b.options))) {
    errors.push('Cada bloque de pattern necesita label y options.');
  }

  return { ok: errors.length === 0, errors };
}

// Busca un ejercicio por id; null si la lección o el ejercicio no existen
export function findExercise(lessons, lessonId, exerciseId) {
  const entry = lessons.find((l) => l.id === lessonId);
  if (!entry || !entry.lesson) return null;
  return entry.lesson.exercises.find((e) => e.id === exerciseId) ?? null;
}

export const lessonsIndexUrl = (lang) => `data/lessons/${lang}/index.json`;

// Carga el índice (si falla, lanza) y cada lección (si falla, queda marcada)
export async function loadLessons({ fetch, lang }) {
  const response = await fetch(lessonsIndexUrl(lang));
  if (!response.ok) throw new Error('No se pudo leer el índice de lecciones.');
  const index = await response.json();
  if (!index || index.format !== INDEX_FORMAT || index.version !== 1 || !isList(index.lessons)
    || !index.lessons.every(isString)) {
    throw new Error('El índice de lecciones no es válido.');
  }
  return Promise.all(index.lessons.map(async (id) => {
    let data;
    try {
      const res = await fetch(`data/lessons/${lang}/${id}.json`);
      if (!res.ok) return { id, lesson: null, error: 'missing' };
      data = await res.json();
    } catch (error) {
      // Sin conexión o archivo roto: no se distingue más
      return { id, lesson: null, error: error instanceof SyntaxError ? 'invalid' : 'missing' };
    }
    const valid = validateLesson(data).ok && data.id === id;
    return valid ? { id, lesson: data, error: null } : { id, lesson: null, error: 'invalid' };
  }));
}
