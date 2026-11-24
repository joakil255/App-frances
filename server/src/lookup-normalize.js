import { ProviderError } from './errors.js';
import { lemmaOf } from '../../js/lib/words.js';

const FIELDS = ['contextTranslation', 'lemma', 'lemmaTranslation', 'partOfSpeech', 'gender', 'baseWithArticle', 'sentenceTranslation'];
const PARTS_OF_SPEECH = [
  'noun', 'proper_noun', 'verb', 'adjective', 'adverb', 'pronoun', 'article',
  'preposition', 'conjunction', 'number', 'interjection', 'expression', 'other',
];
const ARTICLE = /^(le |la |les |l')(.+)$/;

const isText = (value) => typeof value === 'string' && value.trim() !== '';
const clean = (text) => text.normalize('NFC').replace(/[’‘ʼ]/g, "'").trim();

// Valida la salida de la consulta y limpia el lemma; nunca le quita artículos
export function normalizeLookup(raw) {
  const bad = () => new ProviderError('bad_output');
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) throw bad();
  const keys = Object.keys(raw);
  if (keys.length !== FIELDS.length || !FIELDS.every((field) => keys.includes(field))) throw bad();
  const { contextTranslation, lemmaTranslation, partOfSpeech, gender, sentenceTranslation } = raw;
  if (![contextTranslation, raw.lemma, lemmaTranslation, raw.baseWithArticle, sentenceTranslation].every(isText)) throw bad();
  if (!PARTS_OF_SPEECH.includes(partOfSpeech)) throw bad();
  if (gender !== 'm' && gender !== 'f' && gender !== null) throw bad();

  const lemma = clean(raw.lemma).toLowerCase();
  const baseWithArticle = clean(raw.baseWithArticle);

  if (partOfSpeech === 'noun') {
    const match = ARTICLE.exec(baseWithArticle.toLowerCase());
    if (gender === null || !match || match[2] !== lemma) throw bad();
    if (match[1] === 'le ' && gender !== 'm') throw bad();
    if (match[1] === 'la ' && gender !== 'f') throw bad();
    if (lemmaOf(baseWithArticle, gender) !== lemma) throw bad();
  } else {
    if (gender !== null) throw bad();
    const expected = partOfSpeech === 'proper_noun' ? baseWithArticle.toLowerCase() : baseWithArticle;
    if (expected !== lemma || lemmaOf(baseWithArticle, null) !== lemma) throw bad();
  }
  return { contextTranslation, lemma, lemmaTranslation, partOfSpeech, gender, baseWithArticle, sentenceTranslation };
}
