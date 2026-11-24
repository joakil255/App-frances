import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chileDate, reserveMessage } from '../src/limit.js';

// KV en memoria que recuerda las escrituras
function memoryKv() {
  const store = new Map();
  const puts = [];
  return {
    store,
    puts,
    async get(key) {
      return store.has(key) ? store.get(key) : null;
    },
    async put(key, value, options) {
      puts.push({ key, value, options });
      store.set(key, value);
    },
  };
}

test('chileDate usa la fecha de Santiago, no la UTC', () => {
  assert.equal(chileDate(new Date('2026-11-24T02:30:00Z')), '2026-11-23');
});

test('chileDate usa UTC-3 en horario de verano (distingue de un UTC-4 fijo)', () => {
  assert.equal(chileDate(new Date('2026-11-24T03:30:00Z')), '2026-11-24');
});

test('chileDate respeta el cambio de horario del 5 de abril de 2026', () => {
  // A las 03:00 UTC Chile pasa de -03 a -04: la medianoche local llega a las 04:00 UTC
  assert.equal(chileDate(new Date('2026-04-05T02:30:00Z')), '2026-04-04');
  assert.equal(chileDate(new Date('2026-04-05T03:30:00Z')), '2026-04-04');
  assert.equal(chileDate(new Date('2026-04-05T04:30:00Z')), '2026-04-05');
});

test('reserveMessage cuenta antes de responder y devuelve lo que queda', async () => {
  const kv = memoryKv();
  const date = new Date('2026-11-24T02:30:00Z');
  const first = await reserveMessage(kv, date, 100);
  assert.deepEqual(first, { ok: true, remaining: 99 });
  assert.equal(kv.store.get('count:2026-11-23'), '1');
  const second = await reserveMessage(kv, date, 100);
  assert.deepEqual(second, { ok: true, remaining: 98 });
  assert.equal(kv.store.get('count:2026-11-23'), '2');
});

test('reserveMessage guarda con expirationTtl de 172800', async () => {
  const kv = memoryKv();
  await reserveMessage(kv, new Date('2026-11-24T02:30:00Z'), 100);
  assert.deepEqual(kv.puts[0].options, { expirationTtl: 172800 });
});

test('reserveMessage rechaza el mensaje 101 sin escribir', async () => {
  const kv = memoryKv();
  kv.store.set('count:2026-11-23', '100');
  const result = await reserveMessage(kv, new Date('2026-11-24T02:30:00Z'), 100);
  assert.deepEqual(result, { ok: false });
  assert.equal(kv.puts.length, 0);
  assert.equal(kv.store.get('count:2026-11-23'), '100');
});

test('reserveMessage acepta el mensaje 100 con remaining 0', async () => {
  const kv = memoryKv();
  kv.store.set('count:2026-11-23', '99');
  const result = await reserveMessage(kv, new Date('2026-11-24T02:30:00Z'), 100);
  assert.deepEqual(result, { ok: true, remaining: 0 });
});

test('reserveMessage trata un valor dañado como cero', async () => {
  const kv = memoryKv();
  kv.store.set('count:2026-11-23', 'basura');
  const result = await reserveMessage(kv, new Date('2026-11-24T02:30:00Z'), 100);
  assert.deepEqual(result, { ok: true, remaining: 99 });
});
