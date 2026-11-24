import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CHAT_KEY,
  CHAT_CODE_KEY,
  MAX_MESSAGE,
  PRODUCTION_CHAT_URL,
  chatUrl,
  createChatStore,
  buildRequestBody,
  sendChat,
  appendExchange,
} from '../js/lib/chat.js';
import { StorageError } from '../js/lib/storage.js';

// Imita localStorage en memoria; failSet/failGet hacen que setItem/getItem lancen
class MemoryStorage {
  constructor(initial = {}) {
    this.data = new Map(Object.entries(initial));
    this.failSet = null;
    this.failGet = null;
  }
  getItem(key) {
    if (this.failGet) throw this.failGet;
    return this.data.has(key) ? this.data.get(key) : null;
  }
  setItem(key, value) {
    if (this.failSet) throw this.failSet;
    this.data.set(key, String(value));
  }
  removeItem(key) {
    this.data.delete(key);
  }
}

const EMPTY = { level: 'A1.2', turns: [] };

test('las constantes tienen los valores del diseño', () => {
  assert.equal(CHAT_KEY, 'app-frances-chat');
  assert.equal(CHAT_CODE_KEY, 'app-frances-chat-code');
  assert.equal(MAX_MESSAGE, 500);
});

test('chatUrl usa el servidor local en 127.0.0.1 y localhost', () => {
  assert.equal(chatUrl('127.0.0.1'), 'http://127.0.0.1:8787/chat');
  assert.equal(chatUrl('localhost'), 'http://127.0.0.1:8787/chat');
});

test('chatUrl usa la dirección de producción en cualquier otro sitio', () => {
  assert.equal(chatUrl('joakil255.github.io'), PRODUCTION_CHAT_URL);
});

test('la dirección de producción es el Worker publicado, con HTTPS y la ruta /chat', () => {
  assert.equal(PRODUCTION_CHAT_URL, 'https://app-frances-chat.app-frances-chat.workers.dev/chat');
  assert.match(PRODUCTION_CHAT_URL, /^https:\/\/[a-z0-9-]+\.[a-z0-9-]+\.workers\.dev\/chat$/);
});

test('el almacén guarda y lee la conversación', () => {
  const backend = new MemoryStorage();
  const store = createChatStore(backend);
  const state = { level: 'A1.1', turns: [{ role: 'user', text: 'Bonjour', corrections: [] }, { role: 'assistant', text: 'Salut !' }] };
  store.save(state);
  assert.equal(JSON.parse(backend.getItem(CHAT_KEY)).schemaVersion, 1);
  assert.deepEqual(store.load(), state);
});

test('sin nada guardado, load devuelve el estado vacío', () => {
  assert.deepEqual(createChatStore(new MemoryStorage()).load(), EMPTY);
});

test('con JSON roto, load devuelve el estado vacío y no lanza', () => {
  const backend = new MemoryStorage({ [CHAT_KEY]: '{no es json' });
  assert.deepEqual(createChatStore(backend).load(), EMPTY);
});

test('con otra schemaVersion, load devuelve el estado vacío', () => {
  const backend = new MemoryStorage({ [CHAT_KEY]: JSON.stringify({ schemaVersion: 2, level: 'A1.1', turns: [] }) });
  assert.deepEqual(createChatStore(backend).load(), EMPTY);
});

test('si turns no es una lista, load devuelve el estado vacío', () => {
  const backend = new MemoryStorage({ [CHAT_KEY]: JSON.stringify({ schemaVersion: 1, level: 'A1.1', turns: 'hola' }) });
  assert.deepEqual(createChatStore(backend).load(), EMPTY);
});

test('con un nivel desconocido, load devuelve el estado vacío', () => {
  const backend = new MemoryStorage({ [CHAT_KEY]: JSON.stringify({ schemaVersion: 1, level: 'B2', turns: [] }) });
  assert.deepEqual(createChatStore(backend).load(), EMPTY);
});

