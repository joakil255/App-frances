// Texto comparable: minúsculas y apóstrofo recto
const comparable = (text) => String(text).toLowerCase().replace(/[’‘ʼ]/g, "'").trim();

// Califica una consulta: ¿forma base y tipo correctos?
export function scoreLookup({ lemma, partOfSpeech }, output) {
  return {
    lemmaOk: comparable(output.lemma) === comparable(lemma),
    posOk: output.partOfSpeech === partOfSpeech,
  };
}

const ORIGINAL_CASES = 10;
const MIN_ORIGINAL_OK = 9;

// Criterio de publicación: 9 de los 10 casos originales bien y cero rechazos en todos
export function meetsCriterion(rows, rejected) {
  const originalOk = rows.filter((row) => row.id <= ORIGINAL_CASES && row.ok).length;
  return originalOk >= MIN_ORIGINAL_OK && rejected === 0;
}
