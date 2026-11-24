import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleRequest } from '../src/handler.js';
import { ProviderError } from '../src/errors.js';

const ORIGIN = 'https://joakil255.github.io';
const NOW = new Date('2026-11-24T02:30:00Z');
const KEY = 'count:2026-11-23';

function makeKv(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    store,
    async get(key) {
      return store.has(key) ? store.get(key) : null;
    },
    async put(key, value) {
      store.set(key, value);
    },
  };
}

function makeEnv(overrides = {}) {
  return {
    AI_PROVIDER: 'claude',
    AI_MODEL: 'claude-haiku-5-5',
    AI_EFFORT: 'low',
    DAILY_LIMIT: '100',
    LOOKUP_LIMIT: '200',
    STORY_LIMIT: '5',
    ALLOWED_ORIGINS: `${ORIGIN},http://127.0.0.1:8000`,
    ANTHROPIC_API_KEY: 'clave-de-prueba',
    ACCESS_CODE: 'codigo-de-prueba',
    CHAT_KV: makeKv(),
    ...overrides,
  };
}

// Proveedor falso que cuenta sus llamadas
function makeProviders(behavior) {
  const state = { calls: 0, created: [], received: [] };
  const claude = (options) => {
    state.created.push(options);
    return {
      async chat(input) {
        state.calls += 1;
        state.received.push(input);
        return behavior(input);
      },
      async lookup(input) {
        state.calls += 1;
        state.received.push(input);
        return behavior(input);
      },
      async story(input) {
        state.calls += 1;
        state.received.push(input);
        return behavior(input);
      },
    };
  };
  return { providers: { claude }, state };
}

const okBehavior = () => ({ reply: 'Salut !', corrections: [] });
const goodBody = { level: 'A1.1', history: [], message: 'Bonjour' };

function chatRequest({ origin = ORIGIN, code = 'codigo-de-prueba', body = goodBody, method = 'POST', path = '/chat', raw } = {}) {
  const headers = { 'content-type': 'application/json' };
  if (origin !== null) headers.origin = origin;
  if (code !== null) headers.authorization = `Bearer ${code}`;
  const init = { method, headers };
  if (method !== 'GET' && method !== 'HEAD') init.body = raw ?? JSON.stringify(body);
  return new Request(`https://worker.example${path}`, init);
}

async function run(request, env = makeEnv(), providers = makeProviders(okBehavior)) {
  const response = await handleRequest(request, env, { providers: providers.providers, now: () => NOW });
  return { response, body: response.status === 204 ? null : await response.json(), env, state: providers.state };
}

test('OPTIONS /chat desde origen permitido responde 204 con CORS', async () => {
  const request = new Request('https://worker.example/chat', { method: 'OPTIONS', headers: { origin: ORIGIN } });
  const { response } = await run(request);
  assert.equal(response.status, 204);
  assert.equal(response.headers.get('access-control-allow-origin'), ORIGIN);
  assert.equal(response.headers.get('vary'), 'Origin');
  assert.equal(response.headers.get('access-control-allow-methods'), 'POST');
  assert.equal(response.headers.get('access-control-allow-headers'), 'authorization, content-type');
  assert.equal(response.headers.get('access-control-max-age'), '86400');
});

test('origen ausente da 403 forbidden_origin', async () => {
  const { response, body } = await run(chatRequest({ origin: null }));
  assert.equal(response.status, 403);
  assert.deepEqual(body, { error: 'forbidden_origin' });
  assert.equal(response.headers.get('access-control-allow-origin'), null);
});

test('origen no permitido da 403, también en OPTIONS', async () => {
  const { response, body } = await run(chatRequest({ origin: 'https://malo.example' }));
  assert.equal(response.status, 403);
  assert.deepEqual(body, { error: 'forbidden_origin' });
  const preflight = new Request('https://worker.example/chat', { method: 'OPTIONS', headers: { origin: 'https://malo.example' } });
  assert.equal((await run(preflight)).response.status, 403);
});

test('otra ruta o método da 404 not_found', async () => {
  const route = await run(chatRequest({ path: '/otra' }));
  assert.equal(route.response.status, 404);
  assert.deepEqual(route.body, { error: 'not_found' });
  const method = await run(chatRequest({ method: 'GET' }));
  assert.equal(method.response.status, 404);
  assert.deepEqual(method.body, { error: 'not_found' });
});

