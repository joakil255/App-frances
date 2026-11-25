import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  LESSON_FORMAT, INDEX_FORMAT, validateLesson, findExercise, lessonsIndexUrl, loadLessons,
} from '../js/lib/lessons.js';

const review = { sourceIds: ['src1'], review: false };

// Lección mínima válida (se copia en cada prueba)
const makeLesson = () => ({
  format: LESSON_FORMAT,
  version: 1,
  id: 'fr-a1-99',
  lang: 'fr',
  explainLang: 'es',
  level: 'A1',
  title: 'La frase básica',
  areas: ['grammar', 'syntax'],
  sources: [{ id: 'src1', title: 'Libro', publisher: 'Editorial', year: 2020, pages: '10-12', url: 'https://example.com' }],
  idea: [{ id: 'i1', text: 'Sujeto + verbo.', ...review }],
  pattern: [{ label: 'Sujeto', options: ['je', 'tu'] }],
  think: [{ id: 't1', source: 'Tengo 20 años', target: "J'ai 20 ans", note: 'Con avoir.', ...review }],
  examples: [{ id: 'e1', text: 'Je suis là.', translation: 'Estoy aquí.', sourceIds: [], review: false }],
  pitfalls: [{ id: 'p1', wrong: 'Je suis 20 ans', right: "J'ai 20 ans", explanation: 'Edad con avoir.', ...review }],
  exercises: [
    { id: 'x1', type: 'order', prompt: 'Ordena.', tiles: ['suis', 'Je', 'là'], answers: ['Je suis là.'], rule: 'Sujeto primero.', ...review },
    {
      id: 'x2', type: 'gap', prompt: 'Completa.', before: 'Je', after: 'là.', answers: ['suis'],
      mistakes: [{ answer: 'es', explanation: 'es es de tu.' }], rule: 'je suis.', ...review,
    },
    {
      id: 'x3', type: 'fix', prompt: 'Corrige.', wrong: 'Je es là.', answers: ['Je suis là.'],
      mistakes: [{ answer: 'Je es là.', explanation: 'es no va con je.' }], rule: 'je suis.', ...review,
    },
  ],
  situations: [{ id: 's1', situation: 'Estás en casa.', models: ['Je suis là.'], focus: 'Usar je suis', ...review }],
});

const errorsOf = (mutate) => {
  const lesson = makeLesson();
  mutate(lesson);
  return validateLesson(lesson);
};

test('una lección válida pasa', () => {
  assert.deepEqual(validateLesson(makeLesson()), { ok: true, errors: [] });
});

test('lo que no es un objeto no pasa', () => {
  assert.equal(validateLesson(null).ok, false);
  assert.equal(validateLesson('x').ok, false);
});

const bad = [
  ['falta title', (l) => { delete l.title; }, 'title'],
  ['format distinto', (l) => { l.format = 'otro'; }, 'format'],
  ['lang fra', (l) => { l.lang = 'fra'; }, 'lang'],
  ['level B1', (l) => { l.level = 'B1'; }, 'level'],
  ['areas vocab', (l) => { l.areas = ['vocab']; }, 'areas'],
  ['id de lección repaso', (l) => { l.id = 'repaso'; }, 'id de lección'],
  ['id repetido', (l) => { l.exercises[1].id = 'x1'; }, 'x1'],
  ['fuente inexistente', (l) => { l.idea[0].sourceIds = ['nope']; }, 'i1'],
  ['order con fichas que no forman la respuesta', (l) => { l.exercises[0].tiles = ['Je', 'suis']; }, 'x1'],
  ['mistake igual a respuesta (gap)', (l) => { l.exercises[1].mistakes = [{ answer: 'SUIS!', explanation: 'x' }]; }, 'x2'],
  ['mistake igual a respuesta (fix)', (l) => { l.exercises[2].mistakes = [{ answer: 'JE SUIS LÀ.', explanation: 'x' }]; }, 'x3'],
  ['fix con wrong igual a respuesta', (l) => { l.exercises[2].wrong = 'je suis là'; }, 'x3'],
  ['review sin reviewNote', (l) => { l.think[0].review = true; }, 't1'],
  ['tipo desconocido', (l) => { l.exercises[0].type = 'match'; }, 'x1'],
  ['apóstrofo tipográfico', (l) => { l.exercises[0].tiles = ['J’ai', 'faim']; l.exercises[0].answers = ['J’ai faim']; }, 'x1'],
];
for (const [name, mutate, mention] of bad) {
  test(`no pasa: ${name}`, () => {
    const result = errorsOf(mutate);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => e.includes(mention)), `errores: ${result.errors.join(' | ')}`);
  });
}

