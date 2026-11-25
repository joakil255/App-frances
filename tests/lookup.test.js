import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  tokenize, lookupUrl, sendLookup, resolveLookup, findInVocabulary, wordFromLookup, isSavedToken, isSavedTokenIn,
} from '../js/lib/lookup.js';
import { PRODUCTION_CHAT_URL } from '../js/lib/chat.js';
import { createLookupCache } from '../js/lib/lookup-cache.js';
import { validateWord, lemmaOf } from '../js/lib/words.js';

class MemoryStorage {
  constructor() {
    this.data = new Map();
    this.writes = 0;
  }
  getItem(key) {
    return this.data.has(key) ? this.data.get(key) : null;
  }
  setItem(key, value) {
    this.writes += 1;
    this.data.set(key, String(value));
  }
}

const words = (tokens) => tokens.filter((t) => t.word !== null).map((t) => t.word);

test('tokenize quita la elisión y deja la palabra', () => {
  const tokens = tokenize("Je vais à l'école aujourd'hui.");
  assert.deepEqual(words(tokens), ['Je', 'vais', 'à', 'école', "aujourd'hui"]);
  assert.equal(tokens.map((t) => t.text).join(''), "Je vais à l'école aujourd'hui.");
});

test('tokenize: apóstrofo tipográfico, mayúsculas y prefijos largos', () => {
  assert.deepEqual(words(tokenize('Qu’est-ce')), ['est', 'ce']);
  assert.deepEqual(words(tokenize("L'ami et jusqu'ici, puisqu'il pleut, lorsqu'on part, c'est m'aider")),
    ['ami', 'et', 'ici', 'il', 'pleut', 'on', 'part', 'est', 'aider']);
  assert.deepEqual(words(tokenize('QU’EST')), ['EST']);
});

test('tokenize: números, emoji y signos no son palabras', () => {
  const tokens = tokenize('Il a 12 ans 😀 !');
  assert.deepEqual(words(tokens), ['Il', 'a', 'ans']);
  for (const t of tokens.filter((x) => /^(12|😀|!| )$/.test(x.text))) assert.equal(t.word, null);
});

test('tokenize: un texto con <script> y <b> se recompone exacto', () => {
  const text = 'Salut <script>alert(1)</script> <b>ami</b> & "ça"';
  const tokens = tokenize(text);
  assert.equal(tokens.map((t) => t.text).join(''), text);
  assert.ok(tokens.every((t) => t.word === null || /^\p{L}+$/u.test(t.word)));
});

test('tokenize: cada palabra lleva la oración que la contiene', () => {
  const tokens = tokenize('Bonjour Marie. Tu manges ? Oui !');
  const sentenceOf = (w) => tokens.find((t) => t.word === w).sentence;
  assert.equal(sentenceOf('Bonjour'), 'Bonjour Marie.');
  assert.equal(sentenceOf('manges'), 'Tu manges ?');
  assert.equal(sentenceOf('Oui'), 'Oui !');
});

test('tokenize: no se puede tocar lo que el servidor rechazaría', () => {
  assert.deepEqual(words(tokenize('Le 1er jour')), ['Le', 'jour']);
  const longWord = 'a'.repeat(41);
  assert.deepEqual(words(tokenize(`Un ${longWord} ok`)), ['Un', 'ok']);
  assert.deepEqual(words(tokenize(`${'a'.repeat(40)} ok`)), ['a'.repeat(40), 'ok']);
});

test('tokenize: con una oración de más de 1000 letras ninguna palabra es tocable', () => {
  const tokens = tokenize(`Bonjour ${'mot '.repeat(300)}fin. Salut.`);
  assert.deepEqual(words(tokens), ['Salut']);
});

test('tokenize sin Segmenter deja un solo token sin palabra', () => {
  assert.deepEqual(tokenize('Tu manges.', null), [{ text: 'Tu manges.', word: null, sentence: 'Tu manges.' }]);
  assert.deepEqual(tokenize('', null), []);
});

