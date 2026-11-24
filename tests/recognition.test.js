import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getRecognitionConstructor, appendTranscript, recognitionMessageKey, startListening } from '../js/lib/recognition.js';

test('getRecognitionConstructor elige el constructor sin prefijo', () => {
  const plain = function Plain() {};
  const webkit = function Webkit() {};
  assert.equal(getRecognitionConstructor({ SpeechRecognition: plain, webkitSpeechRecognition: webkit }), plain);
});

test('getRecognitionConstructor usa webkit si no hay el normal', () => {
  const webkit = function Webkit() {};
  assert.equal(getRecognitionConstructor({ webkitSpeechRecognition: webkit }), webkit);
});

test('getRecognitionConstructor da null si no hay ninguno', () => {
  assert.equal(getRecognitionConstructor({}), null);
});

test('appendTranscript recorta espacios y acepta campo vacío', () => {
  assert.equal(appendTranscript('', '  bonjour '), 'bonjour');
});

test('appendTranscript une con un espacio', () => {
  assert.equal(appendTranscript('Je suis', "j'habite"), "Je suis j'habite");
});

test('appendTranscript no deja dos espacios', () => {
  assert.equal(appendTranscript('Salut ', 'ça va'), 'Salut ça va');
});

test('appendTranscript con texto en blanco no cambia el campo', () => {
  assert.equal(appendTranscript('texte', '   '), 'texte');
});

test('appendTranscript conserva el apóstrofo tipográfico', () => {
  assert.equal(appendTranscript('Je vais à', 'l’école'), 'Je vais à l’école');
});

test('appendTranscript corta en 500 letras contando emoji y acentos', () => {
  const result = appendTranscript('é'.repeat(498), '😀😀😀😀');
  assert.equal([...result].length, 500);
  assert.equal(result.endsWith(' 😀'), true);
  assert.equal([...appendTranscript('', 'é'.repeat(600))].length, 500);
});

test('appendTranscript acepta otro máximo', () => {
  assert.equal(appendTranscript('ab', 'cdef', 5), 'ab cd');
});

test('recognitionMessageKey sigue la tabla', () => {
  const table = {
    'not-allowed': 'micBlocked',
    'service-not-allowed': 'micBlocked',
    'no-speech': 'micNoSpeech',
    'audio-capture': 'micNoDevice',
    network: 'micNetwork',
    'language-not-supported': 'micLanguage',
    aborted: null,
    'algo-nuevo': 'micFailed',
  };
  for (const [code, key] of Object.entries(table)) assert.equal(recognitionMessageKey(code), key, code);
});

class FakeRecognition {
  constructor() {
    this.startCalls = 0;
    this.stopCalls = 0;
    FakeRecognition.last = this;
  }
  start() {
    this.startCalls += 1;
  }
  stop() {
    this.stopCalls += 1;
  }
}

function listen() {
  const calls = { interim: [], final: [], error: [], end: 0 };
  const handle = startListening({
    Recognition: FakeRecognition,
    onInterim: (text) => calls.interim.push(text),
    onFinal: (text) => calls.final.push(text),
    onError: (code) => calls.error.push(code),
    onEnd: () => (calls.end += 1),
  });
  return { calls, handle, recognition: FakeRecognition.last };
}

function result(transcript, isFinal) {
  const item = [{ transcript }];
  item.isFinal = isFinal;
  return item;
}

test('startListening configura el reconocimiento y arranca una vez', () => {
  const { recognition } = listen();
  assert.equal(recognition.lang, 'fr-FR');
  assert.equal(recognition.interimResults, true);
  assert.equal(recognition.maxAlternatives, 1);
  assert.equal(recognition.continuous, false);
  assert.equal(recognition.startCalls, 1);
});

test('startListening manda el texto parcial a onInterim', () => {
  const { calls, recognition } = listen();
  recognition.onresult({ resultIndex: 0, results: [result('bonj', false)] });
  assert.deepEqual(calls.interim, ['bonj']);
  assert.deepEqual(calls.final, []);
});

test('startListening manda el texto final a onFinal', () => {
  const { calls, recognition } = listen();
  recognition.onresult({ resultIndex: 0, results: [result('bonjour', true)] });
  assert.deepEqual(calls.final, ['bonjour']);
  assert.deepEqual(calls.interim, []);
});

test('startListening ignora resultados anteriores a resultIndex', () => {
  const { calls, recognition } = listen();
  recognition.onresult({ resultIndex: 1, results: [result('bonjour', true), result('ça', false)] });
  assert.deepEqual(calls.final, []);
  assert.deepEqual(calls.interim, ['ça']);
});

test('startListening avisa error y fin', () => {
  const { calls, recognition } = listen();
  recognition.onerror({ error: 'not-allowed' });
  recognition.onend();
  assert.deepEqual(calls.error, ['not-allowed']);
  assert.equal(calls.end, 1);
});

test('stop() detiene el reconocimiento', () => {
  const { handle, recognition } = listen();
  handle.stop();
  assert.equal(recognition.stopCalls, 1);
});
