import { test } from 'node:test';
import assert from 'node:assert/strict';
import { VOICE_KEY, createVoiceStore } from '../js/lib/voice-settings.js';
import { StorageError } from '../js/lib/storage.js';

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
}

const DEFAULTS = { listenFirst: true, privacyAccepted: false };

test('la clave tiene el valor del diseño', () => {
  assert.equal(VOICE_KEY, 'app-frances-voice');
});

test('sin datos devuelve los valores por defecto', () => {
  assert.deepEqual(createVoiceStore(new MemoryStorage()).load(), DEFAULTS);
});

test('guarda y lee', () => {
  const backend = new MemoryStorage();
  const store = createVoiceStore(backend);
  store.save({ listenFirst: false, privacyAccepted: true });
  assert.deepEqual(store.load(), { listenFirst: false, privacyAccepted: true });
  assert.equal(JSON.parse(backend.getItem(VOICE_KEY)).schemaVersion, 1);
});

test('datos dañados dan los valores por defecto sin lanzar', () => {
  const bad = [
    'no es json',
    JSON.stringify({ schemaVersion: 2, listenFirst: false, privacyAccepted: true }),
    JSON.stringify({ schemaVersion: 1, listenFirst: 'si', privacyAccepted: true }),
    JSON.stringify({ schemaVersion: 1, listenFirst: false, privacyAccepted: 1 }),
    'null',
  ];
  for (const raw of bad) {
    assert.deepEqual(createVoiceStore(new MemoryStorage({ [VOICE_KEY]: raw })).load(), DEFAULTS, raw);
  }
});

test('un getItem que lanza da los valores por defecto', () => {
  const backend = new MemoryStorage();
  backend.failGet = new Error('bloqueado');
  assert.deepEqual(createVoiceStore(backend).load(), DEFAULTS);
});

test('save con la cuota llena lanza StorageError quota', () => {
  const backend = new MemoryStorage();
  const error = new Error('lleno');
  error.name = 'QuotaExceededError';
  backend.failSet = error;
  assert.throws(
    () => createVoiceStore(backend).save(DEFAULTS),
    (e) => e instanceof StorageError && e.code === 'quota',
  );
});
