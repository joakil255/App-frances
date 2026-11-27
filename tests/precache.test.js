import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync } from 'node:fs';
import { loadServiceWorker } from './helpers/fake-sw-env.js';

const root = new URL('../', import.meta.url);
const PRECACHE_URLS = loadServiceWorker().read('PRECACHE_URLS');
const CACHED_EXTENSIONS = ['.css', '.js', '.json', '.woff2', '.svg', '.png'];

// Lista los archivos de una carpeta (y subcarpetas) con rutas relativas a la raíz
function listFiles(dir) {
  return readdirSync(new URL(dir, root), { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => `${entry.parentPath.slice(new URL(root).pathname.length)}/${entry.name}`.replace(/^\//, ''));
}

test('cada archivo de la lista de caché existe', () => {
  for (const url of PRECACHE_URLS) {
    assert.ok(existsSync(new URL(url, root)), `no existe ${url}`);
  }
});

test('la lista de caché no tiene rutas absolutas ni repetidas', () => {
  for (const url of PRECACHE_URLS) assert.ok(!url.startsWith('/'), `ruta absoluta: ${url}`);
  assert.equal(new Set(PRECACHE_URLS).size, PRECACHE_URLS.length);
});

test('todo archivo que la app necesita está en la lista de caché', () => {
  const needed = ['index.html', 'manifest.webmanifest'];
  for (const dir of ['css', 'js', 'data', 'fonts', 'icons']) {
    needed.push(...listFiles(dir).filter((file) => CACHED_EXTENSIONS.some((ext) => file.endsWith(ext))));
  }
  for (const file of needed) {
    assert.ok(PRECACHE_URLS.includes(file), `falta en PRECACHE_URLS: ${file}`);
  }
});

test('la caché sube a v28 (arreglo del repaso)', () => {
  assert.equal(loadServiceWorker().read('CACHE_VERSION'), 'v28');
  assert.ok(PRECACHE_URLS.includes('js/lib/reader-prefs.js'));
});