test('con turnos mal formados, load devuelve el estado vacío', () => {
  for (const turns of [[{ role: 'system', text: 'x' }], [{ role: 'user', text: 5 }], [null]]) {
    const backend = new MemoryStorage({ [CHAT_KEY]: JSON.stringify({ schemaVersion: 1, level: 'A1.1', turns }) });
    assert.deepEqual(createChatStore(backend).load(), EMPTY);
  }
});

test('si getItem lanza, load devuelve el estado vacío y loadCode devuelve null', () => {
  const backend = new MemoryStorage();
  backend.failGet = new Error('bloqueado');
  const store = createChatStore(backend);
  assert.deepEqual(store.load(), EMPTY);
  assert.equal(store.loadCode(), null);
});

test('save con cuota llena lanza StorageError quota', () => {
  const backend = new MemoryStorage();
  backend.failSet = Object.assign(new Error('lleno'), { name: 'QuotaExceededError' });
  assert.throws(
    () => createChatStore(backend).save(EMPTY),
    (error) => error instanceof StorageError && error.code === 'quota',
  );
});

test('el código se guarda, se lee y se borra', () => {
  const backend = new MemoryStorage();
  const store = createChatStore(backend);
  assert.equal(store.loadCode(), null);
  store.saveCode('secreto');
  assert.equal(backend.getItem(CHAT_CODE_KEY), 'secreto');
  assert.equal(store.loadCode(), 'secreto');
  store.clearCode();
  assert.equal(store.loadCode(), null);
});

test('saveCode con cuota llena lanza StorageError', () => {
  const backend = new MemoryStorage();
  backend.failSet = Object.assign(new Error('lleno'), { code: 22 });
  assert.throws(
    () => createChatStore(backend).saveCode('x'),
    (error) => error instanceof StorageError && error.code === 'quota',
  );
});

test('buildRequestBody recorta el historial a 20 y no incluye corrections', () => {
  const turns = Array.from({ length: 30 }, (_, i) => ({
    role: i % 2 === 0 ? 'user' : 'assistant',
    text: `mensaje ${i}`,
    corrections: [{ original: 'a', corrected: 'b', explanation: 'c' }],
  }));
  const body = buildRequestBody({ level: 'A1.2', turns, message: 'Salut' });
  assert.equal(body.level, 'A1.2');
  assert.equal(body.message, 'Salut');
  assert.equal(body.history.length, 20);
  assert.deepEqual(body.history[0], { role: 'user', text: 'mensaje 10' });
  assert.deepEqual(body.history[19], { role: 'assistant', text: 'mensaje 29' });
  for (const item of body.history) assert.deepEqual(Object.keys(item).sort(), ['role', 'text']);
});

test('buildRequestBody con conversación vacía deja el historial vacío', () => {
  assert.deepEqual(buildRequestBody({ level: 'A1.1', turns: [], message: 'Hi' }), { level: 'A1.1', history: [], message: 'Hi' });
});

// fetch falso: devuelve una Response de verdad y recuerda las llamadas
function fakeFetch(status, payload, { raw } = {}) {
  const calls = [];
  const fn = async (url, options) => {
    calls.push({ url, options });
    return new Response(raw ?? JSON.stringify(payload), { status });
  };
  fn.calls = calls;
  return fn;
}
const BODY = { level: 'A1.2', history: [], message: 'Bonjour' };
const OK_PAYLOAD = { reply: 'Salut !', corrections: [{ original: 'a', corrected: 'b', explanation: 'c' }], remaining: 99 };
const send = (fetch, extra = {}) => sendChat({ url: 'http://x/chat', code: 'abc', body: BODY, fetch, isOnline: true, ...extra });

test('sendChat sin conexión devuelve offline y no llama a fetch', async () => {
  const fetch = fakeFetch(200, OK_PAYLOAD);
  assert.deepEqual(await send(fetch, { isOnline: false }), { ok: false, error: 'offline' });
  assert.equal(fetch.calls.length, 0);
});

