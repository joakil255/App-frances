// Pantalla Conversar: chatear en francés con Claude y ver las correcciones de cada mensaje.
// Todo el texto del usuario y del modelo se pinta con textContent.
import { chatUrl, buildRequestBody, sendChat, appendExchange } from '../lib/chat.js';
import { chatMessage, storageMessage, joined } from '../lib/messages.js';
import { RATES } from '../lib/speech.js';
import { playFrench } from './voice.js';

const $ = (selector, root = document) => root.querySelector(selector);

function el(tag, { text, className, attrs = {} } = {}, children = []) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
  for (const child of children) node.append(child);
  return node;
}

// «Te quedan 12 mensajes hoy.» (y en singular con 1)
const remainingText = (n) => (n === 1 ? 'Te queda 1 mensaje hoy.' : `Te quedan ${n} mensajes hoy.`);

// Solo se pintan las correcciones con original y corregido en texto (lo guardado puede venir dañado)
const isCorrection = (c) => Boolean(c) && typeof c.original === 'string' && typeof c.corrected === 'string';

// Botón de escucha: el emoji se oculta al lector de pantalla y el nombre va en aria-label
function listenButton({ emoji, text, label, onClick }) {
  const button = el('button', { className: 'button button-secondary chat-listen', attrs: { type: 'button', 'aria-label': label } }, [
    el('span', { text: emoji, attrs: { 'aria-hidden': 'true' } }),
    ...(text ? [el('span', { text })] : []),
  ]);
  button.addEventListener('click', onClick);
  return button;
}

function correctionItem({ original, corrected, explanation }, listen) {
  const fix = el('p', { className: 'chat-fix' }, [
    el('del', { text: original, attrs: { lang: 'fr' } }),
    el('span', { text: ' → ', attrs: { 'aria-hidden': 'true' } }),
    el('span', { className: 'visually-hidden', text: ', se corrige: ' }),
    el('ins', { text: corrected, attrs: { lang: 'fr' } }),
  ]);
  const hear = listenButton({ emoji: '🔊', label: 'Escuchar la forma correcta', onClick: () => listen(corrected, RATES.normal) });
  const item = el('li', { className: 'chat-correction' }, [el('div', { className: 'chat-fix-row' }, [fix, hear])]);
  if (typeof explanation === 'string' && explanation) {
    item.append(el('p', { className: 'chat-explanation', text: explanation, attrs: { lang: 'es' } }));
  }
  return item;
}

// listen(texto, velocidad): lee en francés con los avisos de siempre
function turnNode(turn, listen) {
  const isUser = turn.role === 'user';
  const node = el('div', { className: `chat-turn chat-turn-${isUser ? 'user' : 'assistant'}` }, [
    el('p', { className: 'chat-speaker', text: isUser ? 'Tú' : 'Claude' }),
    el('p', { className: 'chat-text', text: turn.text, attrs: { lang: 'fr' } }),
  ]);
  if (!isUser) {
    node.append(el('div', { className: 'chat-actions' }, [
      listenButton({ emoji: '🔊', text: 'Escuchar', label: 'Escuchar la respuesta', onClick: () => listen(turn.text, RATES.normal) }),
      listenButton({ emoji: '🐢', text: 'Más lento', label: 'Escuchar más lento', onClick: () => listen(turn.text, RATES.slow) }),
    ]));
  }
  const corrections = isUser && Array.isArray(turn.corrections) ? turn.corrections.filter(isCorrection) : [];
  if (corrections.length > 0) {
    node.append(el('ul', { className: 'chat-corrections', attrs: { 'aria-label': 'Correcciones' } },
      corrections.map((c) => correctionItem(c, listen))));
  }
  return node;
}

