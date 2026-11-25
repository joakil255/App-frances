// Prueba que une los dos lados: lo que envía la app lo debe aceptar el servidor
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { appendExchange, buildRequestBody } from '../../js/lib/chat.js';
import { validateChatInput } from '../src/validate.js';
import { handleRequest } from '../src/handler.js';

const ORIGIN = 'https://joakil255.github.io';

function twoExchanges() {
  let turns = [];
  turns = appendExchange(turns, 'Bonjour é😀', { reply: 'Salut !', corrections: [] });
  turns = appendExchange(turns, 'Je suis Joaquín', { reply: 'Enchanté !', corrections: [] });
  return turns;
}

test('el cuerpo real de la app (con historia) pasa validateChatInput', () => {
  const body = buildRequestBody({ level: 'A1.2', turns: twoExchanges(), message: 'Ça va ?' });
  assert.equal(body.history.length, 4);
  assert.equal(validateChatInput(body).ok, true);
});

test('handleRequest responde 200 y el proveedor recibe la historia como role/content', async () => {
  const body = buildRequestBody({ level: 'A1.2', turns: twoExchanges(), message: 'Ça va ?' });
  const received = [];
  const providers = {
    claude: () => ({
      async chat(input) {
        received.push(input);
        return { reply: 'Oui !', corrections: [] };
      },
    }),
  };
  const kv = { async get() { return null; }, async put() {} };
  const env = {
    AI_PROVIDER: 'claude', AI_MODEL: 'm', AI_EFFORT: 'low', DAILY_LIMIT: '100', LOOKUP_LIMIT: '200', STORY_LIMIT: '5', SENTENCE_LIMIT: '50',
    ALLOWED_ORIGINS: ORIGIN, ANTHROPIC_API_KEY: 'k', ACCESS_CODE: 'c', CHAT_KV: kv,
  };
  const request = new Request('https://worker.test/chat', {
    method: 'POST',
    headers: { origin: ORIGIN, authorization: 'Bearer c', 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const response = await handleRequest(request, env, { providers });
  assert.equal(response.status, 200);
  assert.deepEqual(received[0].history, [
    { role: 'user', content: 'Bonjour é😀' },
    { role: 'assistant', content: 'Salut !' },
    { role: 'user', content: 'Je suis Joaquín' },
    { role: 'assistant', content: 'Enchanté !' },
  ]);
  assert.equal(received[0].message, 'Ça va ?');
});
