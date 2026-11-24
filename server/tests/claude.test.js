import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createClaudeAdapter } from '../src/providers/claude.js';
import { PROVIDERS } from '../src/providers/index.js';
import { buildSystemPrompt } from '../src/prompt.js';

const json = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const okBody = (content, stop_reason = 'end_turn') => ({
  id: 'msg_1', type: 'message', role: 'assistant', model: 'claude-haiku-5-5',
  content, stop_reason, stop_sequence: null,
  usage: { input_tokens: 1, output_tokens: 1 },
});

const textBody = (obj) => okBody([{ type: 'text', text: typeof obj === 'string' ? obj : JSON.stringify(obj) }]);

const errBody = (type, details) => ({ type: 'error', error: { type, message: 'x', ...(details ? { details } : {}) } });

function adapterWith(fetch) {
  return createClaudeAdapter({ apiKey: 'test-key', model: 'claude-haiku-5-5', effort: 'low', fetch, maxRetries: 0 });
}
const input = { level: 'A1.2', history: [], message: 'Bonjour' };
const goodOutput = { reply: 'Salut !', corrections: [] };

async function codeOf(fetch, body = input) {
  try {
    await adapterWith(fetch).chat(body);
  } catch (error) {
    assert.equal(error.name, 'ProviderError');
    return error.code;
  }
  assert.fail('debía fallar');
}

test('PROVIDERS expone el adaptador de claude', () => {
  assert.equal(PROVIDERS.claude, createClaudeAdapter);
});

test('arma la petición', async () => {
  let sent;
  const fetch = async (url, init) => {
    sent = JSON.parse(init.body);
    return json(200, textBody(goodOutput));
  };
  const history = [
    { role: 'user', content: 'Salut', extra: 'x' },
    { role: 'assistant', content: 'Ça va ?' },
  ];
  await adapterWith(fetch).chat({ level: 'A1.2', history, message: 'Ça va bien' });
  assert.equal(sent.model, 'claude-haiku-5-5');
  assert.equal(sent.max_tokens, 4000);
  assert.equal(sent.output_config.effort, 'low');
  assert.equal(sent.output_config.format.type, 'json_schema');
  assert.equal(sent.system, buildSystemPrompt('A1.2'));
  assert.deepEqual(sent.messages, [
    { role: 'user', content: 'Salut' },
    { role: 'assistant', content: 'Ça va ?' },
    { role: 'user', content: 'Ça va bien' },
  ]);
  for (const key of ['thinking', 'temperature', 'top_p', 'top_k']) assert.equal(key in sent, false);
});

test('normaliza la respuesta de texto JSON', async () => {
  const out = { reply: 'Salut !', corrections: [{ original: 'je habite', corrected: "j'habite", explanation: 'Elisión.' }] };
  assert.deepEqual(await adapterWith(async () => json(200, textBody(out))).chat(input), out);
});

test('busca el bloque de texto tras bloques thinking', async () => {
  const body = okBody([
    { type: 'thinking', thinking: 'hmm', signature: 'sig' },
    { type: 'text', text: JSON.stringify(goodOutput) },
  ]);
  assert.deepEqual(await adapterWith(async () => json(200, body)).chat(input), goodOutput);
});

test('errores HTTP se traducen a códigos', async () => {
  const cases = [
    [401, errBody('authentication_error'), 'auth'],
    [403, errBody('permission_error'), 'auth'],
    [402, errBody('billing_error'), 'quota'],
    [429, errBody('rate_limit_error', { error_code: 'enforced_spend_limit_reached' }), 'quota'],
    [429, errBody('rate_limit_error', { error_code: 'contract_spend_limit_reached' }), 'quota'],
    [429, errBody('rate_limit_error'), 'rate_limit'],
    [500, errBody('api_error'), 'unavailable'],
    [529, errBody('overloaded_error'), 'unavailable'],
    [400, errBody('invalid_request_error'), 'config'],
    [404, errBody('not_found_error'), 'config'],
  ];
  for (const [status, body, code] of cases) {
    assert.equal(await codeOf(async () => json(status, body)), code, `status ${status}`);
  }
});

test('un fallo de red es unavailable', async () => {
  assert.equal(await codeOf(async () => { throw new TypeError('fetch failed'); }), 'unavailable');
});

test('stop_reason refusal es refused', async () => {
  const body = okBody([{ type: 'text', text: '' }], 'refusal');
  assert.equal(await codeOf(async () => json(200, body)), 'refused');
});

test('max_tokens o texto que no es JSON es bad_output', async () => {
  const cut = okBody([{ type: 'text', text: '{"reply":"Sal' }], 'max_tokens');
  assert.equal(await codeOf(async () => json(200, cut)), 'bad_output');
  assert.equal(await codeOf(async () => json(200, textBody('hola, no es JSON'))), 'bad_output');
  assert.equal(await codeOf(async () => json(200, okBody([]))), 'bad_output');
  assert.equal(await codeOf(async () => json(200, textBody({ reply: 'x' }))), 'bad_output');
});
