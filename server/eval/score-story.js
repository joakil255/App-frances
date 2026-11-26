import {
  HAS_MARKUP, MAX_WORDS, MIN_SENTENCES, MIN_WORDS, cleanQuestions, countSentences, countWords,
} from '../src/story-normalize.js';

// Cada par tiene frase y traducción, y las frases reconstruyen el texto
function translationsAreOk(body, sentences) {
  if (!Array.isArray(sentences) || sentences.length === 0) return false;
  const pairsOk = sentences.every((pair) => pair?.text?.trim() && pair?.translation?.trim());
  const squash = (text) => text.replace(/\s+/g, ' ').trim();
  return Boolean(pairsOk) && squash(sentences.map((pair) => pair.text).join(' ')) === squash(body);
}

// Califica una historia con las mismas reglas que usa el servidor
export function scoreStory({ title, body, sentences, questions }) {
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
    translationsOk: translationsAreOk(body, sentences),
  };
}

const CASES = 3;

// Criterio: las 3 historias pasan las cinco comprobaciones y ninguna fue rechazada
export function meetsCriterion(scores, rejected) {
  return scores.length === CASES && rejected === 0 && scores.every((score) => Object.values(score).every(Boolean));
}
