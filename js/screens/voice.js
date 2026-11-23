// Oír en francés desde cualquier pantalla, con los mismos avisos en todas.
// Los avisos se escriben con textContent, nunca como HTML.
import { pickFrenchVoice, loadVoices, speak } from '../lib/speech.js';
import { MESSAGES } from '../lib/messages.js';

let voicesPromise = null;

function text(tag, value) {
  const node = document.createElement(tag);
  node.textContent = value;
  return node;
}

function show(notice, ...children) {
  notice.replaceChildren(...children);
  notice.hidden = false;
}

// ¿Hay alguna voz francesa? (puede tardar hasta 2 s mientras el navegador carga las voces)
export async function hasFrenchVoice(synth) {
  if (!synth) return false;
  return pickFrenchVoice(await loadVoices(synth)) !== null;
}

// Lee «text» con la mejor voz francesa. Si no se puede, explica por qué en «notice».
// showAccent: avisar también si la voz es francesa pero no de Francia.
export async function playFrench({ synth, text: phrase, rate, notice, showAccent = false }) {
  if (!synth) {
    show(notice, text('strong', MESSAGES.noSpeech.title), text('span', ` ${MESSAGES.noSpeech.text}`));
    return;
  }
  voicesPromise ||= loadVoices(synth);
  const choice = pickFrenchVoice(await voicesPromise);
  if (!choice) {
    voicesPromise = null; // quizá se instale una voz; se vuelve a buscar la próxima vez
    show(notice, text('strong', MESSAGES.noFrenchVoice.title), text('span', ` ${MESSAGES.noFrenchVoice.text}`));
    return;
  }
  if (!choice.exact && showAccent) {
    show(notice, text('span', `Voz francesa con otro acento (${choice.voice.lang}).`));
  }
  speak(synth, choice.voice, phrase, rate, {
    // El motor de voz del teléfono falló: se avisa en vez de quedarse en silencio
    onError: (code) => show(notice,
      text('strong', MESSAGES.voiceFailed.title),
      text('span', ` ${MESSAGES.voiceFailed.text} (Error: ${code}.)`)),
  });
}
