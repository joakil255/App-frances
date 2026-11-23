import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RATES, pickFrenchVoice, loadVoices, speak } from '../js/lib/speech.js';

const voice = (name, lang, localService = true) => ({ name, lang, localService });

test('velocidades normal y lenta', () => {
  assert.deepEqual(RATES, { normal: 1, slow: 0.6 });
});

test('prefiere una voz fr-FR local', () => {
  const local = voice('Local', 'fr-FR', true);
  const result = pickFrenchVoice([voice('Inglés', 'en-US'), voice('Canadá', 'fr-CA'), voice('Red', 'fr-FR', false), local]);
  assert.deepEqual(result, { voice: local, exact: true });
});

test('si no hay fr-FR local, usa una fr-FR remota', () => {
  const remote = voice('Red', 'fr-FR', false);
  assert.deepEqual(pickFrenchVoice([voice('Canadá', 'fr-CA'), remote]), { voice: remote, exact: true });
});

test('acepta el formato de Android fr_FR', () => {
  const android = voice('Android', 'fr_FR');
  assert.deepEqual(pickFrenchVoice([android]), { voice: android, exact: true });
});

test('con solo otra voz francesa, la usa y avisa que no es de Francia', () => {
  const canada = voice('Canadá', 'fr-CA');
  assert.deepEqual(pickFrenchVoice([voice('Español', 'es-ES'), canada]), { voice: canada, exact: false });
});

test('sin voz francesa devuelve null', () => {
  assert.equal(pickFrenchVoice([voice('Español', 'es-ES')]), null);
  assert.equal(pickFrenchVoice([]), null);
});

class FakeSynth extends EventTarget {
  constructor(voices = []) {
    super();
    this.voices = voices;
    this.calls = [];
  }
  getVoices() {
    return this.voices;
  }
  cancel() {
    this.calls.push(['cancel']);
  }
  speak(utterance) {
    this.calls.push(['speak', utterance]);
  }
}

test('loadVoices devuelve las voces si ya están cargadas', async () => {
  const voices = [voice('A', 'fr-FR')];
  assert.deepEqual(await loadVoices(new FakeSynth(voices)), voices);
});

test('loadVoices espera a voiceschanged si la lista llega vacía', async () => {
  const synth = new FakeSynth([]);
  const pending = loadVoices(synth, 1000);
  synth.voices = [voice('A', 'fr-FR')];
  synth.dispatchEvent(new Event('voiceschanged'));
  assert.equal((await pending).length, 1);
});

test('loadVoices ignora un voiceschanged con la lista todavía vacía (Chrome en Android)', async () => {
  const synth = new FakeSynth([]);
  const pending = loadVoices(synth, 1000);
  synth.dispatchEvent(new Event('voiceschanged')); // primer aviso: 0 voces
  synth.voices = [voice('A', 'fr-FR')];
  synth.dispatchEvent(new Event('voiceschanged')); // segundo aviso: ya hay voces
  assert.equal((await pending).length, 1);
});

test('loadVoices se rinde tras el tiempo de espera con la lista vacía', async () => {
  assert.deepEqual(await loadVoices(new FakeSynth([]), 20), []);
});

test('speak cancela lo que suena y lee el texto con la voz y la velocidad', () => {
  class FakeUtterance {
    constructor(text) {
      this.text = text;
    }
  }
  const synth = new FakeSynth();
  const french = voice('A', 'fr-FR');
  speak(synth, french, 'la fenêtre', RATES.slow, { Utterance: FakeUtterance });
  assert.equal(synth.calls[0][0], 'cancel');
  const utterance = synth.calls[1][1];
  assert.equal(utterance.text, 'la fenêtre');
  assert.equal(utterance.voice, french);
  assert.equal(utterance.lang, 'fr-FR');
  assert.equal(utterance.rate, 0.6);
});

test('si el motor de voz falla, speak avisa con el código del error', () => {
  class FakeUtterance {
    constructor(text) {
      this.text = text;
    }
  }
  const synth = new FakeSynth();
  const errors = [];
  speak(synth, null, 'bonjour', RATES.normal, { Utterance: FakeUtterance, onError: (code) => errors.push(code) });
  const utterance = synth.calls[1][1];
  utterance.onerror({ error: 'synthesis-failed' });
  assert.deepEqual(errors, ['synthesis-failed']);
});

test('cortar una lectura con otra (interrupted o canceled) no es un error para el usuario', () => {
  class FakeUtterance {
    constructor(text) {
      this.text = text;
    }
  }
  const synth = new FakeSynth();
  const errors = [];
  speak(synth, null, 'bonjour', RATES.normal, { Utterance: FakeUtterance, onError: (code) => errors.push(code) });
  const utterance = synth.calls[1][1];
  utterance.onerror({ error: 'interrupted' });
  utterance.onerror({ error: 'canceled' });
  assert.deepEqual(errors, []);
});
