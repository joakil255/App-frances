// Micrófono de Conversar: lo que entiende el navegador se agrega al campo para revisarlo antes de enviar.
// El texto reconocido se pinta con textContent.
import { startListening, appendTranscript, recognitionMessageKey } from '../lib/recognition.js';
import { MESSAGES, chatMessage, storageMessage } from '../lib/messages.js';

const $ = (selector, root = document) => root.querySelector(selector);

function span(text, lang) {
  const node = document.createElement('span');
  node.textContent = text;
  if (lang) node.lang = lang;
  return node;
}

export function initChatVoice({ field, Recognition, isOnline, voiceStore, showNotice, clearNotice, onListenStart }) {
  // Navegador sin reconocimiento: el botón queda oculto y se escribe como siempre
  if (!Recognition) return { stop() {}, setBusy() {} };

  const button = $('#chat-mic');
  const label = $('.chat-mic-label', button);
  const interim = $('#chat-interim');
  const dialog = $('#chat-voice-privacy');
  let current = null; // escucha en curso: { recognition }; nunca hay dos a la vez
  let busy = false; // mientras se envía no se escucha (lo dicho se perdería al vaciar el campo)

  button.hidden = false;

  function setPressed(pressed) {
    button.setAttribute('aria-pressed', String(pressed));
    label.textContent = pressed ? 'Detener' : 'Hablar';
  }

  // Deja el botón en «Hablar»; llamarla dos veces no hace daño
  function finish() {
    current = null;
    setPressed(false);
    interim.hidden = true;
    interim.replaceChildren();
  }

  function begin() {
    if (current || busy) return;
    const session = { recognition: null };
    current = session;
    onListenStart();
    clearNotice();
    setPressed(true);
    // Los avisos de una escucha ya terminada se ignoran
    const own = (fn) => (...args) => {
      if (current === session) fn(...args);
    };
    try {
      session.recognition = startListening({
        Recognition,
        onInterim: own((text) => {
          interim.replaceChildren(span('Escuchando: '), span(text, 'fr'));
          interim.hidden = false;
        }),
        // Se agrega al texto que hay en el campo ahora (puedes escribir mientras escucha)
        onFinal: own((text) => {
          field.value = appendTranscript(field.value, text);
          field.focus();
        }),
        // Tras un error el navegador puede no avisar del final: se reinicia aquí
        onError: own((code) => {
          finish();
          const key = recognitionMessageKey(code);
          if (key !== null) showNotice(MESSAGES[key]);
        }),
        onEnd: own(finish),
      });
    } catch {
      finish();
      showNotice(MESSAGES.micFailed);
    }
  }

  button.addEventListener('click', () => {
    if (current) {
      current.recognition?.stop(); // el resultado final llega antes del fin
      return;
    }
    if (!isOnline()) {
      showNotice(chatMessage('offline'));
      return;
    }
    if (!voiceStore.load().privacyAccepted) {
      dialog.showModal();
      return;
    }
    begin();
  });

  // --- Aviso de privacidad (solo la primera vez) ---
  dialog.addEventListener('click', (event) => {
    if (event.target.closest('[data-action="close"]')) dialog.close();
    if (event.target.closest('[data-action="confirm"]')) {
      let saveError = null;
      try {
        voiceStore.save({ ...voiceStore.load(), privacyAccepted: true });
      } catch (error) {
        saveError = error;
      }
      dialog.close();
      begin();
      // Si no se pudo guardar, se avisa y se escucha igual
      if (saveError) showNotice(storageMessage(saveError));
    }
  });
  dialog.addEventListener('close', () => button.focus());

  return {
    // Al enviar: se corta la escucha y lo que llegue después se descarta
    stop() {
      if (!current) return;
      const { recognition } = current;
      finish();
      recognition?.stop();
    },
    // «Hablar» desactivado mientras se espera la respuesta
    setBusy(value) {
      busy = value;
      button.disabled = value;
    },
  };
}
