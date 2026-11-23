import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadServiceWorker, getRequest } from './helpers/fake-sw-env.js';

// Crea un servidor falso con todos los archivos de la lista de caché
function setup({ missing } = {}) {
  const probe = loadServiceWorker();
  const urls = probe.read('PRECACHE_URLS');
  const files = {};
  for (const url of urls) if (url !== missing) files[url] = `contenido de ${url}`;
  files['extra.json'] = 'solo en la red';
  const sw = loadServiceWorker({ files });
  const cacheName = `app-frances-${sw.read('CACHE_VERSION')}`;
  return { sw, urls, cacheName };
}

test('install guarda cada archivo de la lista en la caché de la versión', async () => {
  const { sw, urls, cacheName } = setup();
  await sw.dispatch('install');
  const cache = await sw.caches.open(cacheName);
  for (const url of urls) {
    const response = await cache.match(url);
    assert.ok(response, `no se guardó ${url}`);
    assert.equal(await response.text(), `contenido de ${url}`);
  }
});

test('install falla entera si un archivo da 404', async () => {
  const { sw, urls } = setup({ missing: 'css/styles.css' });
  assert.ok(urls.includes('css/styles.css'));
  await assert.rejects(sw.dispatch('install'));
});

test('install no activa la versión nueva por su cuenta', async () => {
  const { sw } = setup();
  await sw.dispatch('install');
  assert.equal(sw.calls.skipWaiting, 0);
});

test('activate borra cachés viejas de la app y conserva las demás', async () => {
  const { sw, cacheName } = setup();
  await sw.caches.open('app-frances-v0');
  await sw.caches.open('otra-cache');
  await sw.dispatch('install');
  await sw.dispatch('activate');
  assert.deepEqual((await sw.caches.keys()).sort(), [cacheName, 'otra-cache'].sort());
  assert.equal(sw.calls.claim, 1);
});

test('sin conexión responde desde la caché', async () => {
  const { sw } = setup();
  await sw.dispatch('install');
  sw.setOnline(false);
  const { responded, response } = await sw.dispatch('fetch', { request: getRequest('css/styles.css') });
  assert.ok(responded);
  assert.equal(await response.text(), 'contenido de css/styles.css');
});

test('abrir la app sin conexión con parámetros devuelve index.html', async () => {
  const { sw } = setup();
  await sw.dispatch('install');
  sw.setOnline(false);
  const request = getRequest('?source=pwa', 'navigate');
  const { response } = await sw.dispatch('fetch', { request });
  assert.equal(await response.text(), 'contenido de index.html');
});

test('lo que no está en la caché se pide a la red', async () => {
  const { sw } = setup();
  await sw.dispatch('install');
  const { response } = await sw.dispatch('fetch', { request: getRequest('extra.json') });
  assert.equal(await response.text(), 'solo en la red');
});

test('no toca peticiones de otros sitios ni las que no son GET', async () => {
  const { sw } = setup();
  await sw.dispatch('install');
  const other = await sw.dispatch('fetch', { request: { url: 'https://otro.test/x', method: 'GET', mode: 'cors' } });
  assert.equal(other.responded, false);
  const post = await sw.dispatch('fetch', { request: { ...getRequest('css/styles.css'), method: 'POST' } });
  assert.equal(post.responded, false);
});

test('el mensaje SKIP_WAITING activa la versión nueva una vez', async () => {
  const { sw } = setup();
  await sw.dispatch('message', { data: { type: 'OTRA_COSA' } });
  assert.equal(sw.calls.skipWaiting, 0);
  await sw.dispatch('message', { data: { type: 'SKIP_WAITING' } });
  assert.equal(sw.calls.skipWaiting, 1);
});

test('install pide cada archivo a la red, saltándose la caché HTTP del navegador', async () => {
  const { sw, urls, cacheName } = setup();
  await sw.dispatch('install');
  const cache = await sw.caches.open(cacheName);
  assert.equal(cache.addAllRequests.length, urls.length);
  for (const request of cache.addAllRequests) {
    // Sin cache: 'reload', una versión nueva podría guardar archivos viejos (GitHub Pages: max-age=600)
    assert.equal(request.cache, 'reload', `sin cache: 'reload': ${request.url ?? request}`);
  }
});
