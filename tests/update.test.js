import { test } from 'node:test';
import assert from 'node:assert/strict';
import { watchForUpdates, applyUpdate } from '../js/update.js';

// Objetos falsos con la forma mínima de la API de service workers
class FakeWorker extends EventTarget {
  constructor(state = 'installing') {
    super();
    this.state = state;
    this.messages = [];
  }
  postMessage(message) {
    this.messages.push(message);
  }
  setState(state) {
    this.state = state;
    this.dispatchEvent(new Event('statechange'));
  }
}

class FakeContainer extends EventTarget {
  constructor(controller = null) {
    super();
    this.controller = controller;
  }
}

class FakeRegistration extends EventTarget {
  constructor({ waiting = null } = {}) {
    super();
    this.waiting = waiting;
    this.installing = null;
  }
  startInstall(worker) {
    this.installing = worker;
    this.dispatchEvent(new Event('updatefound'));
  }
}

test('avisa si ya hay una versión esperando y la página estaba controlada', () => {
  const waiting = new FakeWorker('installed');
  const found = [];
  watchForUpdates(new FakeRegistration({ waiting }), new FakeContainer(new FakeWorker('activated')), (w) => found.push(w));
  assert.deepEqual(found, [waiting]);
});

test('no avisa en la primera instalación (sin controlador)', () => {
  const registration = new FakeRegistration();
  const found = [];
  watchForUpdates(registration, new FakeContainer(null), (w) => found.push(w));
  const worker = new FakeWorker();
  registration.startInstall(worker);
  worker.setState('installed');
  assert.deepEqual(found, []);
});

test('avisa cuando una versión nueva termina de instalarse', () => {
  const registration = new FakeRegistration();
  const found = [];
  watchForUpdates(registration, new FakeContainer(new FakeWorker('activated')), (w) => found.push(w));
  const worker = new FakeWorker();
  registration.startInstall(worker);
  assert.deepEqual(found, [], 'todavía instalando');
  worker.setState('installed');
  assert.deepEqual(found, [worker]);
});

test('applyUpdate pide a la versión nueva que se active', () => {
  const worker = new FakeWorker('installed');
  applyUpdate(worker, new FakeContainer(), () => {});
  assert.deepEqual(worker.messages, [{ type: 'SKIP_WAITING' }]);
});

test('recarga una sola vez aunque controllerchange llegue dos veces', () => {
  const container = new FakeContainer();
  let reloads = 0;
  applyUpdate(new FakeWorker('installed'), container, () => reloads++);
  assert.equal(reloads, 0, 'no recarga antes del cambio');
  container.dispatchEvent(new Event('controllerchange'));
  container.dispatchEvent(new Event('controllerchange'));
  assert.equal(reloads, 1);
});

test('pulsar Actualizar dos veces recarga una sola vez', () => {
  const container = new FakeContainer();
  const worker = new FakeWorker('installed');
  let reloads = 0;
  applyUpdate(worker, container, () => reloads++);
  applyUpdate(worker, container, () => reloads++);
  container.dispatchEvent(new Event('controllerchange'));
  assert.equal(reloads, 1);
});