// Tapa el texto de una respuesta tras «Mostrar texto». Devuelve la función que lo muestra.
function coverReply(node, id) {
  const text = $('.chat-text', node);
  text.id = id;
  const toggle = el('button', {
    className: 'button button-secondary chat-toggle',
    attrs: { type: 'button', 'aria-expanded': 'false', 'aria-controls': id },
  });
  const setShown = (shown) => {
    text.hidden = !shown;
    toggle.textContent = shown ? 'Ocultar texto' : 'Mostrar texto';
    toggle.setAttribute('aria-expanded', String(shown));
  };
  toggle.addEventListener('click', () => setShown(text.hidden));
  $('.chat-actions', node).append(toggle);
  setShown(false);
  return () => setShown(true);
}

export function initChat({ store, fetch, isOnline, hostname, synth, voiceStore }) {
  const url = chatUrl(hostname);
  const notice = $('#chat-notice');
  const log = $('#chat-log');
  const empty = $('#chat-empty');
  const form = $('#chat-form');
  const field = $('#chat-message');
  const fieldError = $('#chat-message-error');
  const sendButton = $('#chat-send');
  const remaining = $('#chat-remaining');
  const newButton = $('#chat-new');
  const levelInputs = [...document.querySelectorAll('#screen-chat input[name="level"]')];
  const confirmDialog = $('#chat-confirm-new');
  const codeDialog = $('#chat-code');
  const codeForm = $('form', codeDialog);
  const codeInput = $('#chat-code-input');
  const codeError = $('#chat-code-error');
  const listenFirstInput = $('#chat-listen-first');

  let { level, turns } = store.load();
  let sending = false;
  let beforeSend = () => {};
  let coveredCount = 0; // para dar un id único a cada texto tapado

  // --- Avisos ---
  function showNotice({ title, text }) {
    notice.replaceChildren(el('strong', { text: title }), ...(text ? [el('span', { text: ` ${text}` })] : []));
    notice.hidden = false;
  }
  function clearNotice() {
    notice.hidden = true;
    notice.replaceChildren();
  }
  function setFieldError(text) {
    fieldError.textContent = text;
    fieldError.hidden = !text;
    if (text) field.setAttribute('aria-invalid', 'true');
    else field.removeAttribute('aria-invalid');
  }
  function setCodeError(text) {
    codeError.textContent = text;
    codeError.hidden = !text;
    if (text) codeInput.setAttribute('aria-invalid', 'true');
    else codeInput.removeAttribute('aria-invalid');
  }
  function save() {
    try {
      store.save({ level, turns });
    } catch (error) {
      showNotice(storageMessage(error));
    }
  }

  // --- Escuchar ---
  const listen = (text, rate, onFail) => playFrench({ synth, text, rate, notice, onFail });

  // --- Conversación ---
  // Las respuestas del historial se muestran siempre
  function renderAll() {
    log.replaceChildren(...turns.map((turn) => turnNode(turn, listen)));
    updateEmpty();
  }
  function updateEmpty() {
    empty.hidden = turns.length > 0;
    newButton.hidden = turns.length === 0;
  }

  // Mientras se espera la respuesta no se puede enviar otra vez ni cambiar la conversación
  function setBusy(busy) {
    sending = busy;
    sendButton.disabled = busy;
    sendButton.textContent = busy ? 'Enviando…' : 'Enviar';
    field.readOnly = busy;
    newButton.disabled = busy;
    for (const input of levelInputs) input.disabled = busy;
  }

  async function send() {
    if (sending) return;
    beforeSend();
    clearNotice();
    setFieldError('');
    const message = field.value.trim();
    if (!message) {
      setFieldError('Escribe tu mensaje antes de enviarlo.');
      field.focus();
      return;
    }
    if (!isOnline()) {
      showNotice(chatMessage('offline'));
      return;
    }
    const code = store.loadCode();
    if (!code) {
      openCodeDialog('', true);
      return;
    }

    setBusy(true);
    const result = await sendChat({ url, code, body: buildRequestBody({ level, turns, message }), fetch, isOnline: isOnline() });
    setBusy(false);

    if (!result.ok) {
      // Un error no cambia la conversación y el texto queda en el campo
      if (result.error === 'unauthorized') {
        try {
          store.clearCode();
        } catch (error) {
          showNotice(storageMessage(error));
        }
        openCodeDialog(joined(chatMessage('unauthorized')), true);
        return;
      }
      showNotice(chatMessage(result.error));
      field.focus();
      return;
    }

    const before = turns.length;
    turns = appendExchange(turns, message, result);
    const added = turns.slice(before);
    const nodes = added.map((turn) => turnNode(turn, listen));
    // «Escuchar primero»: la respuesta se tapa y se lee sola; si no se puede oír, se muestra
    const reply = added.findIndex((turn) => turn.role === 'assistant');
    const reveal = listenFirstInput.checked && reply !== -1 ? coverReply(nodes[reply], `chat-reply-${++coveredCount}`) : null;
    log.append(...nodes);
    if (reveal) listen(added[reply].text, RATES.normal, reveal);
    updateEmpty();
    field.value = '';
    remaining.textContent = remainingText(result.remaining);
    remaining.hidden = false;
    save();
    field.focus();
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    send();
  });

  // --- Escuchar primero (guardado en el teléfono) ---
  listenFirstInput.checked = voiceStore.load().listenFirst;
  listenFirstInput.addEventListener('change', () => {
    try {
      voiceStore.save({ ...voiceStore.load(), listenFirst: listenFirstInput.checked });
    } catch (error) {
      showNotice(storageMessage(error));
    }
  });

  // --- Nivel ---
  for (const input of levelInputs) {
    input.checked = input.value === level;
    input.addEventListener('change', () => {
      if (!input.checked) return;
      level = input.value;
      clearNotice();
      save();
    });
  }

  // --- Código de acceso ---
  let sendAfterCode = false;
  let sendWhenSaved = false; // solo si el diálogo se abrió desde un envío
  function openCodeDialog(errorText, thenSend = false) {
    sendWhenSaved = thenSend;
    setCodeError(errorText);
    codeInput.value = '';
    codeDialog.showModal();
    codeInput.focus();
  }
  codeForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const code = codeInput.value.trim();
    if (!code) {
      setCodeError('Escribe el código de acceso.');
      codeInput.focus();
      return;
    }
    try {
      store.saveCode(code);
    } catch (error) {
      setCodeError(joined(storageMessage(error)));
      return;
    }
    sendAfterCode = sendWhenSaved;
    codeDialog.close();
  });
  codeDialog.addEventListener('click', (event) => {
    if (event.target.closest('[data-action="close"]')) codeDialog.close();
  });
  codeDialog.addEventListener('close', () => {
    codeInput.value = ''; // el código no se queda escrito en la página
    setCodeError('');
    field.focus();
    if (sendAfterCode) {
      sendAfterCode = false;
      send();
    }
  });

  // --- Conversación nueva ---
  newButton.addEventListener('click', () => confirmDialog.showModal());
  confirmDialog.addEventListener('click', (event) => {
    if (event.target.closest('[data-action="close"]')) confirmDialog.close();
    if (event.target.closest('[data-action="confirm"]')) {
      turns = [];
      clearNotice();
      save();
      renderAll();
      confirmDialog.close();
    }
  });
  confirmDialog.addEventListener('close', () => {
    (newButton.hidden ? field : newButton).focus();
  });

  renderAll();

  return {
    // Al abrir la pantalla, si aún no hay código se pide (si se cancela, se vuelve a pedir al enviar)
    onShow() {
      if (!store.loadCode() && !codeDialog.open) openCodeDialog('');
    },
    // Antes de escuchar el micrófono se corta la lectura para que no la oiga
    onListenStart() {
      synth?.cancel();
    },
    setBeforeSend(fn) {
      beforeSend = fn;
    },
    showNotice,
    clearNotice,
  };
}
