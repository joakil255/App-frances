import {
  HAS_MARKUP, MAX_WORDS, MIN_SENTENCES, MIN_WORDS, cleanQuestions, countSentences, countWords,
} from '../src/story-normalize.js';

// Califica una historia con las mismas reglas que usa el servidor
export function scoreStory({ title, body, questions }) {
  const words = countWords(body);
  let questionsOk = true;
  try {
    cleanQuestions(questions, body);
  } catch {
    questionsOk = false;
  }
  return {
    wordsOk: words >= MIN_WORDS && words <= MAX_WORDS,
    sentencesOk: countSentences(body) >= MIN_SENTENCES,
    noMarkupOk: !HAS_MARKUP.test(title) && !HAS_MARKUP.test(body),
    questionsOk,
  };
}

const CASES = 3;

// Criterio: las 3 historias pasan las cuatro comprobaciones y ninguna fue rechazada
export function meetsCriterion(scores, rejected) {
  return scores.length === CASES && rejected === 0 && scores.every((score) => Object.values(score).every(Boolean));
}
