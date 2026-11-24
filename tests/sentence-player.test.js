import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSentencePlayer } from '../js/lib/sentence-player.js';

class FakeUtterance {
  constructor(text) { this.text = text; }
}

function fakeSynth() {
  return {
    spoken: [],
    cancels: 0,
    pauses: 0,
    speak(u) { this.spoken.push(u); },
    cancel() { this.cancels += 1; },
    pause() { this.pauses += 1; },
    last() { return this.spoken[this.spoken.length - 1]; },
  };
}

const VOICE = { lang: 'fr_FR' };
const S = ['Un.', 'Deux.', 'Trois.', 'Quatre.'];

function setup(sentences = S, extra = {}) {
  const synth = fakeSynth();
  const log = { sentence: [], end: 0, error: [] };
  const player = createSentencePlayer({
    synth, voice: VOICE, sentences, rate: 1, Utterance: FakeUtterance,
    onSentence: (i) => log.sentence.push(i),
    onEnd: () => { log.end += 1; },
    onError: (code) => log.error.push(code),
    ...extra,
  });
  return { synth, log, player };
}

test('recorre las frases en orden y avisa al terminar', () => {
  const { synth, log, player } = setup();
  player.play();
  assert.equal(player.playing(), true);
  for (let i = 0; i < S.length; i += 1) {
    assert.equal(synth.last().text, S[i]);
    synth.last().onstart();
    synth.last().onend();
  }
  assert.deepEqual(log.sentence, [0, 1, 2, 3]);
  assert.equal(synth.spoken.length, 4);
  assert.equal(log.end, 1);
  assert.equal(player.playing(), false);
});

test('usa la voz, el idioma y la velocidad', () => {
  const { synth, player } = setup(S, { rate: 0.6 });
  player.play();
  assert.equal(synth.last().voice, VOICE);
  assert.equal(synth.last().lang, 'fr-FR');
  assert.equal(synth.last().rate, 0.6);
});

test('pausar deja terminar la frase y no habla más; no usa synth.pause', () => {
  const { synth, log, player } = setup();
  player.play();
  synth.last().onstart();
  player.pause();
  assert.equal(synth.pauses, 0);
  assert.equal(player.playing(), false);
  synth.last().onend();
  assert.equal(synth.spoken.length, 1);
  assert.equal(log.end, 0);
});

test('continuar después de terminar la frase empieza en la siguiente', () => {
  const { synth, player } = setup();
  player.play();
  player.pause();
  synth.last().onend();
  player.resume();
  assert.equal(synth.spoken.length, 2);
  assert.equal(synth.last().text, 'Deux.');
  assert.equal(player.playing(), true);
});

test('continuar antes de que termine la frase sigue sin repetirla', () => {
  const { synth, player } = setup();
  player.play();
  player.pause();
  player.resume();
  assert.equal(synth.spoken.length, 1);
  synth.last().onend();
  assert.equal(synth.spoken.length, 2);
  assert.equal(synth.last().text, 'Deux.');
});

test('pausar en la última frase y continuar termina la lectura', () => {
  const { synth, log, player } = setup(['Un.', 'Deux.']);
  player.play(1);
  player.pause();
  synth.last().onend();
  player.resume();
  assert.equal(synth.spoken.length, 1);
  assert.equal(log.end, 1);
});

test('play(3) empieza en esa frase', () => {
  const { synth, log, player } = setup();
  player.play(3);
  assert.equal(synth.last().text, 'Quatre.');
  synth.last().onstart();
  assert.deepEqual(log.sentence, [3]);
  synth.last().onend();
  assert.equal(log.end, 1);
});

test('stop cancela y los eventos tardíos no avanzan', () => {
  const { synth, log, player } = setup();
  player.play();
  const old = synth.last();
  const before = synth.cancels;
  player.stop();
  assert.equal(synth.cancels, before + 1);
  assert.equal(player.playing(), false);
  old.onend();
  old.onerror({ error: 'canceled' });
  old.onerror({ error: 'synthesis-failed' });
  assert.equal(synth.spoken.length, 1);
  assert.equal(log.end, 0);
  assert.deepEqual(log.error, []);
});

test('play(from) nuevo ignora el fin de la frase anterior', () => {
  const { synth, log, player } = setup();
  player.play(0);
  const old = synth.last();
  player.play(2);
  assert.equal(synth.last().text, 'Trois.');
  old.onend();
  old.onstart();
  assert.equal(synth.spoken.length, 2);
  assert.deepEqual(log.sentence, []);
});

test('un error de voz avisa una vez y se detiene', () => {
  const { synth, log, player } = setup();
  player.play();
  const current = synth.last();
  current.onerror({ error: 'synthesis-failed' });
  current.onerror({ error: 'synthesis-failed' });
  current.onend();
  assert.deepEqual(log.error, ['synthesis-failed']);
  assert.equal(player.playing(), false);
  assert.equal(synth.spoken.length, 1);
});

test('interrupted y canceled no son errores', () => {
  const { synth, log, player } = setup();
  player.play();
  synth.last().onerror({ error: 'interrupted' });
  synth.last().onerror({ error: 'canceled' });
  assert.deepEqual(log.error, []);
});

test('setRate vale desde la siguiente frase', () => {
  const { synth, player } = setup();
  player.play();
  assert.equal(synth.last().rate, 1);
  player.setRate(0.6);
  assert.equal(synth.last().rate, 1);
  synth.last().onend();
  assert.equal(synth.last().rate, 0.6);
});

test('una sola frase: habla y termina', () => {
  const { synth, log, player } = setup(['Salut.']);
  player.play();
  synth.last().onend();
  assert.equal(log.end, 1);
  assert.equal(player.playing(), false);
});

test('lista vacía: no habla y avisa el fin una vez', () => {
  const { synth, log, player } = setup([]);
  player.play();
  assert.equal(synth.spoken.length, 0);
  assert.equal(log.end, 1);
  assert.equal(player.playing(), false);
  player.pause(); player.resume(); player.stop();
  assert.equal(synth.spoken.length, 0);
});

test('play con un índice fuera de la lista no habla', () => {
  const { synth, log, player } = setup();
  player.play(9);
  assert.equal(synth.spoken.length, 0);
  assert.equal(log.end, 1);
});
