// Pronunciación con la voz del sistema (speechSynthesis), en francés

export const RATES = { normal: 1, slow: 0.6 };

// Android escribe «fr_FR»; el estándar, «fr-FR»
const langOf = (voice) => String(voice.lang || '').replace('_', '-').toLowerCase();

// Elige la mejor voz francesa: fr-FR local, luego fr-FR, luego otra francesa (fr-CA…).
// Devuelve { voice, exact } (exact = es de Francia) o null si no hay ninguna.
export function pickFrenchVoice(voices) {
  const franceLocal = voices.find((v) => langOf(v) === 'fr-fr' && v.localService);
  const france = franceLocal || voices.find((v) => langOf(v) === 'fr-fr');
  if (france) return { voice: france, exact: true };
  const other = voices.find((v) => langOf(v) === 'fr' || langOf(v).startsWith('fr-'));
  return other ? { voice: other, exact: false } : null;
}

// Las voces pueden tardar en cargar: si la lista llega vacía, espera a «voiceschanged».
// Chrome en Android a veces lanza un primer «voiceschanged» todavía con 0 voces:
// se sigue esperando hasta que haya voces o se acabe el tiempo.
export function loadVoices(synth, timeoutMs = 2000) {
  const voices = synth.getVoices();
  if (voices.length > 0) return Promise.resolve(voices);
  return new Promise((resolve) => {
    const finish = () => {
      clearTimeout(timer);
      synth.removeEventListener('voiceschanged', onChange);
      resolve(synth.getVoices());
    };
    const onChange = () => {
      if (synth.getVoices().length > 0) finish();
    };
    const timer = setTimeout(finish, timeoutMs);
    synth.addEventListener('voiceschanged', onChange);
  });
}

// Errores que solo significan «se cortó para leer otra cosa»: no son un problema
const NORMAL_STOPS = ['interrupted', 'canceled'];

// Lee el texto; antes corta lo que estuviera sonando.
// onStart y onEnd avisan cuando empieza y cuando termina esta frase.
// onError(código) se llama si el motor de voz del sistema falla (p. ej. «synthesis-failed»).
export function speak(synth, voice, text, rate, {
  Utterance = globalThis.SpeechSynthesisUtterance, onError = () => {}, onStart = () => {}, onEnd = () => {},
} = {}) {
  synth.cancel();
  const utterance = new Utterance(text);
  utterance.voice = voice;
  utterance.lang = voice ? String(voice.lang).replace('_', '-') : 'fr-FR';
  utterance.rate = rate;
  utterance.onstart = () => onStart();
  utterance.onend = () => onEnd();
  utterance.onerror = (event) => {
    if (!NORMAL_STOPS.includes(event.error)) onError(event.error);
  };
  synth.speak(utterance);
}
