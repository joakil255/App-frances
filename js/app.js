// Arranque de la app: navegación entre pantallas sin recargar la página
// y registro del service worker (funcionamiento sin conexión)
import { SCREENS, resolveRoute, routeParam } from './lib/router.js';
import { watchForUpdates, applyUpdate } from './update.js';
import { createWordStore } from './lib/storage.js';
import { INITIAL_WORDS } from './data/initial-words.js';
import { initVocabulary } from './screens/vocabulary.js';
import { createStudyStore } from './lib/study-storage.js';
import { createTextStore } from './lib/texts.js';
import { initStudy } from './screens/study.js';
import { initQuiz } from './screens/quiz.js';
import { initProgress } from './screens/progress.js';
import { initHome } from './screens/home.js';
import { createChatStore } from './lib/chat.js';
import { initChat } from './screens/chat.js';
import { createVoiceStore } from './lib/voice-settings.js';
import { getRecognitionConstructor } from './lib/recognition.js';
import { initChatVoice } from './screens/chat-voice.js';
import { createLookupCache } from './lib/lookup-cache.js';
import { initWordCard } from './screens/word-card.js';
import { initReader } from './screens/reader.js';
import { textsLoadNotice } from './lib/messages.js';

const APP_NAME = 'App de francés';
let currentId = null;
let onChatShown = () => {}; // lo completa initChat
let onChatHidden = () => {}; // corta el micrófono al salir de Conversar
let currentParam = null; // el <id> de «#/leer/<id>»
let onReaderShown = () => {}; // lo completa initReader
let onReaderHidden = () => {}; // corta la voz al salir de Leer

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
  const previousId = currentId;
  currentId = id;
  if (id === 'chat') onChatShown();
  else if (previousId === 'chat') onChatHidden();
  if (id === 'reader') onReaderShown(moveFocus);
  else if (previousId === 'reader') onReaderHidden();
}

function handleRoute(isFirstLoad) {
  const id = resolveRoute(location.hash);
  if (id === null) {
    // Ancla normal (p. ej. «Saltar al contenido»): no cambia de pantalla
    if (currentId === null) showScreen('home', false);
    return;
  }
  const param = routeParam(location.hash);
  const paramChanged = param !== currentParam;
  currentParam = param;
  if (id !== currentId) showScreen(id, !isFirstLoad);
  // De la biblioteca a una historia (o de una historia a otra) la pantalla sigue siendo Leer
  else if (id === 'reader' && paramChanged) onReaderShown(true);
}

window.addEventListener('hashchange', () => handleRoute(false));
handleRoute(true);

// localStorage puede no existir o estar bloqueado (p. ej. algunos modos privados):
// en ese caso cada lectura o escritura falla y la pantalla lo avisa.
function localStorageOrBlocked() {
  try {
    return window.localStorage;
  } catch {
    const blocked = () => {
      throw new Error('localStorage bloqueado');
    };
    return { getItem: blocked, setItem: blocked, removeItem: blocked };
  }
}

// Un solo almacenamiento para los almacenes y para restaurar la copia
const backend = localStorageOrBlocked();
const wordStore = createWordStore(backend, { initialWords: INITIAL_WORDS });
const synth = 'speechSynthesis' in window ? window.speechSynthesis : null;

const studyStore = createStudyStore(backend);
const textStore = createTextStore(backend);
// Si falla la lectura, la app sigue (Inicio no depende de las historias) y Leer lo avisa
const textsLoaded = textStore.load().catch((error) => ({ texts: [], corruptBackupKey: null, error }));

// Estudiar necesita las palabras ya cargadas; Quiz y Progreso, además, el estudio cargado
// (comparten el mismo almacén e historial). Progreso no espera a que Quiz compruebe la voz.
initVocabulary({ store: wordStore, synth })
  .then(() => initStudy({ wordStore, studyStore, synth }))
  .then(() => Promise.all([
    initQuiz({ wordStore, studyStore, synth }), initProgress({ wordStore, studyStore }),
    textsLoaded.then(() => initHome({ wordStore, studyStore, textStore, backend })),
  ]));

// Conversar no depende del estudio. Las palabras ya están en memoria: store.load() de Vocabulario no espera nada.
const isOnline = () => navigator.onLine;
const voiceStore = createVoiceStore(backend);
const chatStore = createChatStore(backend);
// Tarjeta de las palabras de Claude: consulta (con caché), escuchar y guardar en el vocabulario
const wordCard = initWordCard({
  wordStore,
  cache: createLookupCache(backend),
  fetch: window.fetch.bind(window),
  isOnline,
  hostname: location.hostname,
  getCode: () => chatStore.loadCode(),
  synth,
  beforeSpeak: () => voice.stop(), // voice se crea más abajo; solo se usa al tocar una palabra
});
const chat = initChat({
  store: chatStore,
  fetch: window.fetch.bind(window),
  isOnline,
  hostname: location.hostname,
  synth,
  voiceStore,
  wordCard,
});
// Micrófono: solo si el navegador reconoce voz; enviar lo detiene
const voice = initChatVoice({
  field: document.querySelector('#chat-message'),
  Recognition: getRecognitionConstructor(window),
  isOnline,
  voiceStore,
  showNotice: chat.showNotice,
  clearNotice: chat.clearNotice,
  // Al empezar a escuchar se corta toda lectura en voz alta (la del chat y la de Leer)
  onListenStart: () => {
    chat.onListenStart();
    reader?.onHide();
  },
});
chat.setBeforeSend(() => voice.stop());
chat.setBeforeSpeak(() => voice.stop());
chat.setOnBusy((busy) => voice.setBusy(busy));
// Al abrir Conversar o si otra pestaña cambia el vocabulario, se vuelve a subrayar
const chatLog = document.querySelector('#chat-log');
const readerText = document.querySelector('#reader-text');
onChatShown = () => {
  chat.onShow();
  wordCard.refresh(chatLog);
};
wordStore.watchExternalChanges(window, () => {
  wordCard.refresh(chatLog);
  wordCard.refresh(readerText);
});
onChatHidden = () => voice.stop();
// Si la página queda oculta (otra app, pantalla apagada) el micrófono se corta
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') voice.stop();
});
if (currentId === 'chat') onChatShown();

// Leer: biblioteca y lector (las historias ya están en memoria tras textStore.load())
let reader = null;
textsLoaded.then((loaded) => {
  reader = initReader({
    loadNotice: textsLoadNotice(loaded),
    textStore,
    wordCard,
    fetch: window.fetch.bind(window),
    isOnline,
    hostname: location.hostname,
    getCode: () => chatStore.loadCode(),
    synth,
    onBeforeSpeak: () => voice.stop(), // el micrófono no debe oír la historia
  });
  onReaderShown = (moveFocus) => reader.onShow(routeParam(location.hash), moveFocus);
  onReaderHidden = () => reader.onHide();
  if (currentId === 'reader') onReaderShown(false);
  // Si otra pestaña cambia las historias, se vuelven a leer y Leer se redibuja
  // (una historia borrada allá te devuelve a la biblioteca)
  textStore.watchExternalChanges(window, () => {
    if (currentId === 'reader') onReaderShown(false);
  });
});

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