test('config inválida da 500 config', async () => {
  const { response, body } = await run(chatRequest(), makeEnv({ ACCESS_CODE: undefined }));
  assert.equal(response.status, 500);
  assert.deepEqual(body, { error: 'config' });
});

test('código ausente o distinto da 401 y no cuenta', async () => {
  for (const code of [null, 'otro']) {
    const env = makeEnv();
    const { response, body, state } = await run(chatRequest({ code }), env);
    assert.equal(response.status, 401);
    assert.deepEqual(body, { error: 'unauthorized' });
    assert.equal(env.CHAT_KV.store.has(KEY), false);
    assert.equal(state.calls, 0);
  }
});

test('JSON inválido o entrada inválida da 400 y no cuenta', async () => {
  for (const request of [chatRequest({ raw: '{no es json' }), chatRequest({ body: { ...goodBody, message: '' } })]) {
    const env = makeEnv();
    const { response, body, state } = await run(request, env);
    assert.equal(response.status, 400);
    assert.deepEqual(body, { error: 'invalid_input' });
    assert.equal(env.CHAT_KV.store.has(KEY), false);
    assert.equal(state.calls, 0);
  }
});

test('límite alcanzado da 429, no llama al proveedor ni escribe', async () => {
  const env = makeEnv({ CHAT_KV: makeKv({ [KEY]: '100' }) });
  const { response, body, state } = await run(chatRequest(), env);
  assert.equal(response.status, 429);
  assert.deepEqual(body, { error: 'daily_limit' });
  assert.equal(state.calls, 0);
  assert.equal(env.CHAT_KV.store.get(KEY), '100');
});

test('ProviderError da 502 con su código y el contador sube', async () => {
  for (const code of ['bad_output', 'refused', 'rate_limit']) {
    const env = makeEnv();
    const providers = makeProviders(() => {
      throw new ProviderError(code);
    });
    const { response, body } = await run(chatRequest(), env, providers);
    assert.equal(response.status, 502);
    assert.deepEqual(body, { error: code });
    assert.equal(env.CHAT_KV.store.get(KEY), '1');
  }
});

test('ProviderError config da 500', async () => {
  const providers = makeProviders(() => {
    throw new ProviderError('config');
  });
  const { response, body } = await run(chatRequest(), makeEnv(), providers);
  assert.equal(response.status, 500);
  assert.deepEqual(body, { error: 'config' });
});

test('un error que no es ProviderError da 502 unavailable', async () => {
  const providers = makeProviders(() => {
    throw new Error('boom');
  });
  const { response, body } = await run(chatRequest(), makeEnv(), providers);
  assert.equal(response.status, 502);
  assert.deepEqual(body, { error: 'unavailable' });
});

test('éxito: 200 con reply, corrections, remaining y CORS', async () => {
  const providers = makeProviders(() => ({ reply: 'Salut !', corrections: [{ original: 'a', corrected: 'b', explanation: 'c' }] }));
  const env = makeEnv();
  const { response, body, state } = await run(chatRequest(), env, providers);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'application/json; charset=utf-8');
  assert.equal(response.headers.get('access-control-allow-origin'), ORIGIN);
  assert.equal(response.headers.get('vary'), 'Origin');
  assert.deepEqual(body, { reply: 'Salut !', corrections: [{ original: 'a', corrected: 'b', explanation: 'c' }], remaining: 99 });
  assert.equal(state.calls, 1);
  assert.deepEqual(state.created[0], { apiKey: 'clave-de-prueba', model: 'claude-haiku-5-5', effort: 'low' });
  assert.deepEqual(state.received[0], goodBody);
});

test('los errores de un origen permitido también llevan CORS', async () => {
  const { response } = await run(chatRequest({ code: 'otro' }));
  assert.equal(response.status, 401);
  assert.equal(response.headers.get('access-control-allow-origin'), ORIGIN);
});

