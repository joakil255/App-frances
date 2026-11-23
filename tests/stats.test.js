import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PROGRESS_DAYS, ACCURACY_DAYS, MASTERED_DAYS,
  studiedDates, anchorDate, streak, dailyCounts, accuracy, dayLabel, chartSummary,
} from '../js/lib/stats.js';
import { addDays } from '../js/lib/dates.js';

// Historiales simulados: hoy = lunes 2026-11-23 salvo que se diga otra cosa
const TODAY = '2026-11-23';
const study = (date, answer = 'good') => ({
  at: `${date}T10:00:00.000Z`, date, cardId: 'w1:fr-es', wordId: 'w1', direction: 'fr-es', answer, algorithm: 'sm2',
});
const quiz = (date, correct = true) => ({
  kind: 'quiz', at: `${date}T11:00:00.000Z`, date, wordId: 'w1', mode: 'choice', correct, accentOnly: false,
});
// Una entrada de Estudiar por día durante n días desde «from»
const run = (from, n) => Array.from({ length: n }, (_, i) => study(addDays(from, i)));
const counts = (history, today = TODAY) => dailyCounts(history, today).map((d) => d.count);

test('constantes del diseño', () => {
  assert.equal(PROGRESS_DAYS, 14);
  assert.equal(ACCURACY_DAYS, 30);
  assert.equal(MASTERED_DAYS, 14);
});

test('P1: sin datos', () => {
  assert.deepEqual(studiedDates([]), []);
  assert.deepEqual(streak([], TODAY), { days: 0, studiedToday: false });
  const days = dailyCounts([], TODAY);
  assert.equal(days.length, 14);
  assert.ok(days.every((d) => d.count === 0));
  assert.equal(days[0].date, '2026-11-10');
  assert.equal(days.at(-1).date, '2026-11-23');
  assert.deepEqual(accuracy([], TODAY), {
    study: { correct: 0, total: 0, percent: null },
    quiz: { correct: 0, total: 0, percent: null },
  });
});

test('P2: un solo día, hoy, con 3 respuestas', () => {
  const history = [study(TODAY), study(TODAY), study(TODAY)];
  assert.deepEqual(streak(history, TODAY), { days: 1, studiedToday: true });
  assert.deepEqual(counts(history), [...Array(13).fill(0), 3]);
});

test('P3: un solo día, ayer: la mañana no rompe la racha', () => {
  assert.deepEqual(streak([study('2026-11-22')], TODAY), { days: 1, studiedToday: false });
});

test('P4: racha de 7 días hasta hoy', () => {
  assert.deepEqual(streak(run('2026-11-17', 7), TODAY), { days: 7, studiedToday: true });
});

test('P5: racha de 7 días hasta ayer', () => {
  assert.deepEqual(streak(run('2026-11-16', 7), TODAY), { days: 7, studiedToday: false });
});

test('P6: racha rota por dos días sin estudiar cuenta solo lo último', () => {
  const history = [...run('2026-11-13', 7), study('2026-11-22'), study(TODAY)];
  assert.equal(streak(history, TODAY).days, 2);
});

test('P7: racha rota: el último estudio fue anteayer', () => {
  assert.deepEqual(streak([study('2026-11-21')], TODAY), { days: 0, studiedToday: false });
});

test('P8: cambio de mes (octubre → noviembre)', () => {
  const today = '2026-11-02';
  const history = ['2026-10-30', '2026-10-31', '2026-11-01', today].map((d) => study(d));
  assert.equal(streak(history, today).days, 4);
  const days = dailyCounts(history, today);
  assert.equal(days[0].date, '2026-10-20');
  const dates = days.map((d) => d.date);
  assert.equal(new Set(dates).size, 14);
  for (let i = 1; i < dates.length; i += 1) assert.equal(dates[i], addDays(dates[i - 1], 1));
  assert.equal(dates[dates.indexOf('2026-10-31') + 1], '2026-11-01');
  assert.deepEqual(counts(history, today), [...Array(10).fill(0), 1, 1, 1, 1]);
});

test('P9: febrero y cambio de año', () => {
  const feb = ['2027-02-27', '2027-02-28', '2027-03-01'].map((d) => study(d));
  assert.equal(streak(feb, '2027-03-01').days, 3);
  const year = ['2026-12-30', '2026-12-31', '2027-01-01'].map((d) => study(d));
  assert.equal(streak(year, '2027-01-01').days, 3);
  assert.deepEqual(counts(year, '2027-01-01').slice(-3), [1, 1, 1]);
});

test('P10: zona horaria: respuestas con fecha de mañana', () => {
  const history = run('2026-11-20', 5); // del 20 al 24
  assert.equal(anchorDate(history, TODAY), '2026-11-24');
  assert.deepEqual(streak(history, TODAY), { days: 5, studiedToday: true });
  assert.equal(dailyCounts(history, TODAY).at(-1).date, '2026-11-24');
});

