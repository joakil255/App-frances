// Lógica de la consulta de palabras del chat: separar el texto, pedir la consulta,
// buscar en el vocabulario y armar la palabra a guardar. Sin DOM.
import { chatUrl, postJson } from './chat.js';
import { duplicateKey, lemmaOf, normalizeText } from './words.js';

const MAX_EXAMPLE = 200;
// Parte elidida que se quita de la palabra consultada («l'école» → «école»)
const ELISION = /^(?:l|d|j|m|t|s|n|c|qu|jusqu|lorsqu|puisqu)['’]/i;

// Cambia /chat por /lookup en la dirección del servidor
export function lookupUrl(hostname) {
  return chatUrl(hostname).replace(/\/chat$/, '/lookup');
}

// Lo que el servidor acepta: solo letras, apóstrofo y guion, de 1 a 40; y una oración de hasta 1000
const SERVER_WORD = /^[\p{L}'’-]{1,40}$/u;
const MAX_SENTENCE = 1000;

function wordOf(segment, sentence) {
  const word = segment.replace(ELISION, '');
  return SERVER_WORD.test(word) && /\p{L}/u.test(word) && sentence.length <= MAX_SENTENCE ? word : null;
}

// Divide el texto en trozos; los textos unidos dan exactamente el original.
// Cada trozo lleva su palabra (o null) y la oración que lo contiene.
export function tokenize(text, Segmenter = globalThis.Intl?.Segmenter) {
  if (text === '') return [];
  if (!Segmenter) return [{ text, word: null, sentence: normalizeText(text) }];

  const sentences = [...new Segmenter('fr', { granularity: 'sentence' }).segment(text)];
  let sentenceIndex = 0;
  return [...new Segmenter('fr', { granularity: 'word' }).segment(text)].map((part) => {
    while (sentenceIndex < sentences.length - 1 && sentences[sentenceIndex + 1].index <= part.index) sentenceIndex += 1;
    const sentence = sentences[sentenceIndex].segment.trim();
    return { text: part.segment, word: wordOf(part.segment, sentence), sentence };
  });
}

function isValidResult(data) {
  return Boolean(data)
    && ['contextTranslation', 'lemma', 'lemmaTranslation', 'partOfSpeech', 'baseWithArticle', 'sentenceTranslation']
      .every((field) => typeof data[field] === 'string')
    && (data.gender === null || typeof data.gender === 'string')
    && typeof data.remainingLookups === 'number';
}

// Nunca lanza: devuelve { ok: true, result, remainingLookups } o { ok: false, error }
export async function sendLookup(options) {
  const sent = await postJson(options);
  if (!sent.ok) return sent;
  const { data } = sent;
  if (!isValidResult(data) || !['m', 'f', null].includes(data.gender)) return { ok: false, error: 'bad_output' };
  const { remainingLookups, ...result } = data;
  return { ok: true, result, remainingLookups };
}

// Primero la caché (sirve sin conexión); si no está, pide al servidor y guarda lo que llega
export async function resolveLookup({ cache, lang, word, sentence, isOnline, send }) {
  const cached = cache.get(lang, word, sentence);
  if (cached) return { ok: true, result: cached, remainingLookups: null };
  if (!isOnline) return { ok: false, error: 'offline' };

  const outcome = await send({ lang, word, sentence });
  if (outcome.ok) cache.set(lang, word, sentence, outcome.result);
  return outcome;
}

// La palabra del vocabulario con el mismo idioma y la misma forma base (o la misma escritura), o null.
// Una forma base o una clave vacía nunca coincide.
export function findInVocabulary(words, { lang, lemma, fr }) {
  const wantedLemma = lemmaOf(lemma, null);
  const wantedKey = duplicateKey(fr);
  return words.find((word) => word.lang === lang
    && ((wantedLemma !== '' && word.lemma === wantedLemma) || (wantedKey !== '' && duplicateKey(word.fr) === wantedKey))) ?? null;
}

// Entrada para saveWord. El ejemplo va solo si la frase y su traducción caben en 200
export function wordFromLookup(result, sentence, { category = 'Conversación', needsReview = false } = {}) {
  const exampleFr = normalizeText(sentence);
  const exampleEs = normalizeText(result.sentenceTranslation);
  const fits = exampleFr.length <= MAX_EXAMPLE && exampleEs.length <= MAX_EXAMPLE;
  return {
    lang: 'fr',
    fr: result.baseWithArticle,
    es: result.lemmaTranslation,
    gender: result.gender,
    exampleFr: fits ? exampleFr : '',
    exampleEs: fits ? exampleEs : '',
    category,
    needsReview,
  };
}

// ¿La palabra tocada ya está guardada? Por ella misma o por la forma base de su consulta en caché
export function isSavedToken(words, cache, lang, word, sentence) {
  const savedLemmas = new Set(words.filter((saved) => saved.lang === lang).map((saved) => saved.lemma));
  return isSavedTokenIn(savedLemmas, cache, lang, word, sentence);
}

// Igual, pero con el conjunto de lemmas guardados ya armado (para revisar muchas palabras seguidas)
export function isSavedTokenIn(savedLemmas, cache, lang, word, sentence) {
  const lemmas = [lemmaOf(word, null), lemmaOf(cache.peek(lang, word, sentence)?.lemma ?? '', null)];
  return lemmas.some((lemma) => lemma !== '' && savedLemmas.has(lemma));
}