test('lookupUrl cambia /chat por /lookup', () => {
  assert.equal(lookupUrl('127.0.0.1'), 'http://127.0.0.1:8787/lookup');
  assert.equal(lookupUrl('joakil255.github.io'), PRODUCTION_CHAT_URL.replace(/\/chat$/, '/lookup'));
});

const GOOD = {
  contextTranslation: 'comes', lemma: 'manger', lemmaTranslation: 'comer', partOfSpeech: 'verb',
  gender: null, baseWithArticle: 'manger', sentenceTranslation: 'Tú comes.', remainingLookups: 150,
};
const reply = (status, body) => async () => ({ ok: status >= 200 && status < 300, status, json: async () => body });
const send = (fetch, extra = {}) => sendLookup({ url: 'u', code: 'c', body: { lang: 'fr' }, fetch, isOnline: true, ...extra });

test('sendLookup devuelve el resultado sin remainingLookups', async () => {
  const calls = [];
  const out = await send(async (url, init) => {
    calls.push({ url, init });
    return { ok: true, status: 200, json: async () => GOOD };
  });
  const { remainingLookups, ...result } = GOOD;
  assert.deepEqual(out, { ok: true, result, remainingLookups });
  assert.equal(calls[0].init.headers.Authorization, 'Bearer c');
  assert.equal(calls[0].init.method, 'POST');
});

test('sendLookup acepta gender m o f', async () => {
  const out = await send(reply(200, { ...GOOD, gender: 'f' }));
  assert.equal(out.result.gender, 'f');
});

test('sendLookup: errores del servidor, red, conexión y salida rota', async () => {
  assert.deepEqual(await send(reply(429, { error: 'lookup_limit' })), { ok: false, error: 'lookup_limit' });
  assert.deepEqual(await send(reply(500, {})), { ok: false, error: 'unavailable' });
  assert.deepEqual(await send(async () => ({ ok: true, status: 200, json: async () => { throw new SyntaxError('x'); } })),
    { ok: false, error: 'bad_output' });
  assert.deepEqual(await send(async () => { throw new TypeError('x'); }), { ok: false, error: 'network' });
  assert.deepEqual(await send(async () => { throw Object.assign(new Error('t'), { name: 'TimeoutError' }); }),
    { ok: false, error: 'unavailable' });
  let called = false;
  assert.deepEqual(await send(async () => { called = true; }, { isOnline: false }), { ok: false, error: 'offline' });
  assert.equal(called, false);
});

test('sendLookup: una forma incorrecta es bad_output', async () => {
  for (const bad of [null, {}, { ...GOOD, gender: 'x' }, { ...GOOD, gender: undefined }, { ...GOOD, lemma: 1 },
    { ...GOOD, remainingLookups: '1' }, { ...GOOD, baseWithArticle: undefined }]) {
    assert.deepEqual(await send(reply(200, bad)), { ok: false, error: 'bad_output' });
  }
});

function fakeCache(initial = null) {
  const store = new Map();
  if (initial) store.set('k', initial);
  return {
    sets: [],
    get() { return store.get('k') ?? null; },
    set(...args) { this.sets.push(args); store.set('k', args[3]); },
  };
}

test('resolveLookup usa la caché aunque no haya conexión', async () => {
  const cached = { lemma: 'manger' };
  let called = false;
  const out = await resolveLookup({
    cache: fakeCache(cached), lang: 'fr', word: 'manges', sentence: 's', isOnline: false,
    send: async () => { called = true; },
  });
  assert.equal(out.ok, true);
  assert.deepEqual(out.result, cached);
  assert.equal(called, false);
});

test('resolveLookup sin caché y sin conexión es offline y no llama a send', async () => {
  let called = false;
  const out = await resolveLookup({
    cache: fakeCache(), lang: 'fr', word: 'manges', sentence: 's', isOnline: false,
    send: async () => { called = true; },
  });
  assert.deepEqual(out, { ok: false, error: 'offline' });
  assert.equal(called, false);
});

