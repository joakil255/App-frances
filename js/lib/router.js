// Pantallas de la app: id en código, dirección visible (#/path) y título.
// Primero los tres destinos; las de segundo nivel dicen de cuál cuelgan (parent).
export const SCREENS = [
  { id: 'learn', path: 'aprende', title: 'Aprende' },
  { id: 'practice', path: 'practica', title: 'Practica' },
  { id: 'progress', path: 'progreso', title: 'Progreso' },
  { id: 'vocabulary', path: 'vocabulario', title: 'Palabras', parent: 'practice' },
  { id: 'study', path: 'estudiar', title: 'Estudiar', parent: 'practice' },
  { id: 'quiz', path: 'quiz', title: 'Quiz', parent: 'practice' },
  { id: 'reader', path: 'leer', title: 'Leer', parent: 'practice' },
  { id: 'chat', path: 'conversar', title: 'Conversar', parent: 'practice' },
  { id: 'build', path: 'construir', title: 'Construir frases', parent: 'learn' },
];

// Los destinos de primer nivel, en orden
export const TABS = SCREENS.filter((s) => !s.parent);

// El destino al que pertenece una pantalla (ella misma si ya es un destino)
export function tabFor(id) {
  const screen = SCREENS.find((s) => s.id === id);
  return screen?.parent ?? id;
}

// Separa «#/leer/<id>» en la ruta («leer») y el id (sin cambiar mayúsculas)
function splitHash(hash) {
  const [path, param = '', ...extra] = hash.slice(2).replace(/\/$/, '').split('/');
  return { path: path.toLowerCase(), param, extra };
}

// Solo el lector y Construir llevan un id (o «repaso») en la dirección
const PARAM_PATHS = ['leer', 'construir'];

// Convierte location.hash en el id de una pantalla.
// Devuelve null si el hash es un ancla normal (p. ej. "#main") y no una pantalla.
export function resolveRoute(hash) {
  if (hash === '' || hash === '#') return 'learn';
  if (!hash.startsWith('#/')) return null;

  const { path, param, extra } = splitHash(hash);
  const hasId = PARAM_PATHS.includes(path) && extra.length === 0;
  const full = hasId ? path : [path, param, ...extra].filter(Boolean).join('/');
  const screen = SCREENS.find((s) => s.path === full);
  return screen ? screen.id : 'learn';
}

// El id de «#/leer/<id>» tal como está escrito, o null
export function routeParam(hash) {
  if (!hash.startsWith('#/')) return null;
  const { path, param, extra } = splitHash(hash);
  return PARAM_PATHS.includes(path) && param !== '' && extra.length === 0 ? param : null;
}