test('si KV falla al reservar responde 502 unavailable con CORS', async () => {
  const kv = {
    async get() { throw new Error('kv caído'); },
    async put() { throw new Error('kv caído'); },
  };
  const { response, body, state } = await run(chatRequest(), makeEnv({ CHAT_KV: kv }));
  assert.equal(response.status, 502);
  assert.deepEqual(body, { error: 'unavailable' });
  assert.equal(response.headers.get('access-control-allow-origin'), ORIGIN);
  assert.equal(state.calls, 0);
});

// --- /lookup ---
const lookupOut = {
  contextTranslation: 'la escuela',
  lemma: 'école',
  lemmaTranslation: 'escuela',
  partOfSpeech: 'noun',
  gender: 'f',
  baseWithArticle: "l'école",
  sentenceTranslation: 'Voy a la escuela.',
};
const lookupBody = { lang: 'fr', word: 'école', sentence: 'Je vais à l’école.' };
const lookupRequest = (options = {}) => chatRequest({ path: '/lookup', body: lookupBody, ...options });

test('OPTIONS /lookup responde como /chat', async () => {
  const request = new Request('https://worker.example/lookup', { method: 'OPTIONS', headers: { origin: ORIGIN } });
  const { response } = await run(request);
  assert.equal(response.status, 204);
  assert.equal(response.headers.get('access-control-allow-origin'), ORIGIN);
  assert.equal(response.headers.get('access-control-allow-methods'), 'POST');
});

test('/lookup sin código → 401 y con otro origen → 403', async () => {
  assert.equal((await run(lookupRequest({ code: null }))).response.status, 401);
  assert.equal((await run(lookupRequest({ origin: 'https://malo.example' }))).response.status, 403);
});

test('/lookup con cuerpo inválido → 400 sin llamar al proveedor ni contar', async () => {
  const { response, body, state, env } = await run(lookupRequest({ body: { ...lookupBody, word: 'chat' } }), makeEnv(), makeProviders(() => lookupOut));
  assert.equal(response.status, 400);
  assert.deepEqual(body, { error: 'invalid_input' });
  assert.equal(state.calls, 0);
  assert.equal(env.CHAT_KV.store.size, 0);
});

test('/lookup responde 200 con la salida y remainingLookups; solo sube lookup:', async () => {
  const { response, body, state, env } = await run(lookupRequest(), makeEnv(), makeProviders(() => lookupOut));
  assert.equal(response.status, 200);
  assert.deepEqual(body, { ...lookupOut, remainingLookups: 199 });
  assert.deepEqual(state.received[0], lookupBody);
  assert.equal(env.CHAT_KV.store.get('lookup:2026-11-23'), '1');
  assert.equal(env.CHAT_KV.store.has(KEY), false);
});

test('la consulta número 201 del día → 429 lookup_limit sin llamar al proveedor', async () => {
  const env = makeEnv({ CHAT_KV: makeKv({ 'lookup:2026-11-23': '200' }) });
  const { response, body, state } = await run(lookupRequest(), env, makeProviders(() => lookupOut));
  assert.equal(response.status, 429);
  assert.deepEqual(body, { error: 'lookup_limit' });
  assert.equal(state.calls, 0);
});

test('un límite de mensajes agotado no bloquea /lookup', async () => {
  const env = makeEnv({ CHAT_KV: makeKv({ [KEY]: '100' }) });
  const { response } = await run(lookupRequest(), env, makeProviders(() => lookupOut));
  assert.equal(response.status, 200);
});

test('/lookup: ProviderError config → 500, otro ProviderError → 502, error raro → 502 unavailable', async () => {
  const cases = [
    [() => { throw new ProviderError('config'); }, 500, 'config'],
    [() => { throw new ProviderError('bad_output'); }, 502, 'bad_output'],
    [() => { throw new Error('raro'); }, 502, 'unavailable'],
  ];
  for (const [behavior, status, error] of cases) {
    const { response, body } = await run(lookupRequest(), makeEnv(), makeProviders(behavior));
    assert.equal(response.status, status);
    assert.deepEqual(body, { error });
  }
});

test('/lookup sin LOOKUP_LIMIT → 500 config', async () => {
  const { response } = await run(lookupRequest(), makeEnv({ LOOKUP_LIMIT: undefined }));
  assert.equal(response.status, 500);
});