test('resolveLookup guarda en la caché lo que llega; un error no guarda', async () => {
  const cache = fakeCache();
  const result = { lemma: 'manger' };
  const bodies = [];
  const ok = await resolveLookup({
    cache, lang: 'fr', word: 'manges', sentence: 'Tu manges.', isOnline: true,
    send: async (body) => { bodies.push(body); return { ok: true, result, remainingLookups: 9 }; },
  });
  assert.deepEqual(ok, { ok: true, result, remainingLookups: 9 });
  assert.deepEqual(bodies, [{ lang: 'fr', word: 'manges', sentence: 'Tu manges.' }]);
  assert.deepEqual(cache.sets, [['fr', 'manges', 'Tu manges.', result]]);

  const failing = fakeCache();
  const bad = await resolveLookup({
    cache: failing, lang: 'fr', word: 'a', sentence: 's', isOnline: true,
    send: async () => ({ ok: false, error: 'lookup_limit' }),
  });
  assert.deepEqual(bad, { ok: false, error: 'lookup_limit' });
  assert.equal(failing.sets.length, 0);
});

const VOCAB = [
  { id: '1', lang: 'fr', fr: 'manger', lemma: 'manger', gender: null },
  { id: '2', lang: 'fr', fr: "l'école", lemma: 'école', gender: 'f' },
  { id: '3', lang: 'fr', fr: 'un peu', lemma: 'un peu', gender: null },
];

test('findInVocabulary encuentra por forma base o por la palabra', () => {
  assert.equal(findInVocabulary(VOCAB, { lang: 'fr', lemma: 'manger', fr: 'manges' }).id, '1');
  assert.equal(findInVocabulary(VOCAB, { lang: 'fr', lemma: 'école', fr: 'école' }).id, '2');
  assert.equal(findInVocabulary(VOCAB, { lang: 'fr', lemma: 'École', fr: 'ÉCOLE' }).id, '2');
  assert.equal(findInVocabulary(VOCAB, { lang: 'fr', lemma: 'xyz', fr: "l’école" }).id, '2');
  assert.equal(findInVocabulary(VOCAB, { lang: 'fr', lemma: 'xyz', fr: 'un peu' }).id, '3');
  assert.equal(findInVocabulary(VOCAB, { lang: 'fr', lemma: 'chat', fr: 'chat' }), null);
});

test('findInVocabulary no mezcla idiomas', () => {
  assert.equal(findInVocabulary(VOCAB, { lang: 'en', lemma: 'manger', fr: 'manger' }), null);
});

test('findInVocabulary nunca coincide con una forma base o clave vacía', () => {
  const odd = [{ id: '9', lang: 'fr', fr: "l'", lemma: '', gender: 'f' }, { id: '8', lang: 'fr', fr: '', lemma: '', gender: null }];
  assert.equal(findInVocabulary(odd, { lang: 'fr', lemma: '', fr: '' }), null);
  assert.equal(findInVocabulary(odd, { lang: 'fr', lemma: lemmaOf("l'", 'f'), fr: ' ' }), null);
});

const LOOKED = {
  contextTranslation: 'comes', lemma: 'manger', lemmaTranslation: 'comer', partOfSpeech: 'verb',
  gender: null, baseWithArticle: 'manger', sentenceTranslation: 'Tú comes.',
};

test('wordFromLookup con frase corta incluye el ejemplo y pasa validateWord', () => {
  const entry = wordFromLookup(LOOKED, 'Tu manges.');
  assert.deepEqual(entry, {
    lang: 'fr', fr: 'manger', es: 'comer', gender: null,
    exampleFr: 'Tu manges.', exampleEs: 'Tú comes.', category: 'Conversación', needsReview: false,
  });
  assert.equal(validateWord(entry, []).ok, true);
});

