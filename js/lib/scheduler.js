// Programador de repasos: funciones puras (no usan DOM ni la hora del sistema)
import { addDays, daysBetween } from './dates.js';

export const ANSWERS = ['again', 'hard', 'good', 'easy'];

// ---- SM-2 simplificado ----

export const NEW_SM2 = Object.freeze({ reps: 0, interval: 0, ease: 2.5, lapses: 0, due: null });

const MIN_EASE = 1.3;
const MAX_EASE = 3.0;
const MAX_INTERVAL = 365;
const EASE_CHANGE = { again: -0.2, hard: -0.15, good: 0, easy: 0.15 };
// Intervalos fijos de los dos primeros repasos (reps 0 y reps 1)
const FIRST_INTERVALS = { hard: [1, 2], good: [1, 3], easy: [4, 6] };

function checkAnswer(answer) {
  if (!ANSWERS.includes(answer)) throw new Error(`Respuesta desconocida: ${answer}`);
}

// Redondea a 2 decimales (evita errores de coma flotante) y acota a [1,3; 3,0]
function clampEase(ease) {
  return Math.min(MAX_EASE, Math.max(MIN_EASE, Math.round(ease * 100) / 100));
}

export function nextSm2(state, answer, today) {
  checkAnswer(answer);
  const ease = clampEase(state.ease + EASE_CHANGE[answer]);

  // Otra vez: vuelve hoy y empieza de nuevo
  if (answer === 'again') {
    return { reps: 0, interval: 0, ease, lapses: state.lapses + 1, due: today };
  }

  let interval;
  if (state.reps < 2) {
    interval = FIRST_INTERVALS[answer][state.reps];
  } else {
    // Bien y Fácil premian la mitad de los días de atraso
    const late = state.due ? Math.max(0, daysBetween(state.due, today)) : 0;
    const base = answer === 'hard' ? state.interval : state.interval + Math.floor(late / 2);
    const raw = { hard: base * 1.2, good: base * ease, easy: base * ease * 1.3 }[answer];
    interval = Math.min(MAX_INTERVAL, Math.max(state.interval + 1, Math.round(raw)));
  }
  return { reps: state.reps + 1, interval, ease, lapses: state.lapses, due: addDays(today, interval) };
}

// ---- Leitner ----

export const NEW_LEITNER = Object.freeze({ box: 0, due: null });
// Días hasta el próximo repaso según la caja (caja 1 → 1 día … caja 5 → 16 días)
export const LEITNER_DAYS = Object.freeze([1, 2, 4, 8, 16]);
const MAX_BOX = LEITNER_DAYS.length;

export function nextLeitner(state, answer, today) {
  checkAnswer(answer);
  if (answer === 'again') return { box: 1, due: today };
  const step = { hard: 0, good: 1, easy: 2 }[answer];
  const box = Math.min(MAX_BOX, Math.max(1, state.box + step));
  return { box, due: addDays(today, LEITNER_DAYS[box - 1]) };
}

// ---- Tarjetas ----

const ALGORITHMS = ['sm2', 'leitner'];

export function cardIdOf(wordId, direction) {
  return `${wordId}:${direction}`;
}

export function newCard(wordId, direction) {
  return {
    id: cardIdOf(wordId, direction), wordId, direction,
    introducedOn: null, lastReviewedAt: null, sm2: NEW_SM2, leitner: NEW_LEITNER,
  };
}

// Aplica la respuesta con los dos algoritmos: cambiar de algoritmo no pierde progreso
export function review(card, answer, today, nowIso) {
  return {
    ...card,
    introducedOn: card.introducedOn ?? today,
    lastReviewedAt: nowIso,
    sm2: nextSm2(card.sm2, answer, today),
    leitner: nextLeitner(card.leitner, answer, today),
  };
}

export function dueOf(card, algorithm) {
  if (!ALGORITHMS.includes(algorithm)) throw new Error(`Algoritmo desconocido: ${algorithm}`);
  return card[algorithm].due;
}

// Días hasta el próximo repaso con cada respuesta (0 = hoy), para los botones
export function previewDays(card, algorithm, today) {
  const days = {};
  for (const answer of ANSWERS) {
    days[answer] = daysBetween(today, dueOf(review(card, answer, today, ''), algorithm));
  }
  return days;
}
