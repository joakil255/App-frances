// Lógica del micrófono (reconocimiento de voz del navegador). Sin DOM.

export const MAX_FIELD = 500;

export function getRecognitionConstructor(win) {
  return win.SpeechRecognition || win.webkitSpeechRecognition || null;
}

// Agrega lo dicho al texto actual del campo; corta a `max` letras (no a unidades UTF-16)
export function appendTranscript(current, transcript, max = MAX_FIELD) {
  const spoken = transcript.trim();
  const base = current.trimEnd();
  if (spoken === '') return current;
  const joined = base === '' ? spoken : `${base} ${spoken}`;
  return [...joined].slice(0, max).join('');
}

const MESSAGE_KEYS = {
  'not-allowed': 'micBlocked',
  'service-not-allowed': 'micBlocked',
  'no-speech': 'micNoSpeech',
  'audio-capture': 'micNoDevice',
  network: 'micNetwork',
  'language-not-supported': 'micLanguage',
  aborted: null,
};

export function recognitionMessageKey(error) {
  return Object.hasOwn(MESSAGE_KEYS, error) ? MESSAGE_KEYS[error] : 'micFailed';
}

// Crea un reconocimiento nuevo y lo inicia. onEnd se llama también tras un error.
export function startListening({ Recognition, onInterim, onFinal, onError, onEnd }) {
  const recognition = new Recognition();
  recognition.lang = 'fr-FR';
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;
  recognition.continuous = false;

  recognition.onresult = (event) => {
    let interim = '';
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const result = event.results[i];
      if (result.isFinal) onFinal(result[0].transcript);
      else interim += result[0].transcript;
    }
    if (interim !== '') onInterim(interim);
  };
  recognition.onerror = (event) => onError(event.error);
  recognition.onend = () => onEnd();

  recognition.start();
  return { stop: () => recognition.stop() };
}
