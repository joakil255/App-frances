// Lee una lista de frases una por una. Sin DOM.
// Pausar NO usa synth.pause() (en Android corta la frase): deja terminar la actual
// y no habla más; continuar sigue con la siguiente.
// Cada reproducción lleva un número («run»): los eventos de una frase vieja se ignoran.
import { speak } from './speech.js';

export function createSentencePlayer({
  synth, voice, sentences, rate, onSentence = () => {}, onEnd = () => {}, onError = () => {}, Utterance,
}) {
  let currentRate = rate;
  let run = 0;
  let active = false; // hay una lectura en marcha (hablando o en pausa)
  let paused = false;
  let waitingFrom = null; // frase pendiente: la actual terminó mientras estaba en pausa
  // Utterance en curso: solo se guarda (nunca se lee) para que Chrome no la recoja y pierda su onend
  // eslint-disable-next-line no-unused-vars
  let current = null;

  function finish() {
    active = false;
    paused = false;
    waitingFrom = null;
    onEnd();
  }

  function speakAt(i, myRun) {
    waitingFrom = null;
    current = speak(synth, voice, sentences[i], currentRate, {
      Utterance,
      onStart: () => {
        if (myRun === run) onSentence(i);
      },
      onEnd: () => {
        if (myRun !== run) return;
        current = null;
        if (i + 1 >= sentences.length) finish();
        else if (paused) waitingFrom = i + 1;
        else speakAt(i + 1, myRun);
      },
      onError: (code) => {
        if (myRun !== run) return;
        run += 1;
        active = false;
        paused = false;
        onError(code);
      },
    });
  }

  return {
    // Con la lista vacía (o un índice fuera de ella) no habla y avisa onEnd una vez
    play(from = 0) {
      run += 1;
      paused = false;
      waitingFrom = null;
      if (from < 0 || from >= sentences.length) {
        synth.cancel();
        finish();
        return;
      }
      active = true;
      speakAt(from, run);
    },

    pause() {
      if (active) paused = true;
    },

    resume() {
      if (!active || !paused) return;
      paused = false;
      if (waitingFrom !== null) speakAt(waitingFrom, run);
    },

    stop() {
      run += 1;
      active = false;
      paused = false;
      waitingFrom = null;
      current = null;
      synth.cancel();
    },

    setRate(next) {
      currentRate = next;
    },

    playing() {
      return active && !paused;
    },
  };
}
