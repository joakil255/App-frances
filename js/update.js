// Detecta versiones nuevas de la app y las activa cuando el usuario lo pide

// Llama a onUpdateReady(worker) cuando hay una versión nueva lista y esperando.
// Solo si la página ya estaba controlada por un service worker: en la primera
// instalación no hay «versión nueva», solo la primera.
export function watchForUpdates(registration, container, onUpdateReady) {
  if (registration.waiting && container.controller) {
    onUpdateReady(registration.waiting);
  }

  registration.addEventListener('updatefound', () => {
    const worker = registration.installing;
    worker.addEventListener('statechange', () => {
      if (worker.state === 'installed' && container.controller) onUpdateReady(worker);
    });
  });
}

// Recuerda qué contenedores ya esperan el cambio, para recargar una sola vez
const containersWaitingForChange = new WeakSet();

// Activa la versión nueva y recarga la página cuando ya controla la página
export function applyUpdate(worker, container, reload) {
  if (!containersWaitingForChange.has(container)) {
    containersWaitingForChange.add(container);
    let reloaded = false;
    container.addEventListener('controllerchange', () => {
      if (reloaded) return;
      reloaded = true;
      reload();
    });
  }
  worker.postMessage({ type: 'SKIP_WAITING' });
}
