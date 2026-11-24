import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLookupCache, LOOKUP_CACHE_KEY } from '../js/lib/lookup-cache.js';

class MemoryStorage {
  constructor(initial = {}) {
    this.data = new Map(Object.entries(initial));
    this.failSet = null;
  }
  getItem(key) {
    this.reads = (this.reads ?? 0) + 1;
    return this.data.has(key) ? this.data.get(key) : null;
  }
  setItem(key, value) {
    if (this.failSet) throw this.failSet;
    this.data.set(key, String(value));
  }
}

const result = (lemma) => ({ lemma, contextTranslation: 'x' });
const counter = () => {
  let t = 0;
  return () => ++t;
};

test('guarda y lee una consulta; la clave ignora mayúsculas, apóstrofo y espacios de la frase', () => {
  const cache = createLookupCache(new MemoryStorage(), { now: counter() });
  assert.equal(cache.get('fr', 'manges', 'Tu manges.'), null);
  cache.set('fr', "Aujourd’hui", ' Il  fait beau  aujourd’hui. ', result('aujourd\'hui'));
  assert.deepEqual(cache.get('fr', "aujourd'hui", 'Il fait beau aujourd’hui.'), result("aujourd'hui"));
  assert.equal(cache.get('en', "aujourd'hui", 'Il fait beau aujourd’hui.'), null);
});

test('el tope descarta la entrada usada hace más tiempo', () => {
  const backend = new MemoryStorage();
  const cache = createLookupCache(backend, { max: 3, now: counter() });
  cache.set('fr', 'a', 's', result('a'));
  cache.set('fr', 'b', 's', result('b'));
  cache.set('fr', 'c', 's', result('c'));
  cache.get('fr', 'a', 's'); // a se usa de nuevo: b queda como la más antigua
  cache.set('fr', 'd', 's', result('d'));
  assert.equal(cache.get('fr', 'b', 's'), null);
  assert.ok(cache.get('fr', 'a', 's'));
  assert.ok(cache.get('fr', 'c', 's'));
  assert.ok(cache.get('fr', 'd', 's'));
  assert.equal(JSON.parse(backend.getItem(LOOKUP_CACHE_KEY)).entries.length, 3);
});

test('el tope por defecto es 500', () => {
  const backend = new MemoryStorage();
  const cache = createLookupCache(backend, { now: counter() });
  for (let i = 0; i < 501; i += 1) cache.set('fr', `w${i}`, 's', result(`w${i}`));
  assert.equal(JSON.parse(backend.getItem(LOOKUP_CACHE_KEY)).entries.length, 500);
  assert.equal(cache.get('fr', 'w0', 's'), null);
  assert.ok(cache.get('fr', 'w500', 's'));
});

test('los datos dañados se tratan como caché vacía, sin lanzar', () => {
  for (const raw of ['no es json', '{"schemaVersion":9,"entries":[]}', '{"schemaVersion":1,"entries":"x"}',
    '{"schemaVersion":1,"entries":[{"key":1}]}', 'null']) {
    const cache = createLookupCache(new MemoryStorage({ [LOOKUP_CACHE_KEY]: raw }), { now: counter() });
    assert.equal(cache.get('fr', 'a', 's'), null);
    cache.set('fr', 'a', 's', result('a'));
    assert.ok(cache.get('fr', 'a', 's'));
  }
});

test('un setItem que lanza no rompe set ni get', () => {
  const backend = new MemoryStorage();
  backend.failSet = Object.assign(new Error('lleno'), { name: 'QuotaExceededError' });
  const cache = createLookupCache(backend, { now: counter() });
  assert.doesNotThrow(() => cache.set('fr', 'a', 's', result('a')));
  assert.equal(cache.get('fr', 'a', 's'), null);
});

test('peek lee sin escribir ni cambiar usedAt', () => {
  const backend = new MemoryStorage();
  let t = 0;
  const cache = createLookupCache(backend, { now: () => ++t });
  cache.set('fr', 'a', 's', result('a'));
  const before = backend.getItem(LOOKUP_CACHE_KEY);
  backend.failSet = new Error('no debe escribir');
  assert.deepEqual(cache.peek('fr', 'a', 's'), result('a'));
  assert.equal(cache.peek('fr', 'zzz', 's'), null);
  assert.equal(backend.getItem(LOOKUP_CACHE_KEY), before);
});

test('100 peek seguidos leen el almacenamiento una sola vez', () => {
  const backend = new MemoryStorage();
  const cache = createLookupCache(backend, { now: counter() });
  cache.set('fr', 'a', 's', result('a'));
  const other = createLookupCache(backend, { now: counter() });
  backend.reads = 0;
  for (let i = 0; i < 100; i += 1) assert.ok(other.peek('fr', 'a', 's'));
  assert.ok(backend.reads <= 1);
});
