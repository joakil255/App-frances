// Texto comparable: minúsculas y apóstrofo recto
const comparable = (text) => String(text).toLowerCase().replace(/[’‘ʼ]/g, "'").trim();

// Califica una consulta: ¿forma base y tipo correctos?
export function scoreLookup({ lemma, partOfSpeech }, output) {
  return {
    lemmaOk: comparable(output.lemma) === comparable(lemma),
    posOk: output.partOfSpeech === partOfSpeech,
  };
}
