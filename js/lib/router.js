// Pantallas de la app: id en código, dirección visible (#/path) y título
export const SCREENS = [
  { id: 'home', path: '', title: 'Inicio' },
  { id: 'vocabulary', path: 'vocabulario', title: 'Vocabulario' },
  { id: 'study', path: 'estudiar', title: 'Estudiar' },
  { id: 'quiz', path: 'quiz', title: 'Quiz' },
  { id: 'progress', path: 'progreso', title: 'Progreso' },
];

// Convierte location.hash en el id de una pantalla.
// Devuelve null si el hash es un ancla normal (p. ej. "#main") y no una pantalla.
export function resolveRoute(hash) {
  if (hash === '' || hash === '#') return 'home';
  if (!hash.startsWith('#/')) return null;

  const path = hash.slice(2).replace(/\/$/, '').toLowerCase();
  const screen = SCREENS.find((s) => s.path === path);
  return screen ? screen.id : 'home';
}
