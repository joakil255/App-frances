// Service worker: guarda la app para que funcione sin conexión.
//
// Estrategia «copia completa con número de versión»:
// 1. install:  descarga TODOS los archivos de PRECACHE_URLS en la caché
//              «app-frances-<versión>». Si falta uno, la instalación falla
//              entera y la versión anterior sigue funcionando.
//              No se activa sola: espera a que el usuario pulse «Actualizar».
// 2. activate: borra las cachés de versiones anteriores de la app.
// 3. fetch:    responde desde la caché (rápido y sin conexión). Abrir o
//              recargar la app siempre devuelve index.html guardado.
//              Lo que no esté guardado se pide a la red.
//
// IMPORTANTE: cada vez que cambie cualquier archivo de la app, sube
// CACHE_VERSION (v1 → v2 → …). Si no, los teléfonos no se enteran del cambio.

const CACHE_VERSION = 'v14';
const CACHE_PREFIX = 'app-frances-';
const CACHE_NAME = CACHE_PREFIX + CACHE_VERSION;

// Todos los archivos que la app necesita (rutas relativas a este archivo)
const PRECACHE_URLS = [
  'index.html',
  'manifest.webmanifest',
  'css/styles.css',
  'js/app.js',
  'js/lib/router.js',
  'js/lib/words.js',
  'js/lib/csv.js',
  'js/lib/transfer.js',
  'js/lib/storage.js',
  'js/lib/speech.js',
  'js/lib/dates.js',
  'js/lib/scheduler.js',
  'js/lib/queue.js',
  'js/lib/study-storage.js',
  'js/lib/answer-check.js',
  'js/lib/quiz.js',
  'js/lib/stats.js',
  'js/lib/deck.js',
  'js/lib/messages.js',
  'js/lib/backup.js',
  'js/screens/vocabulary.js',
  'js/screens/voice.js',
  'js/screens/study.js',
  'js/screens/quiz.js',
  'js/screens/progress.js',
  'js/data/initial-words.js',
  'js/update.js',
  'data/a1-deck.json',
  'fonts/barlow-semi-condensed-500.woff2',
  'fonts/barlow-semi-condensed-700.woff2',
  'fonts/source-serif-4.woff2',
  'fonts/source-serif-4-italic.woff2',
  'icons/icon.svg',
  'icons/icon-maskable.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
];

self.addEventListener('install', (event) => {
  // cache: 'reload' pide cada archivo a la red, saltándose la caché HTTP del
  // navegador (GitHub Pages la mantiene 10 min): así una versión nueva nunca
  // guarda archivos de la anterior.
  const requests = PRECACHE_URLS.map((url) => new Request(new URL(url, self.location), { cache: 'reload' }));
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(requests)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
            .map((name) => caches.delete(name)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  // Solo peticiones GET de este mismo sitio; lo demás pasa sin tocar
  if (request.method !== 'GET') return;
  if (new URL(request.url).origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    // Abrir o recargar la app: siempre la página guardada
    const indexUrl = new URL('index.html', self.location).href;
    event.respondWith(caches.match(indexUrl).then((cached) => cached || fetch(request)));
    return;
  }

  event.respondWith(caches.match(request).then((cached) => cached || fetch(request)));
});

// El botón «Actualizar» envía este mensaje para activar la versión nueva
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
