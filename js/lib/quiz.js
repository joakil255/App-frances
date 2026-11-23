// Lógica del quiz: qué modos se pueden usar, qué palabras salen y las opciones.
// Funciones puras: el azar llega como parámetro «random» (como Math.random).
import { normalizeAnswer } from './answer-check.js';

export const QUIZ_LENGTH = 10;
export const MODES = ['choice', 'write', 'dictation'];
export const MODE_MESSAGES = {
  noWords: 'Añade palabras en Vocabulario para empezar.',
  choice: 'Necesitas al menos 4 palabras con traducciones distintas.',
  noExamples: 'Ninguna de tus palabras tiene frase de ejemplo. Añádelas en Vocabulario.',
  noVoice: 'Este dispositivo no tiene voz francesa.',
  checkingVoice: 'Comprobando la voz…',
};
const CHOICE_COUNT = 4;

const hasExample = (word) => String(word.exampleFr ?? '').trim() !== '';
const ok = { available: true, reason: null };
const blocked = (reason) => ({ available: false, reason });

// Mezcla una copia de la lista (Fisher–Yates)
function shuffle(list, random) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Palabras con traducciones distintas (la primera de cada texto normalizado)
function distinctByTranslation(words) {
  const seen = new Set();
  return words.filter((w) => {
    const key = normalizeAnswer(w.es);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// hasVoice: true, false o null (aún se está comprobando)
export function modeStatus({ words, hasVoice }) {
  if (words.length === 0) {
    const none = blocked(MODE_MESSAGES.noWords);
    return { choice: none, write: none, dictation: none };
  }
  let dictation = ok;
  if (!words.some(hasExample)) dictation = blocked(MODE_MESSAGES.noExamples);
  else if (hasVoice === null) dictation = blocked(MODE_MESSAGES.checkingVoice);
  else if (!hasVoice) dictation = blocked(MODE_MESSAGES.noVoice);
  return {
    choice: distinctByTranslation(words).length >= CHOICE_COUNT ? ok : blocked(MODE_MESSAGES.choice),
    write: ok,
    dictation,
  };
}

// Primero las ya estudiadas (con tarjeta en cualquier dirección) y después el resto, sin repetir
export function pickQuizWords({ words, cards, mode, random, count = QUIZ_LENGTH }) {
  const candidates = mode === 'dictation' ? words.filter(hasExample) : words;
  const studiedIds = new Set(Object.values(cards).map((card) => card.wordId));
  const studied = candidates.filter((w) => studiedIds.has(w.id));
  const rest = candidates.filter((w) => !studiedIds.has(w.id));
  return [...shuffle(studied, random), ...shuffle(rest, random)].slice(0, count);
}

// La traducción correcta y 3 de otras palabras, sin textos repetidos, en orden al azar
export function buildChoiceOptions({ word, words, random }) {
  const correctKey = normalizeAnswer(word.es);
  const others = distinctByTranslation(words.filter((w) => w.id !== word.id))
    .filter((w) => normalizeAnswer(w.es) !== correctKey);
  const distractors = shuffle(others, random).slice(0, CHOICE_COUNT - 1);
  const options = [word, ...distractors].map((w) => ({ wordId: w.id, text: w.es, isCorrect: w.id === word.id }));
  return shuffle(options, random);
}

export function expectedAnswer(word, mode) {
  return { choice: word.es, write: word.fr, dictation: word.exampleFr }[mode];
}

export function summarizeQuiz(results) {
  return {
    total: results.length,
    correct: results.filter((r) => r.correct).length,
    failed: results.filter((r) => !r.correct),
  };
}
