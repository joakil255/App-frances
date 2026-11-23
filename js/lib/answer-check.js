// Comprobación de respuestas escritas del quiz (función pura).
// Ignora mayúsculas, espacios sobrantes, puntuación y el tipo de apóstrofo;
// los acentos se toleran o se exigen, y se avisa cuando el error es solo de acento.

const APOSTROPHES = /[’‘ʼ]/g;
const PUNCTUATION = /[.,;:!?¿¡«»"“”…()]/g;

// Forma comparable: NFC, minúsculas, apóstrofo recto, sin puntuación ni espacios de más
export function normalizeAnswer(text) {
  return String(text ?? '')
    .normalize('NFC')
    .toLowerCase()
    .replace(APOSTROPHES, "'")
    .replace(PUNCTUATION, ' ')
    .replace(/\s+/g, ' ') // \s incluye el espacio no separable y el fino del francés
    .replace(/ ?' ?/g, "'")
    .trim();
}

// Quita tildes, cedillas y demás marcas; «œ» y «æ» se escriben con dos letras
export function foldAccents(text) {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').normalize('NFC')
    .replace(/œ/g, 'oe').replace(/Œ/g, 'OE').replace(/æ/g, 'ae').replace(/Æ/g, 'AE');
}

export function checkAnswer(typed, expected, { requireAccents }) {
  const answer = normalizeAnswer(typed);
  const target = normalizeAnswer(expected);
  if (answer === '') return { correct: false, accentOnly: false };
  if (answer === target) return { correct: true, accentOnly: false };
  if (foldAccents(answer) === foldAccents(target)) return { correct: !requireAccents, accentOnly: true };
  return { correct: false, accentOnly: false };
}
