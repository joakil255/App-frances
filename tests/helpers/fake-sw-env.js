// Entorno falso para ejecutar sw.js dentro de Node (node:vm).
// Imita lo mínimo del navegador: self, caches (en memoria) y fetch.
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const SW_SOURCE = readFileSync(new URL('../../sw.js', import.meta.url), 'utf8');

export const BASE = 'https://example.test/App-frances/';

// Convierte una petición (texto u objeto) en la clave de la caché
function keyOf(request) {
  const url = typeof request === 'string' ? request : request.url;
  return new URL(url, BASE).href;
}

class FakeCache {
  constructor(fetchFn) {
    this.store = new Map();
    this.fetch = fetchFn;
    this.addAllRequests = []; // lo que recibió addAll, para comprobar opciones como cache: 'reload'
  }

  // Como en el navegador: si una respuesta no es «ok», falla todo y no guarda nada
  async addAll(urls) {
    this.addAllRequests.push(...urls);
    const entries = await Promise.all(
      urls.map(async (url) => {
        const response = await this.fetch(keyOf(url));
        if (!response.ok) throw new TypeError(`addAll falló: ${keyOf(url)} → ${response.status}`);
        return [keyOf(url), response];
      }),
    );
    for (const [key, response] of entries) this.store.set(key, response);
  }

  async match(request) {
    const response = this.store.get(keyOf(request));
    return response ? response.clone() : undefined;
  }
}

class FakeCacheStorage {
  constructor(fetchFn) {
    this.caches = new Map();
    this.fetch = fetchFn;
  }

  async open(name) {
    if (!this.caches.has(name)) this.caches.set(name, new FakeCache(this.fetch));
    return this.caches.get(name);
  }

  async keys() {
    return [...this.caches.keys()];
  }

  async delete(name) {
    return this.caches.delete(name);
  }

  async match(request) {
    for (const cache of this.caches.values()) {
      const response = await cache.match(request);
      if (response) return response;
    }
    return undefined;
  }
}

// files: { 'ruta/relativa': 'contenido' } que «existen» en el servidor
export function loadServiceWorker({ files = {} } = {}) {
  let online = true;
  const fetchFn = async (request) => {
    if (!online) throw new TypeError('Failed to fetch');
    const url = keyOf(request);
    const path = url.startsWith(BASE) ? url.slice(BASE.length).split('?')[0] : null;
    if (path !== null && path in files) return new Response(files[path], { status: 200 });
    return new Response('no encontrado', { status: 404 });
  };

  const caches = new FakeCacheStorage(fetchFn);
  const listeners = {};
  const calls = { skipWaiting: 0, claim: 0 };

  const self = {
    location: new URL('sw.js', BASE),
    addEventListener(type, handler) {
      (listeners[type] ||= []).push(handler);
    },
    skipWaiting() {
      calls.skipWaiting += 1;
      return Promise.resolve();
    },
    clients: {
      claim() {
        calls.claim += 1;
        return Promise.resolve();
      },
    },
  };

  const ctx = vm.createContext({ self, caches, fetch: fetchFn, URL, Request, Response, console });
  vm.runInContext(SW_SOURCE, ctx, { filename: 'sw.js' });

  // Lanza un evento y espera a todo lo que el service worker pidió esperar
  async function dispatch(type, init = {}) {
    const pending = [];
    let responded = false;
    let response;
    const event = {
      ...init,
      waitUntil(promise) {
        pending.push(promise);
      },
      respondWith(promise) {
        responded = true;
        response = promise;
      },
    };
    for (const handler of listeners[type] || []) handler(event);
    await Promise.all(pending);
    return { responded, response: responded ? await response : undefined };
  }

  return {
    dispatch,
    caches,
    calls,
    setOnline(value) {
      online = value;
    },
    read(name) {
      return vm.runInContext(name, ctx);
    },
  };
}

// Peticiones de ejemplo con la forma que usa sw.js
export function getRequest(path, mode = 'no-cors') {
  return { url: new URL(path, BASE).href, method: 'GET', mode };
}
