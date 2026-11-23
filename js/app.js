// Arranque de la app: navegación entre pantallas sin recargar la página
// y registro del service worker (funcionamiento sin conexión)
import { SCREENS, resolveRoute } from './lib/router.js';
import { watchForUpdates, applyUpdate } from './update.js';

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

// Muestra el aviso «Actualizar» cuando hay una versión nueva esperando
function showUpdateBanner(worker) {
  const banner = document.querySelector('.update-banner');
  const button = banner.querySelector('.update-button');
  button.onclick = () => {
    button.disabled = true;
    applyUpdate(worker, navigator.serviceWorker, () => location.reload());
  };
  banner.hidden = false;
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('./sw.js')
    .then((registration) => watchForUpdates(registration, navigator.serviceWorker, showUpdateBanner))
    .catch((error) => console.warn('No se pudo registrar el service worker:', error));
}