test('P10b: reloj mal puesto: una fecha a meses en el futuro no mueve el ancla', () => {
  const history = [...run('2026-11-17', 7), quiz('2027-06-01', false)];
  assert.equal(anchorDate(history, TODAY), TODAY);
  assert.equal(streak(history, TODAY).days, 7);
  assert.equal(dailyCounts(history, TODAY).at(-1).date, TODAY);
  assert.deepEqual(accuracy(history, TODAY).quiz, { correct: 0, total: 0, percent: null });
});

test('P11: varias respuestas el mismo día (Estudiar y Quiz) cuentan un solo día', () => {
  const history = [study(TODAY), study(TODAY), quiz(TODAY), quiz(TODAY), quiz(TODAY, false)];
  assert.deepEqual(studiedDates(history), [TODAY]);
  assert.equal(counts(history).at(-1), 5);
  assert.equal(streak(history, TODAY).days, 1);
});

test('P12: entradas sin fecha válida se ignoran', () => {
  const bad = [undefined, '', '23-11-2026', '2026-11-23T10:00'].map((date) => ({ ...study(TODAY), date }));
  const { date, ...noDate } = study(TODAY);
  assert.equal(date, TODAY);
  const history = [...bad, noDate, { ...quiz(TODAY), date: 20261123 }];
  assert.deepEqual(studiedDates(history), []);
  assert.deepEqual(streak(history, TODAY), { days: 0, studiedToday: false });
  assert.deepEqual(counts(history), Array(14).fill(0));
  assert.deepEqual(accuracy(history, TODAY), {
    study: { correct: 0, total: 0, percent: null },
    quiz: { correct: 0, total: 0, percent: null },
  });
});

test('studiedDates: ordenadas de más antigua a más reciente y sin repetir', () => {
  const history = [study('2026-11-20'), study('2026-11-18'), quiz('2026-11-20')];
  assert.deepEqual(studiedDates(history), ['2026-11-18', '2026-11-20']);
});

test('P13: acierto de los últimos 30 días, Estudiar y Quiz por separado', () => {
  const inside = '2026-10-25'; // ancla − 29
  const history = [
    study(inside, 'again'), study(inside, 'hard'), study(inside, 'good'), study(inside, 'easy'),
    study('2026-10-24', 'again'), // fuera de la ventana
    quiz(TODAY, true), quiz(TODAY, false), quiz(TODAY, true),
  ];
  assert.deepEqual(accuracy(history, TODAY), {
    study: { correct: 3, total: 4, percent: 75 },
    quiz: { correct: 2, total: 3, percent: 66 },
  });
});

test('P13: el porcentaje se redondea hacia abajo (nunca 100 % con un fallo)', () => {
  const history = [...Array(199).fill(study(TODAY, 'good')), study(TODAY, 'again')];
  assert.equal(accuracy(history, TODAY).study.percent, 99);
});

test('P14: historial grande (20 000 respuestas en un año)', () => {
  const history = [];
  for (let i = 0; i < 20000; i += 1) {
    const date = addDays(TODAY, -(i % 365));
    history.push(i % 3 === 0 ? quiz(date, i % 2 === 0) : study(date, i % 5 === 0 ? 'again' : 'good'));
  }
  const start = performance.now();
  const result = streak(history, TODAY);
  const days = dailyCounts(history, TODAY);
  accuracy(history, TODAY);
  const elapsed = performance.now() - start;
  assert.equal(result.days, 365);
  const expected = history.filter((e) => e.date >= '2026-11-10').length;
  assert.equal(days.reduce((sum, d) => sum + d.count, 0), expected);
  assert.ok(elapsed < 200, `tardó ${elapsed} ms`);
});

test('dayLabel: «hoy» o la inicial del día de la semana', () => {
  assert.equal(dayLabel('2026-11-23', TODAY), 'hoy');
  assert.equal(dayLabel('2026-11-22', TODAY), 'D');
  assert.equal(dayLabel('2026-11-17', TODAY), 'M');
  assert.equal(dayLabel('2026-11-18', TODAY), 'X');
  assert.equal(dayLabel('2026-11-24', TODAY), 'M');
});

test('chartSummary: resumen del gráfico con singular y plural', () => {
  const days = dailyCounts([], TODAY).map((d, i) => ({ ...d, count: i < 9 ? [20, 20, 20, 20, 20, 20, 20, 10, 6][i] : 0 }));
  assert.equal(chartSummary(days),
    'Respuestas por día en los últimos 14 días: estudiaste 9 de 14 días, 156 respuestas en total.');
  const one = dailyCounts([study(TODAY)], TODAY);
  assert.equal(chartSummary(one),
    'Respuestas por día en los últimos 14 días: estudiaste 1 de 14 días, 1 respuesta en total.');
  assert.equal(chartSummary(dailyCounts([], TODAY)),
    'Respuestas por día en los últimos 14 días: estudiaste 0 de 14 días, 0 respuestas en total.');
});
