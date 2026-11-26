import { test } from 'node:test';
import assert from 'node:assert/strict';
import { costUsd, createUsageMeter } from '../eval/usage-meter.js';

const jsonResponse = (usage) => new Response(JSON.stringify({ usage }), { status: 200 });

test('costUsd: 0,10 USD por millón de entrada y 0,50 de salida', () => {
  assert.equal(costUsd({ input: 1e6, output: 0 }), 0.1);
  assert.equal(costUsd({ input: 0, output: 1e6 }), 0.5);
  assert.equal(costUsd({ input: 0, output: 0 }), 0);
});

test('suma los tokens de cada respuesta y deja la respuesta legible', async () => {
  const replies = [{ input_tokens: 10, output_tokens: 5 }, { input_tokens: 20, output_tokens: 7 }];
  const meter = createUsageMeter(async () => jsonResponse(replies.shift()));
  const first = await meter.fetch('https://example.test');
  assert.deepEqual(meter.takeLast(), { input: 10, output: 5 });
  assert.deepEqual((await first.json()).usage, { input_tokens: 10, output_tokens: 5 });
  await meter.fetch('https://example.test');
  assert.deepEqual(meter.takeLast(), { input: 20, output: 7 });
  assert.deepEqual(meter.total, { input: 30, output: 12 });
});

test('una respuesta que no es JSON o sin usage suma 0 y no lanza', async () => {
  const replies = [new Response('no es json', { status: 500 }), jsonResponse(undefined)];
  const meter = createUsageMeter(async () => replies.shift());
  await meter.fetch('https://example.test');
  await meter.fetch('https://example.test');
  assert.deepEqual(meter.total, { input: 0, output: 0 });
  assert.deepEqual(meter.takeLast(), { input: 0, output: 0 });
});

test('takeLast no arrastra el uso de la respuesta anterior', async () => {
  const replies = [jsonResponse({ input_tokens: 4, output_tokens: 2 }), new Response('no es json')];
  const meter = createUsageMeter(async () => replies.shift());
  await meter.fetch('https://example.test');
  await meter.fetch('https://example.test');
  assert.deepEqual(meter.takeLast(), { input: 0, output: 0 });
  assert.deepEqual(meter.total, { input: 4, output: 2 });
});