// --- /story ---
const storySentence = 'Marie habite à Paris avec son chat noir et elle aime beaucoup le café du matin.';
const storyQuestion = {
  question: '¿Dónde vive Marie?',
  options: ['En París', 'En Lyon', 'En Niza'],
  answer: 0,
  explanation: 'El texto dice que vive en París.',
  evidence: 'Marie habite à Paris',
};
const storyOut = {
  title: 'Marie à Paris',
  body: Array(5).fill(storySentence).join(' '),
  questions: [storyQuestion, storyQuestion, storyQuestion, storyQuestion],
};
const storyBody = { lang: 'fr', level: 'A1.2', topic: 'la plage', quizLang: 'es' };
const storyRequest = (options = {}) => chatRequest({ path: '/story', body: storyBody, ...options });

test('OPTIONS /story responde como /chat', async () => {
  const request = new Request('https://worker.example/story', { method: 'OPTIONS', headers: { origin: ORIGIN } });
  const { response } = await run(request);
  assert.equal(response.status, 204);
  assert.equal(response.headers.get('access-control-allow-origin'), ORIGIN);
});

test('/story sin código → 401 y con otro origen → 403', async () => {
  assert.equal((await run(storyRequest({ code: null }))).response.status, 401);
  assert.equal((await run(storyRequest({ origin: 'https://malo.example' }))).response.status, 403);
});

test('/story con cuerpo inválido → 400 sin llamar al proveedor ni contar', async () => {
  const { response, body, state, env } = await run(storyRequest({ body: { ...storyBody, level: 'B2' } }), makeEnv(), makeProviders(() => storyOut));
  assert.equal(response.status, 400);
  assert.deepEqual(body, { error: 'invalid_input' });
  assert.equal(state.calls, 0);
  assert.equal(env.CHAT_KV.store.size, 0);
});

test('/story responde 200 con la historia y remainingStories; solo sube story:', async () => {
  const { response, body, state, env } = await run(storyRequest(), makeEnv(), makeProviders(() => storyOut));
  assert.equal(response.status, 200);
  assert.deepEqual(body, { ...storyOut, remainingStories: 4 });
  assert.deepEqual(state.received[0], storyBody);
  assert.equal(env.CHAT_KV.store.get('story:2026-11-23'), '1');
  assert.equal(env.CHAT_KV.store.size, 1);
});

test('la historia número 6 del día → 429 story_limit sin llamar al proveedor', async () => {
  const env = makeEnv({ CHAT_KV: makeKv({ 'story:2026-11-23': '5', 'count:2026-11-23': '3', 'lookup:2026-11-23': '7' }) });
  const { response, body, state } = await run(storyRequest(), env, makeProviders(() => storyOut));
  assert.equal(response.status, 429);
  assert.deepEqual(body, { error: 'story_limit' });
  assert.equal(state.calls, 0);
  assert.equal(env.CHAT_KV.store.get('count:2026-11-23'), '3');
  assert.equal(env.CHAT_KV.store.get('lookup:2026-11-23'), '7');
});

test('los límites de mensajes y consultas agotados no bloquean /story', async () => {
  const env = makeEnv({ CHAT_KV: makeKv({ 'count:2026-11-23': '100', 'lookup:2026-11-23': '200' }) });
  const { response } = await run(storyRequest(), env, makeProviders(() => storyOut));
  assert.equal(response.status, 200);
});

test('/story con salida inválida → 502 bad_output; ProviderError config → 500; error raro → 502 unavailable', async () => {
  const cases = [
    [() => ({ ...storyOut, questions: [] }), 502, 'bad_output'],
    [() => { throw new ProviderError('config'); }, 500, 'config'],
    [() => { throw new Error('boom'); }, 502, 'unavailable'],
  ];
  for (const [behavior, status, error] of cases) {
    const { response, body } = await run(storyRequest(), makeEnv(), makeProviders(behavior));
    assert.equal(response.status, status);
    assert.deepEqual(body, { error });
  }
});

test('/story sin STORY_LIMIT → 500 config', async () => {
  const { response } = await run(storyRequest(), makeEnv({ STORY_LIMIT: undefined }));
  assert.equal(response.status, 500);
});
