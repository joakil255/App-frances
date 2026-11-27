import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatDay, lessonState, nextLesson, lessonNumber, routeRows, openableLesson, continueLabel } from '../js/lib/lesson-route.js';

const lesson = (n) => ({ exercises: Array.from({ length: n }, (_, i) => ({ id: `x${i + 1}` })) });
const done = (n) => Object.fromEntries(Array.from({ length: n }, (_, i) => [`x${i + 1}`, { lastCorrectAt: 'd' }]));
const avail = (id, n = 2) => ({ id, status: 'available', lesson: lesson(n), error: null });
const planned = (id) => ({ id, status: 'planned', lesson: null, error: null });
const broken = (id) => ({ id, status: 'available', lesson: null, error: 'missing' });

test('formatDay pasa AAAA-MM-DD a DD/MM/AAAA', () => {
  assert.equal(formatDay('2026-11-25'), '25/11/2026');
  assert.equal(formatDay('2026-01-05'), '05/01/2026');
});

test('lessonState: planned, error y new', () => {
  assert.deepEqual(lessonState(planned('p'), undefined), { kind: 'planned', text: 'Próximamente' });
  assert.deepEqual(lessonState(broken('b'), undefined), { kind: 'error', text: 'No se pudo cargar' });
  assert.deepEqual(lessonState(avail('a'), undefined), { kind: 'new', text: 'Sin empezar' });
});

test('lessonState: started usa correct y total', () => {
  const progress = { startedAt: '2026-11-20', exercises: done(1) };
  assert.deepEqual(lessonState(avail('a'), progress), { kind: 'started', text: 'En curso: 1 de 2' });
  assert.deepEqual(lessonState(avail('a'), { startedAt: '2026-11-20', exercises: {} }), { kind: 'started', text: 'En curso: 0 de 2' });
});

test('lessonState: done con lastPractice', () => {
  const progress = { startedAt: 's', completedAt: '2026-11-24', exercises: done(2), lastPractice: { firstTry: 8, total: 10, date: '2026-11-25' } };
  assert.deepEqual(lessonState(avail('a'), progress), { kind: 'done', text: 'Completada · 8 de 10 a la primera · 25/11/2026' });
});

test('lessonState: done sin lastPractice usa completedAt', () => {
  const progress = { startedAt: 's', completedAt: '2026-11-24', exercises: done(2) };
  assert.deepEqual(lessonState(avail('a'), progress), { kind: 'done', text: 'Completada · 24/11/2026' });
});

test('nextLesson salta completadas, planificadas y rotas', () => {
  const entries = [avail('a'), broken('b'), planned('c'), avail('d'), avail('e')];
  const map = { a: { startedAt: 's', exercises: done(2) } };
  assert.equal(nextLesson(entries, map).id, 'd');
});

test('nextLesson devuelve null si todo está completo o vacío', () => {
  const entries = [avail('a'), planned('c')];
  assert.equal(nextLesson(entries, { a: { startedAt: 's', exercises: done(2) } }), null);
  assert.equal(nextLesson([], {}), null);
  assert.equal(nextLesson([planned('c')], {}), null);
});

test('lessonNumber cuenta desde 1 e incluye planificadas', () => {
  const entries = [avail('a'), planned('b'), avail('c')];
  assert.equal(lessonNumber(entries, 'a'), 1);
  assert.equal(lessonNumber(entries, 'c'), 3);
  assert.equal(lessonNumber(entries, 'zz'), 0);
});

test('lessonNumber con el índice real: fr-a2-01 es la 16', async () => {
  const { readFile } = await import('node:fs/promises');
  const index = JSON.parse(await readFile(new URL('../data/lessons/fr/index.json', import.meta.url), 'utf8'));
  assert.equal(lessonNumber(index.lessons, 'fr-a2-01'), 16);
});

test('lessonState: done sin lastPractice ni fecha (null o ausente) dice solo «Completada»', () => {
  const base = { startedAt: 's', exercises: done(2) };
  assert.deepEqual(lessonState(avail('a'), { ...base, completedAt: null }), { kind: 'done', text: 'Completada' });
  assert.deepEqual(lessonState(avail('a'), { ...base, completedAt: undefined }), { kind: 'done', text: 'Completada' });
  assert.deepEqual(lessonState(avail('a'), base), { kind: 'done', text: 'Completada' });
});

test('formatDay devuelve vacío si no es texto', () => {
  assert.equal(formatDay(null), '');
  assert.equal(formatDay(undefined), '');
});

// --- Filas de la ruta (lo que dibuja #/construir) ---
const titled = (entry, title, level = 'A1') => ({ ...entry, level, title, lesson: entry.lesson && { ...entry.lesson, title } });
const routeEntries = () => [
  titled(avail('fr-a1-01'), 'Uno'), titled(avail('fr-a1-02'), 'Dos'), titled(broken('fr-a1-03'), 'Tres'),
  titled(planned('fr-a1-04'), 'Cuatro'), titled(planned('fr-a2-01'), 'Cinco', 'A2'),
];

