import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { playFrench } from '../js/screens/voice.js';
import { MESSAGES } from '../js/lib/messages.js';

const study = readFileSync(new URL('../js/screens/study.js', import.meta.url), 'utf8');

// --- Cableado en la pantalla Estudiar ---
test('el botón del ejemplo lee exampleFr con la misma función de voz', () => {
  assert.match(study, /\[data-listen-example\]/);
  assert.match(study, /function listenExample\(\)[\s\S]*?playFrench\(\{[^}]*session\.current\.word\.exampleFr/);
});

test('el botón del ejemplo no califica ni gira la tarjeta', () => {
  const body = study.match(/function listenExample\(\) \{([\s\S]*?)\n {2}\}/)?.[1] ?? '';
  assert.ok(body, 'falta listenExample');
  assert.doesNotMatch(body, /answer\(|revealAnswer|studyStore|front\.hidden|back\.hidden/);
});

test('el atajo O y el botón de la palabra no cambian: siguen leyendo la palabra', () => {
  assert.match(study, /function listen\(\)[\s\S]*?text: session\.current\.word\.fr/);
});

// --- playFrench (la función compartida): aviso sin voz francesa y corte del audio anterior ---
const makeNotice = () => ({ hidden: true, children: [], replaceChildren(...c) { this.children = c; } });
const synthWith = (voices) => {
  const calls = [];
  return {
    calls,
    getVoices: () => voices,
    addEventListener() {}, removeEventListener() {},
    cancel: () => calls.push('cancel'),
    speak: (u) => calls.push(`speak:${u.text}`),
  };
};
class FakeUtterance { constructor(text) { this.text = text; } }

beforeEach(() => {
  globalThis.document = { createElement: (tag) => ({ tag, textContent: '' }) };
  globalThis.SpeechSynthesisUtterance = FakeUtterance;
});

test('sin voz francesa muestra el aviso claro y no habla', async () => {
  const synth = synthWith([{ name: 'Inglés', lang: 'en-US', localService: true }]);
  const notice = makeNotice();
  let failed = 0;
  await playFrench({ synth, text: 'Je bois de l’eau.', rate: 1, notice, onFail: () => failed++ });
  assert.equal(notice.hidden, false);
  assert.equal(notice.children[0].textContent, MESSAGES.noFrenchVoice.title);
  assert.equal(failed, 1);
  assert.deepEqual(synth.calls, []);
});

test('sin sistema de voz muestra el aviso de que no hay voz', async () => {
  const notice = makeNotice();
  await playFrench({ synth: null, text: 'Bonjour', rate: 1, notice });
  assert.equal(notice.children[0].textContent, MESSAGES.noSpeech.title);
});

test('con voz francesa detiene lo anterior y luego lee la frase', async () => {
  const synth = synthWith([{ name: 'Fr', lang: 'fr-FR', localService: true }]);
  await playFrench({ synth, text: 'Il fait beau, à côté.', rate: 1, notice: makeNotice() });
  assert.deepEqual(synth.calls, ['cancel', 'speak:Il fait beau, à côté.']);
});
