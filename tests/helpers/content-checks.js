// Comprobaciones de texto para el contenido de estudio (pruebas)
import { normalizeText } from '../../js/lib/words.js';

// Palabras de una frase: trozos separados por espacios con al menos una letra o cifra
export function exampleWordCount(text) {
  return text.split(/\s+/).filter((part) => /[\p{L}\p{N}]/u.test(part)).length;
}

// Problemas de codificación o de espacios en un texto
export function textProblems(text) {
  const problems = [];
  if (text !== text.normalize('NFC')) problems.push('no NFC');
  if (text.includes('\uFFFD')) problems.push('U+FFFD');
  if (normalizeText(text) !== text) problems.push('espacios');
  if (/[\u2018\u2019]/.test(text)) problems.push('apóstrofo tipográfico');
  return problems;
}