test('routeRows: una fila por entrada, en orden, con número, nivel, título y estado', () => {
  const rows = routeRows(routeEntries(), { 'fr-a1-01': { startedAt: 's', exercises: done(2) } });
  assert.deepEqual(rows.map((r) => [r.id, r.number, r.level, r.title, r.kind, r.stateText]), [
    ['fr-a1-01', 1, 'A1', 'Uno', 'done', 'Completada'],
    ['fr-a1-02', 2, 'A1', 'Dos', 'new', 'Sin empezar'],
    ['fr-a1-03', 3, 'A1', 'Tres', 'error', 'No se pudo cargar'],
    ['fr-a1-04', 4, 'A1', 'Cuatro', 'planned', 'Próximamente'],
    ['fr-a2-01', 5, 'A2', 'Cinco', 'planned', 'Próximamente'],
  ]);
});

test('routeRows: solo las disponibles y cargadas tienen href; las planificadas y rotas, null', () => {
  const rows = routeRows(routeEntries(), {});
  assert.deepEqual(rows.map((r) => r.href), ['#/construir/fr-a1-01', '#/construir/fr-a1-02', null, null, null]);
});

test('routeRows: exactamente una fila current, la siguiente pendiente; ninguna si todo está completo', () => {
  const some = routeRows(routeEntries(), { 'fr-a1-01': { startedAt: 's', exercises: done(2) } });
  assert.deepEqual(some.filter((r) => r.current).map((r) => r.id), ['fr-a1-02']);
  const all = routeRows(routeEntries(), { 'fr-a1-01': { startedAt: 's', exercises: done(2) }, 'fr-a1-02': { startedAt: 's', exercises: done(2) } });
  assert.equal(all.filter((r) => r.current).length, 0);
  assert.deepEqual(routeRows([], {}), []);
});

test('routeRows con el índice real: la numeración sigue en A2 (fr-a2-01 es la 16) y las planificadas no tienen href', async () => {
  const { readFile } = await import('node:fs/promises');
  const index = JSON.parse(await readFile(new URL('../data/lessons/fr/index.json', import.meta.url), 'utf8'));
  const entries = index.lessons.map((entry) => ({ ...entry, lesson: null, error: null }));
  const rows = routeRows(entries, {});
  assert.equal(rows.length, 24);
  const a2 = rows.find((r) => r.id === 'fr-a2-01');
  assert.equal(a2.number, 16);
  assert.equal(a2.level, 'A2');
  assert.equal(rows.filter((r) => r.kind === 'planned' && r.href === null).length, index.lessons.filter((e) => e.status === 'planned').length);
});

test('routeRows: hasReview es true si algún elemento de la lección tiene review: true', () => {
  const entries = routeEntries();
  entries[0].lesson.pitfalls = [{ review: false }, { review: true }];
  entries[1].lesson.examples = [{ review: false }];
  const rows = routeRows(entries, {});
  assert.deepEqual(rows.map((r) => r.hasReview), [true, false, false, false, false]);
});

test('routeRows: hasReview con una lección real que tiene partes REVISAR (fr-a1-03)', async () => {
  const { readFile } = await import('node:fs/promises');
  const real = JSON.parse(await readFile(new URL('../data/lessons/fr/fr-a1-03.json', import.meta.url), 'utf8'));
  const [row] = routeRows([{ id: real.id, level: 'A1', title: real.title, status: 'available', lesson: real, error: null }], {});
  assert.equal(row.hasReview, true);
});

test('openableLesson: devuelve la entrada disponible y cargada; null si es planificada, desconocida o rota', () => {
  const entries = routeEntries();
  assert.equal(openableLesson(entries, 'fr-a1-01'), entries[0]);
  assert.equal(openableLesson(entries, 'fr-a1-04'), null); // planificada
  assert.equal(openableLesson(entries, 'fr-a1-03'), null); // no se pudo cargar
  assert.equal(openableLesson(entries, 'xx-a1-99'), null); // desconocida
  assert.equal(openableLesson([], 'fr-a1-01'), null);
});

test('openableLesson con el índice real: fr-a1-10 (planificada) no se abre', async () => {
  const { readFile } = await import('node:fs/promises');
  const index = JSON.parse(await readFile(new URL('../data/lessons/fr/index.json', import.meta.url), 'utf8'));
  assert.equal(openableLesson(index.lessons.map((entry) => ({ ...entry, lesson: null })), 'fr-a1-10'), null);
});

test('continueLabel: «Continuar: Lección N · Título» de la siguiente pendiente, o null', () => {
  const entries = [...Array.from({ length: 6 }, (_, i) => titled(avail(`fr-a1-0${i + 1}`), `L${i + 1}`)), titled(avail('fr-a1-07'), 'Los adjetivos')];
  const map = Object.fromEntries(entries.slice(0, 6).map((e) => [e.id, { startedAt: 's', exercises: done(2) }]));
  assert.equal(continueLabel(entries, map), 'Continuar: Lección 7 · Los adjetivos');
  map['fr-a1-07'] = { startedAt: 's', exercises: done(2) };
  assert.equal(continueLabel(entries, map), null);
  assert.equal(continueLabel([], {}), null);
});
