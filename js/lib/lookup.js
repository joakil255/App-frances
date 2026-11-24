// Lógica de la consulta de palabras del chat: separar el texto, pedir la consulta,
// buscar en el vocabulario y armar la palabra a guardar. Sin DOM.
import { chatUrl } from './chat.js';
import { duplicateKey, lemmaOf, normalizeText } from './words.js';

const MAX_EXAMPLE = 200;
// Parte elidida que se quita de la palabra consultada («l'école» → «école»)
const ELISION = /^(?:l|d|j|m|t|s|n|c|qu|jusqu|lorsqu|puisqu)['’]/i;

// Cambia /chat por /lookup en la dirección del servidor
export function lookupUrl(hostname) {
  return chatUrl(hostname).replace(/\/chat$/, '/lookup');
}

function wordOf(segment) {
  const word = segment.replace(ELISION, '');
  return /\p{L}/u.test(word) ? word : null;
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
    return { text: part.segment, word: wordOf(part.segment), sentence: sentences[sentenceIndex].segment.trim() };
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
export async function sendLookup({ url, code, body, fetch, isOnline, timeoutMs = 100000 }) {
  if (!isOnline) return { ok: false, error: 'offline' };

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${code}`, 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    if (error?.name === 'TimeoutError' || error?.name === 'AbortError') return { ok: false, error: 'unavailable' };
    return { ok: false, error: 'network' };
  }

  let data;
  try {
    data = await response.json();
  } catch {
    return { ok: false, error: 'bad_output' };
  }

  if (data && typeof data.error === 'string') return { ok: false, error: data.error };
  if (!response.ok) return { ok: false, error: 'unavailable' };
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
export function wordFromLookup(result, sentence) {
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
    category: 'Conversación',
    needsReview: false,
  };
}

// ¿La palabra tocada ya está guardada? Por ella misma o por la forma base de su consulta en caché
export function isSavedToken(words, cache, lang, word, sentence) {
  const lemmas = [lemmaOf(word, null), lemmaOf(cache.peek(lang, word, sentence)?.lemma ?? '', null)];
  return words.some((saved) => saved.lang === lang && saved.lemma !== '' && lemmas.includes(saved.lemma));
}
