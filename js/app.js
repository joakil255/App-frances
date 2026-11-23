// Arranque de la app: navegación entre pantallas sin recargar la página
import { SCREENS, resolveRoute } from './lib/router.js';

const APP_NAME = 'App de francés';
let currentId = null;

// Muestra una pantalla, oculta las demás y marca su enlace como activo
function showScreen(id, moveFocus) {
  for (const screen of SCREENS) {
    const section = document.getElementById(`screen-${screen.id}`);
    section.hidden = screen.id !== id;
  }

  for (const link of document.querySelectorAll('.nav-link')) {
    const linkId = resolveRoute(link.getAttribute('href'));
    if (linkId === id) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }

  const { title } = SCREENS.find((s) => s.id === id);
  document.title = `${title} · ${APP_NAME}`;

  // El foco va al título para que el lector de pantalla anuncie dónde estás
  if (moveFocus) document.querySelector(`#screen-${id} h1`).focus();
  currentId = id;
}

function handleRoute(isFirstLoad) {
  const id = resolveRoute(location.hash);
  if (id === null) {
    // Ancla normal (p. ej. «Saltar al contenido»): no cambia de pantalla
    if (currentId === null) showScreen('home', false);
    return;
  }
  if (id !== currentId) showScreen(id, !isFirstLoad);
}

window.addEventListener('hashchange', () => handleRoute(false));
handleRoute(true);
