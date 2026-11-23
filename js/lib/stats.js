// Estadísticas de la pantalla Progreso: funciones puras sobre el historial y las tarjetas.
// Usan la fecha guardada en cada respuesta («date»), nunca la recalculan desde «at»,
// para que un cambio de zona horaria no borre ni duplique días. «today» llega como parámetro.
import { addDays } from './dates.js';

export const PROGRESS_DAYS = 14;
export const ACCURACY_DAYS = 30;
export const MASTERED_DAYS = 14;

const CORRECT_ANSWERS = ['hard', 'good', 'easy'];
const WEEKDAY_INITIALS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
const isValidDate = (date) => typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date);
const validEntries = (history) => history.filter((entry) => isValidDate(entry?.date));

export function studiedDates(history) {
  return [...new Set(validEntries(history).map((entry) => entry.date))].sort();
}

// Día desde el que se cuenta: hoy, o mañana si un viaje dejó respuestas con esa fecha.
// Una fecha más lejana (reloj mal puesto) no lo mueve.
export function anchorDate(history, today) {
  const limit = addDays(today, 1);
  const last = studiedDates(history).filter((date) => date <= limit).at(-1);
  return last && last > today ? last : today;
}

// Días estudiados seguidos hasta el ancla; si hoy aún no se estudió, hasta ayer
export function streak(history, today) {
  const dates = new Set(studiedDates(history));
  const anchor = anchorDate(history, today);
  let day = dates.has(anchor) ? anchor : addDays(anchor, -1);
  let days = 0;
  while (dates.has(day)) {
    days += 1;
    day = addDays(day, -1);
  }
  return { days, studiedToday: dates.has(anchor) };
}

// Respuestas de cada uno de los últimos «days» días (el último es el ancla)
export function dailyCounts(history, today, days = PROGRESS_DAYS) {
  const anchor = anchorDate(history, today);
  const byDate = new Map();
  for (const { date } of validEntries(history)) byDate.set(date, (byDate.get(date) ?? 0) + 1);
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(anchor, i - (days - 1));
    return { date, count: byDate.get(date) ?? 0 };
  });
}

const rate = (correct, total) => ({ correct, total, percent: total === 0 ? null : Math.floor((correct * 100) / total) });

// Acierto de Estudiar («Otra vez» = fallo) y del Quiz, por separado, en los últimos «days» días
export function accuracy(history, today, days = ACCURACY_DAYS) {
  const anchor = anchorDate(history, today);
  const from = addDays(anchor, -(days - 1));
  const tally = { study: [0, 0], quiz: [0, 0] };
  for (const entry of validEntries(history)) {
    if (entry.date < from || entry.date > anchor) continue;
    const isQuiz = entry.kind === 'quiz';
    const correct = isQuiz ? entry.correct === true : CORRECT_ANSWERS.includes(entry.answer);
    const counter = tally[isQuiz ? 'quiz' : 'study'];
    counter[0] += correct ? 1 : 0;
    counter[1] += 1;
  }
  return { study: rate(...tally.study), quiz: rate(...tally.quiz) };
}

export function dayLabel(date, today) {
  if (date === today) return 'hoy';
  const [year, month, day] = date.split('-').map(Number);
  return WEEKDAY_INITIALS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
}

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

// Texto alternativo del gráfico de barras
export function chartSummary(counts) {
  const studied = counts.filter((d) => d.count > 0).length;
  const total = counts.reduce((sum, d) => sum + d.count, 0);
  return `Respuestas por día en los últimos ${counts.length} días: estudiaste ${studied} de ${counts.length} días, `
    + `${plural(total, 'respuesta', 'respuestas')} en total.`;
}
