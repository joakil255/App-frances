// Oír en francés desde cualquier pantalla, con los mismos avisos en todas.
// Los avisos se escriben con textContent, nunca como HTML.
import { pickFrenchVoice, loadVoices, speak } from '../lib/speech.js';

const VOICE_SETTINGS = 'En Ajustes de Android busca «Salida de texto a voz»: elige el motor «Servicios de voz de Google», '
  + 'instala los datos de voz en Francés (Francia) y prueba «Escuchar un ejemplo».';

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

// Lee «text» con la mejor voz francesa. Si no se puede, explica por qué en «notice».
// showAccent: avisar también si la voz es francesa pero no de Francia.
export async function playFrench({ synth, text: phrase, rate, notice, showAccent = false }) {
  if (!synth) {
    show(notice, text('strong', 'Este navegador no puede leer en voz alta.'));
    return;
  }
  voicesPromise ||= loadVoices(synth);
  const choice = pickFrenchVoice(await voicesPromise);
  if (!choice) {
    voicesPromise = null; // quizá se instale una voz; se vuelve a buscar la próxima vez
    show(notice, text('strong', 'No hay voz francesa en este dispositivo.'), text('span', ` ${VOICE_SETTINGS}`));
    return;
  }
  if (!choice.exact && showAccent) {
    show(notice, text('span', `Voz francesa con otro acento (${choice.voice.lang}).`));
  }
  speak(synth, choice.voice, phrase, rate, {
    // El motor de voz del teléfono falló: se avisa en vez de quedarse en silencio
    onError: (code) => show(notice,
      text('strong', 'El teléfono no pudo leer en voz alta.'),
      text('span', ` ${VOICE_SETTINGS} (Error: ${code}.)`)),
  });
}