test('wordFromLookup sin ejemplo si alguna de las dos pasa de 200', () => {
  const long = 'a'.repeat(201);
  for (const [sentence, translation] of [[long, 'ok'], ['ok', long]]) {
    const entry = wordFromLookup({ ...LOOKED, sentenceTranslation: translation }, sentence);
    assert.equal(entry.exampleFr, '');
    assert.equal(entry.exampleEs, '');
    assert.equal(validateWord(entry, []).ok, true);
  }
  const edge = wordFromLookup({ ...LOOKED, sentenceTranslation: 'b'.repeat(200) }, 'a'.repeat(200));
  assert.equal(edge.exampleFr.length, 200);
});

test('wordFromLookup con sustantivo: lleva género y artículo', () => {
  const entry = wordFromLookup({ ...LOOKED, lemma: 'école', baseWithArticle: "l'école", gender: 'f', lemmaTranslation: 'escuela' }, 'Elle aime l’école.');
  assert.equal(entry.fr, "l'école");
  assert.equal(entry.gender, 'f');
  assert.equal(validateWord(entry, []).ok, true);
});

test('isSavedToken: por la palabra misma o por el lemma en caché', () => {
  const cacheWith = (result) => ({ peek: () => result });
  assert.equal(isSavedToken(VOCAB, cacheWith(null), 'fr', 'manger', 's'), true);
  assert.equal(isSavedToken(VOCAB, cacheWith(null), 'fr', 'Manger', 's'), true);
  assert.equal(isSavedToken(VOCAB, cacheWith(null), 'fr', 'manges', 's'), false);
  assert.equal(isSavedToken(VOCAB, cacheWith({ lemma: 'manger' }), 'fr', 'manges', 's'), true);
  assert.equal(isSavedToken(VOCAB, cacheWith({ lemma: 'chat' }), 'fr', 'manges', 's'), false);
  assert.equal(isSavedToken(VOCAB, cacheWith({ lemma: 'manger' }), 'en', 'manges', 's'), false);
});

test('isSavedToken nunca coincide con una forma base vacía', () => {
  const odd = [{ id: '9', lang: 'fr', fr: "l'", lemma: '', gender: 'f' }];
  assert.equal(isSavedToken(odd, { peek: () => null }, 'fr', '', 's'), false);
  assert.equal(isSavedToken(odd, { peek: () => ({ lemma: '' }) }, 'fr', "'", 's'), false);
});

test('isSavedToken no escribe nada en el almacenamiento', () => {
  const backend = new MemoryStorage();
  const cache = createLookupCache(backend, { now: () => 1 });
  cache.set('fr', 'manges', 's', { lemma: 'manger' });
  backend.writes = 0;
  assert.equal(isSavedToken(VOCAB, cache, 'fr', 'manges', 's'), true);
  assert.equal(backend.writes, 0);
});

test('isSavedTokenIn: igual que isSavedToken pero con el conjunto de lemmas ya hecho', () => {
  const lemmas = new Set(VOCAB.map((word) => word.lemma));
  const cacheWith = (result) => ({ peek: () => result });
  assert.equal(isSavedTokenIn(lemmas, cacheWith(null), 'fr', 'Manger', 's'), true);
  assert.equal(isSavedTokenIn(lemmas, cacheWith(null), 'fr', 'manges', 's'), false);
  assert.equal(isSavedTokenIn(lemmas, cacheWith({ lemma: 'manger' }), 'fr', 'manges', 's'), true);
  assert.equal(isSavedTokenIn(new Set(['']), { peek: () => ({ lemma: '' }) }, 'fr', "'", 's'), false);
});

test('wordFromLookup con opciones de lectura: categoría Lectura y por revisar', () => {
  const entry = wordFromLookup(LOOKED, 'Tu manges.', { category: 'Lectura', needsReview: true });
  assert.equal(entry.category, 'Lectura');
  assert.equal(entry.needsReview, true);
  assert.equal(validateWord(entry).ok, true);
});

test('wordFromLookup sin opciones sigue en Conversación y sin revisar', () => {
  const entry = wordFromLookup(LOOKED, 'Tu manges.');
  assert.equal(entry.category, 'Conversación');
  assert.equal(entry.needsReview, false);
});
