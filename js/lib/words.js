// Reglas de las palabras: normalizar, validar, detectar duplicadas, buscar y ordenar

const MAX_LENGTH = 200;
const TEXT_FIELDS = ['fr', 'es', 'exampleFr', 'exampleEs', 'category'];
// Artículo al principio del francés: «le », «la », «les », «un », «une », «des » o «l'»
const ARTICLE = /^(?:(le|la|les|un|une|des)\s|(l)['’])/i;
const ARTICLE_GENDER = { le: 'm', un: 'm', la: 'f', une: 'f' };
const collator = new Intl.Collator('fr', { sensitivity: 'base' });

// Recorta, junta espacios repetidos y usa la forma Unicode NFC
export function normalizeText(value) {
  return String(value ?? '').normalize('NFC').trim().replace(/\s+/g, ' ');
}

// Clave para detectar duplicadas: sin mayúsculas ni espacios de más; los acentos cuentan
export function duplicateKey(fr) {
  return normalizeText(fr).toLowerCase().replace(/’/g, "'");
}

// Clave para buscar: además quita los acentos («Être» → «etre»)
export function searchKey(text) {
  return normalizeText(text).normalize('NFD').replace(/\p{Diacritic}/gu, '').normalize('NFC')
    .toLowerCase().replace(/’/g, "'");
}

function cleanWord(input) {
  const word = {};
  for (const field of TEXT_FIELDS) word[field] = normalizeText(input[field]);
  const gender = input.gender === '' || input.gender == null ? null : input.gender;
  word.gender = gender;
  word.needsReview = Boolean(input.needsReview);
  return word;
}

// Devuelve { ok, errors, word }. errors tiene un mensaje por campo con problema.
export function validateWord(input, existingWords = [], ownId = null) {
  const word = cleanWord(input);
  const errors = {};

  for (const field of TEXT_FIELDS) {
    if (word[field].length > MAX_LENGTH) errors[field] = 'Máximo 200 caracteres.';
  }
  if (!word.fr) errors.fr = 'Escribe la palabra en francés.';
  if (!word.es) errors.es = 'Escribe la traducción al español.';
  if (word.exampleFr && !word.exampleEs) errors.exampleEs = 'Falta la traducción del ejemplo.';
  if (word.exampleEs && !word.exampleFr) errors.exampleFr = 'Falta el ejemplo en francés.';

  if (word.gender !== null && word.gender !== 'm' && word.gender !== 'f') {
    errors.gender = 'El género debe ser masculino, femenino o sin género.';
  } else if (word.gender && word.fr && !errors.fr) {
    const match = word.fr.match(ARTICLE);
    if (!match) {
      errors.fr = "Con género, escribe el artículo: le, la, l', les, un, une o des.";
    } else {
      const article = (match[1] || match[2]).toLowerCase();
      const articleGender = ARTICLE_GENDER[article];
      if (articleGender && articleGender !== word.gender) {
        const name = articleGender === 'f' ? 'femenino' : 'masculino';
        errors.gender = `«${article}» es ${name}: cambia el género o el artículo.`;
      }
    }
  }

  if (word.fr && !errors.fr) {
    const key = duplicateKey(word.fr);
    const clash = existingWords.some((other) => other.id !== ownId && duplicateKey(other.fr) === key);
    if (clash) errors.fr = `«${word.fr}» ya está en tu lista.`;
  }

  return { ok: Object.keys(errors).length === 0, errors, word };
}

// Francés sin el artículo inicial, para ordenar («la maison» va en la M)
function sortKey(fr) {
  return normalizeText(fr).replace(ARTICLE, '');
}

export function sortWords(words) {
  return [...words].sort((a, b) => collator.compare(sortKey(a.fr), sortKey(b.fr)) || collator.compare(a.fr, b.fr));
}

// category: 'all', '' (sin categoría) o un nombre. gender: 'all', 'm', 'f' o 'none'.
export function filterWords(words, { query = '', category = 'all', gender = 'all' } = {}) {
  const q = searchKey(query);
  const matches = words.filter((word) => {
    if (category !== 'all' && (word.category || '') !== category) return false;
    if (gender === 'none' ? word.gender : gender !== 'all' && word.gender !== gender) return false;
    if (!q) return true;
    return searchKey(word.fr).includes(q) || searchKey(word.es).includes(q);
  });
  return sortWords(matches);
}

export function categoriesOf(words) {
  const unique = new Set(words.map((w) => w.category).filter(Boolean));
  return [...unique].sort(collator.compare);
}
