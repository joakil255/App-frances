// Pantallas de la app: id en código, dirección visible (#/path) y título
export const SCREENS = [
  { id: 'home', path: '', title: 'Inicio' },
  { id: 'vocabulary', path: 'vocabulario', title: 'Vocabulario' },
  { id: 'study', path: 'estudiar', title: 'Estudiar' },
  { id: 'quiz', path: 'quiz', title: 'Quiz' },
  { id: 'progress', path: 'progreso', title: 'Progreso' },
  { id: 'chat', path: 'conversar', title: 'Conversar' },
  { id: 'reader', path: 'leer', title: 'Leer' },
];

// Separa «#/leer/<id>» en la ruta («leer») y el id (sin cambiar mayúsculas)
function splitHash(hash) {
  const [path, param = '', ...extra] = hash.slice(2).replace(/\/$/, '').split('/');
  return { path: path.toLowerCase(), param, extra };
}

// Solo el lector lleva un id en la dirección
const PARAM_PATHS = ['leer'];

// Convierte location.hash en el id de una pantalla.
// Devuelve null si el hash es un ancla normal (p. ej. "#main") y no una pantalla.
export function resolveRoute(hash) {
  if (hash === '' || hash === '#') return 'home';
  if (!hash.startsWith('#/')) return null;

  const { path, param, extra } = splitHash(hash);
  const hasId = PARAM_PATHS.includes(path) && extra.length === 0;
  const full = hasId ? path : [path, param, ...extra].filter(Boolean).join('/');
  const screen = SCREENS.find((s) => s.path === full);
  return screen ? screen.id : 'home';
}

// El id de «#/leer/<id>» tal como está escrito, o null
export function routeParam(hash) {
  if (!hash.startsWith('#/')) return null;
  const { path, param, extra } = splitHash(hash);
  return PARAM_PATHS.includes(path) && param !== '' && extra.length === 0 ? param : null;
}