test('review true con reviewNote pasa', () => {
  const result = errorsOf((l) => { l.think[0].review = true; l.think[0].reviewNote = 'Dudo.'; });
  assert.equal(result.ok, true);
});

test('findExercise devuelve el ejercicio o null', () => {
  const lesson = makeLesson();
  const lessons = [{ id: 'fr-a1-99', lesson, error: null }, { id: 'fr-a1-98', lesson: null, error: 'missing' }];
  assert.equal(findExercise(lessons, 'fr-a1-99', 'x2').type, 'gap');
  assert.equal(findExercise(lessons, 'fr-a1-99', 'zz'), null);
  assert.equal(findExercise(lessons, 'fr-a1-98', 'x1'), null);
  assert.equal(findExercise(lessons, 'otra', 'x1'), null);
});

test('lessonsIndexUrl', () => {
  assert.equal(lessonsIndexUrl('fr'), 'data/lessons/fr/index.json');
});

// fetch falso: mapa de url -> cuerpo (objeto, texto) o número de estado
function fakeFetch(files) {
  const calls = [];
  const fetch = async (url) => {
    calls.push(url);
    const file = files[url];
    if (file === undefined || typeof file === 'number') {
      return { ok: false, status: file ?? 404, json: async () => { throw new Error('sin cuerpo'); } };
    }
    return {
      ok: true,
      status: 200,
      json: async () => (typeof file === 'string' ? JSON.parse(file) : file),
    };
  };
  return { fetch, calls };
}

const indexOf = (ids) => ({ format: INDEX_FORMAT, version: 1, lang: 'fr', lessons: ids });

test('loadLessons: una válida y otra con 404, en orden del índice', async () => {
  const lesson = makeLesson();
  const { fetch, calls } = fakeFetch({
    'data/lessons/fr/index.json': indexOf(['fr-a1-99', 'fr-a1-98']),
    'data/lessons/fr/fr-a1-99.json': lesson,
  });
  const result = await loadLessons({ fetch, lang: 'fr' });
  assert.deepEqual(result, [
    { id: 'fr-a1-99', lesson, error: null },
    { id: 'fr-a1-98', lesson: null, error: 'missing' },
  ]);
  assert.ok(calls.includes('data/lessons/fr/fr-a1-98.json'));
});

test('loadLessons: JSON roto o lección inválida es invalid', async () => {
  const wrong = makeLesson();
  wrong.level = 'B1';
  const { fetch } = fakeFetch({
    'data/lessons/fr/index.json': indexOf(['fr-a1-99', 'fr-a1-98']),
    'data/lessons/fr/fr-a1-99.json': '{ roto',
    'data/lessons/fr/fr-a1-98.json': wrong,
  });
  const result = await loadLessons({ fetch, lang: 'fr' });
  assert.deepEqual(result.map((r) => [r.id, r.lesson, r.error]), [
    ['fr-a1-99', null, 'invalid'],
    ['fr-a1-98', null, 'invalid'],
  ]);
});

test('loadLessons: un id distinto al del índice es invalid', async () => {
  const lesson = makeLesson();
  const { fetch } = fakeFetch({
    'data/lessons/fr/index.json': indexOf(['fr-a1-01']),
    'data/lessons/fr/fr-a1-01.json': lesson,
  });
  const result = await loadLessons({ fetch, lang: 'fr' });
  assert.equal(result[0].error, 'invalid');
});

test('loadLessons: lanza si el índice falla', async () => {
  const wrongFormat = fakeFetch({ 'data/lessons/fr/index.json': { ...indexOf([]), format: 'otro' } });
  await assert.rejects(loadLessons({ fetch: wrongFormat.fetch, lang: 'fr' }));
  const missing = fakeFetch({});
  await assert.rejects(loadLessons({ fetch: missing.fetch, lang: 'fr' }));
  const broken = fakeFetch({ 'data/lessons/fr/index.json': '{ roto' });
  await assert.rejects(loadLessons({ fetch: broken.fetch, lang: 'fr' }));
});
