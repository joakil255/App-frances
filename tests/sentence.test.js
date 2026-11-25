import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sentenceUrl, sendSentence } from '../js/lib/sentence.js';
import { PRODUCTION_CHAT_URL } from '../js/lib/chat.js';

const ERROR = { original: 'Je mangez', corrected: 'Je mange', kind: 'grammar', explanation: 'Con je, mange.' };
const OK = { correct: false, corrected: 'Je mange.', errors: [ERROR], suggestion: 'Je mange une pomme.', remainingSentences: 7 };
const reply = (status, body) => async () => ({ ok: status < 400, status, json: async () => body });
const send = (fetch, extra = {}) => sendSentence({ url: 'u', code: 'c', body: {}, fetch, isOnline: true, ...extra });

test('sentenceUrl cambia /chat por /sentence', () => {
  assert.equal(sentenceUrl('example.com'), PRODUCTION_CHAT_URL.replace(/\/chat$/, '/sentence'));
  assert.equal(sentenceUrl('localhost'), 'http://127.0.0.1:8787/sentence');
});

test('sendSentence devuelve el resultado y renombra remainingSentences a remaining', async () => {
  const out = await send(reply(200, OK));
  assert.deepEqual(out, {
    ok: true,
    result: { correct: false, corrected: 'Je mange.', errors: [ERROR], suggestion: 'Je mange une pomme.', remaining: 7 },
  });
});

test('sendSentence: sin conexión no llama a fetch', async () => {
  let calls = 0;
  const out = await send(async () => { calls += 1; return reply(200, OK)(); }, { isOnline: false });
  assert.deepEqual(out, { ok: false, error: 'offline' });
  assert.equal(calls, 0);
});

test('sendSentence: sentence_limit y JSON roto', async () => {
  assert.deepEqual(await send(reply(429, { error: 'sentence_limit' })), { ok: false, error: 'sentence_limit' });
  assert.deepEqual(await send(async () => ({ ok: true, status: 200, json: async () => { throw new SyntaxError('x'); } })),
    { ok: false, error: 'bad_output' });
});

test('sendSentence: campos que faltan o con otro tipo son bad_output', async () => {
  const bads = [null, {}, { ...OK, correct: 'sí' }, { ...OK, corrected: 1 }, { ...OK, errors: 'x' },
    { ...OK, suggestion: null }, { ...OK, remainingSentences: '7' },
    { ...OK, errors: [null] }, { ...OK, errors: ['verbo'] }, { ...OK, errors: [{ ...ERROR, explanation: undefined }] },
    { ...OK, errors: [{ ...ERROR, kind: 1 }] }];
  for (const bad of bads) {
    assert.deepEqual(await send(reply(200, bad)), { ok: false, error: 'bad_output' });
  }
});
