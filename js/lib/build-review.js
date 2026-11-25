// Cola de repaso de frases y estado de las lecciones: funciones puras
import { dueOf } from './scheduler.js';
import { findExercise } from './lessons.js';

// Misma regla que queue.js: «Otra vez» deja el intervalo de SM-2 en 0 y vence el mismo día
const failedOn = (card, today) => card.sm2.interval === 0 && card.sm2.due === today;
const byText = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

// Tarjetas vencidas; las «ex:» solo si su ejercicio todavía existe
export function buildReviewQueue({ cards, lessons, algorithm, today }) {
  const due = Object.values(cards).filter((card) => {
    const date = dueOf(card, algorithm);
    if (date === null || date > today) return false;
    return card.kind !== 'exercise' || findExercise(lessons, card.lessonId, card.exerciseId) !== null;
  });
  due.sort((a, b) => byText(dueOf(a, algorithm), dueOf(b, algorithm)) || byText(a.lastReviewedAt ?? '', b.lastReviewedAt ?? ''));
  const rest = due.filter((card) => !failedOn(card, today));
  const failed = due.filter((card) => failedOn(card, today));
  return [...rest, ...failed].map((card) => card.id);
}

export function countDueToday(args) {
  return buildReviewQueue(args).length;
}

export function lessonStatus(lesson, progress) {
  const total = lesson.exercises.length;
  const done = progress?.exercises ?? {};
  const correct = lesson.exercises.filter((e) => done[e.id]?.lastCorrectAt).length;
  let state = 'new';
  if (correct === total && total > 0) state = 'done';
  else if (progress?.startedAt) state = 'started';
  return { state, correct, total };
}
