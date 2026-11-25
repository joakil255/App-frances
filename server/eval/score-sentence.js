import { comparable } from '../src/normalize.js';

// Califica la corrección de una frase según lo que se esperaba del caso
export function scoreSentence(item, output) {
  const noErrors = output.errors.length === 0;
  if (item.expect === 'error') {
    const corrected = comparable(output.corrected);
    return {
      errorFound: !noErrors,
      correctedOk: item.accepted.some((accepted) => comparable(accepted) === corrected),
    };
  }
  if (item.expect === 'correct') return { noInvented: noErrors };
  return { noInvented: noErrors, suggestionOk: output.suggestion.trim() !== '' };
}

const ERROR_CASES = 10;
const CORRECT_CASES = 6;
const SUGGEST_CASES = 3;
const MIN_SUGGESTIONS = 2;

// Criterio: 10 errores encontrados y corregidos (uno es una palabra que falta), 6 correctas sin error inventado, 2 de 3 sugerencias y cero rechazos
export function meetsCriterion(scores, rejected) {
  if (rejected !== 0 || scores.length !== ERROR_CASES + CORRECT_CASES) return false;
  const errors = scores.filter((score) => 'errorFound' in score);
  const others = scores.filter((score) => 'noInvented' in score);
  const suggestions = others.filter((score) => 'suggestionOk' in score);
  return errors.length === ERROR_CASES
    && errors.every((score) => score.errorFound && score.correctedOk)
    && others.length === CORRECT_CASES
    && others.every((score) => score.noInvented)
    && suggestions.length === SUGGEST_CASES
    && suggestions.filter((score) => score.suggestionOk).length >= MIN_SUGGESTIONS;
}