test('sendChat con un fetch que lanza devuelve network', async () => {
  const fetch = async () => {
    throw new TypeError('Failed to fetch');
  };
  assert.deepEqual(await send(fetch), { ok: false, error: 'network' });
});

test('sendChat envía el código y el tipo de contenido', async () => {
  const fetch = fakeFetch(200, OK_PAYLOAD);
  await send(fetch);
  const { url, options } = fetch.calls[0];
  assert.equal(url, 'http://x/chat');
  assert.equal(options.method, 'POST');
  assert.equal(options.headers.Authorization, 'Bearer abc');
  assert.equal(options.headers['content-type'], 'application/json');
  assert.deepEqual(JSON.parse(options.body), BODY);
});

test('sendChat devuelve la respuesta cuando todo sale bien', async () => {
  assert.deepEqual(await send(fakeFetch(200, OK_PAYLOAD)), { ok: true, ...OK_PAYLOAD });
});

test('sendChat devuelve el error del servidor (401, 429, 502)', async () => {
  for (const [status, error] of [[401, 'unauthorized'], [429, 'daily_limit'], [502, 'unavailable']]) {
    assert.deepEqual(await send(fakeFetch(status, { error })), { ok: false, error });
  }
});

test('sendChat usa el error del cuerpo aunque el estado sea 200', async () => {
  assert.deepEqual(await send(fakeFetch(200, { error: 'refused' })), { ok: false, error: 'refused' });
});

test('sendChat con JSON roto devuelve bad_output', async () => {
  assert.deepEqual(await send(fakeFetch(200, null, { raw: '<html>' })), { ok: false, error: 'bad_output' });
  assert.deepEqual(await send(fakeFetch(502, null, { raw: 'Bad gateway' })), { ok: false, error: 'bad_output' });
});

test('sendChat con un 200 incompleto devuelve bad_output', async () => {
  for (const payload of [{ corrections: [], remaining: 1 }, { reply: 'x', remaining: 1 }, { reply: 'x', corrections: [] }, { reply: 'x', corrections: 'no', remaining: 1 }, null]) {
    assert.deepEqual(await send(fakeFetch(200, payload)), { ok: false, error: 'bad_output' });
  }
});

test('sendChat con un error sin código devuelve unavailable', async () => {
  assert.deepEqual(await send(fakeFetch(500, { algo: 1 })), { ok: false, error: 'unavailable' });
});

test('appendExchange no modifica la lista original', () => {
  const turns = [{ role: 'user', text: 'Hola' }];
  const copy = structuredClone(turns);
  const next = appendExchange(turns, 'Bonjour', OK_PAYLOAD);
  assert.deepEqual(turns, copy);
  assert.notEqual(next, turns);
  assert.deepEqual(next, [
    { role: 'user', text: 'Hola' },
    { role: 'user', text: 'Bonjour', corrections: OK_PAYLOAD.corrections },
    { role: 'assistant', text: 'Salut !' },
  ]);
});

test('el texto con <script> se conserva tal cual', async () => {
  const evil = '<script>alert(1)</script>';
  const next = appendExchange([], evil, { reply: evil, corrections: [] });
  assert.equal(next[0].text, evil);
  assert.equal(next[1].text, evil);
  const backend = new MemoryStorage();
  const store = createChatStore(backend);
  store.save({ level: 'A1.2', turns: next });
  assert.equal(store.load().turns[1].text, evil);
});

test('sendChat con un tiempo agotado devuelve unavailable', async () => {
  const fetch = async () => {
    throw new DOMException('timeout', 'TimeoutError');
  };
  assert.deepEqual(await send(fetch), { ok: false, error: 'unavailable' });
});

test('sendChat pasa una señal de tiempo límite a fetch', async () => {
  let signal;
  await send(async (_url, init) => {
    signal = init.signal;
    return { ok: true, json: async () => ({ reply: 'x', corrections: [], remaining: 1 }) };
  });
  assert.ok(signal instanceof AbortSignal);
});
