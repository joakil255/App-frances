import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  QUIZ_LENGTH, MODES, MODE_MESSAGES, modeStatus, pickQuizWords, buildChoiceOptions, expectedAnswer, summarizeQuiz,
} from '../js/lib/quiz.js';
import { normalizeAnswer } from '../js/lib/answer-check.js';

// Azar predecible: devuelve los valores de la lista en bucle
const seq = (...values) => {
  let i = 0;
  return () => values[i++ % values.length];
};
const word = (n, fields = {}) => ({ id: `w${n}`, fr: `le mot ${n}`, es: `la palabra ${n}`, exampleFr: `Phrase ${n}.`, exampleEs: `Frase ${n}.`, ...fields });
const makeWords = (n) => Array.from({ length: n }, (_, i) => word(i + 1));
const cardFor = (wordId, direction) => ({ [`${wordId}:${direction}`]: { id: `${wordId}:${direction}`, wordId, direction } });
const ids = (list) => list.map((w) => w.id);

test('constantes del quiz', () => {
  assert.equal(QUIZ_LENGTH, 10);
  assert.deepEqual(MODES, ['choice', 'write', 'dictation']);
});

test('QZ1: las estudiadas (en cualquier dirección) salen antes que las demás', () => {
  const words = makeWords(8);
  const cards = { ...cardFor('w5', 'fr-es'), ...cardFor('w6', 'es-fr') };
  for (const random of [seq(0), seq(0.99), seq(0.3, 0.7, 0.1)]) {
    const picked = pickQuizWords({ words, cards, mode: 'write', random });
    assert.deepEqual(new Set(ids(picked).slice(0, 2)), new Set(['w5', 'w6']));
  }
});

test('QZ2: si faltan estudiadas se completa con las demás hasta 10', () => {
  const words = makeWords(12);
  const cards = { ...cardFor('w2', 'fr-es'), ...cardFor('w7', 'fr-es'), ...cardFor('w11', 'es-fr') };
  const picked = pickQuizWords({ words, cards, mode: 'choice', random: seq(0.42, 0.13, 0.77) });
  assert.equal(picked.length, 10);
  assert.deepEqual(new Set(ids(picked).slice(0, 3)), new Set(['w2', 'w7', 'w11']));
});

test('QZ3: sin repetir; con menos de 10 palabras la sesión es más corta', () => {
  const picked = pickQuizWords({ words: makeWords(6), cards: {}, mode: 'write', random: seq(0.5, 0.2) });
  assert.equal(picked.length, 6);
  assert.equal(new Set(ids(picked)).size, 6);
  const many = pickQuizWords({ words: makeWords(30), cards: {}, mode: 'write', random: seq(0.9, 0.1) });
  assert.equal(new Set(ids(many)).size, 10);
});

test('QZ3: el azar cambia el orden', () => {
  const words = makeWords(10);
  const a = ids(pickQuizWords({ words, cards: {}, mode: 'write', random: seq(0) }));
  const b = ids(pickQuizWords({ words, cards: {}, mode: 'write', random: seq(0.99) }));
  assert.notDeepEqual(a, b);
});

test('QZ4: en el dictado solo salen palabras con frase de ejemplo', () => {
  const words = [word(1), word(2, { exampleFr: '' }), word(3, { exampleFr: '   ' }), word(4)];
  const picked = pickQuizWords({ words, cards: cardFor('w2', 'fr-es'), mode: 'dictation', random: seq(0.6) });
  assert.deepEqual(new Set(ids(picked)), new Set(['w1', 'w4']));
});

test('QZ5: 4 opciones, una correcta, sin textos repetidos, de las palabras del usuario', () => {
  const words = [
    word(1, { es: 'el gato' }), word(2, { es: 'el gato' }), word(3, { es: 'La casa' }), word(4, { es: 'la  casa' }),
    word(5, { es: 'el perro' }), word(6, { es: 'el pan' }), word(7, { es: 'el agua' }),
  ];
  for (const target of words) {
    for (const random of [seq(0), seq(0.99), seq(0.31, 0.62, 0.05)]) {
      const options = buildChoiceOptions({ word: target, words, random });
      assert.equal(options.length, 4);
      const correct = options.filter((o) => o.isCorrect);
      assert.deepEqual(correct, [{ wordId: target.id, text: target.es, isCorrect: true }]);
      const keys = options.map((o) => normalizeAnswer(o.text));
      assert.equal(new Set(keys).size, 4, `${target.id}: ${keys}`);
      for (const option of options) assert.ok(words.some((w) => w.id === option.wordId && w.es === option.text));
    }
  }
});

test('QZ5: el azar cambia el orden de las opciones', () => {
  const words = makeWords(8);
  const a = buildChoiceOptions({ word: words[0], words, random: seq(0) }).map((o) => o.wordId);
  const b = buildChoiceOptions({ word: words[0], words, random: seq(0.99) }).map((o) => o.wordId);
  assert.notDeepEqual(a, b);
});

test('QZ6: sin palabras no hay ningún modo', () => {
  const status = modeStatus({ words: [], hasVoice: true });
  for (const mode of MODES) {
    assert.deepEqual(status[mode], { available: false, reason: 'Añade palabras en Vocabulario para empezar.' });
  }
});

test('QZ6: la opción múltiple pide 4 traducciones distintas', () => {
  const reason = 'Necesitas al menos 4 palabras con traducciones distintas.';
  assert.deepEqual(modeStatus({ words: makeWords(3), hasVoice: true }).choice, { available: false, reason });
  const repeated = [word(1, { es: 'el gato' }), word(2, { es: 'El  gato' }), word(3), word(4)];
  assert.deepEqual(modeStatus({ words: repeated, hasVoice: true }).choice, { available: false, reason });
  assert.deepEqual(modeStatus({ words: makeWords(4), hasVoice: true }).choice, { available: true, reason: null });
  assert.deepEqual(modeStatus({ words: makeWords(1), hasVoice: true }).write, { available: true, reason: null });
});

test('QZ6: el dictado pide frases de ejemplo y voz francesa', () => {
  const noExamples = [word(1, { exampleFr: '' }), word(2, { exampleFr: ' ' })];
  assert.deepEqual(modeStatus({ words: noExamples, hasVoice: true }).dictation,
    { available: false, reason: 'Ninguna de tus palabras tiene frase de ejemplo. Añádelas en Vocabulario.' });
  assert.deepEqual(modeStatus({ words: makeWords(2), hasVoice: false }).dictation,
    { available: false, reason: 'Este dispositivo no tiene voz francesa.' });
  assert.deepEqual(modeStatus({ words: makeWords(2), hasVoice: null }).dictation,
    { available: false, reason: 'Comprobando la voz…' });
  assert.deepEqual(modeStatus({ words: makeWords(2), hasVoice: true }).dictation, { available: true, reason: null });
  assert.deepEqual(MODE_MESSAGES, {
    noWords: 'Añade palabras en Vocabulario para empezar.',
    choice: 'Necesitas al menos 4 palabras con traducciones distintas.',
    noExamples: 'Ninguna de tus palabras tiene frase de ejemplo. Añádelas en Vocabulario.',
    noVoice: 'Este dispositivo no tiene voz francesa.',
    checkingVoice: 'Comprobando la voz…',
  });
});

test('QZ7: el resumen cuenta aciertos (también solo-acento tolerado) y lista las falladas en orden', () => {
  const results = [
    { word: word(1), mode: 'write', correct: true, accentOnly: false, typed: 'le mot 1' },
    { word: word(2), mode: 'write', correct: false, accentOnly: false, typed: 'x' },
    { word: word(3), mode: 'write', correct: true, accentOnly: true, typed: 'le mot 3' },
    { word: word(4), mode: 'write', correct: false, accentOnly: true, typed: 'y' },
    { word: word(5), mode: 'write', correct: false, accentOnly: false, typed: null },
  ];
  const summary = summarizeQuiz(results);
  assert.equal(summary.total, 5);
  assert.equal(summary.correct, 2);
  assert.deepEqual(summary.failed, [results[1], results[3], results[4]]);
  assert.deepEqual(summarizeQuiz([]), { total: 0, correct: 0, failed: [] });
});

test('expectedAnswer según el modo', () => {
  const w = word(1, { fr: "l'eau", es: 'el agua', exampleFr: "Je bois de l'eau." });
  assert.equal(expectedAnswer(w, 'write'), "l'eau");
  assert.equal(expectedAnswer(w, 'dictation'), "Je bois de l'eau.");
  assert.equal(expectedAnswer(w, 'choice'), 'el agua');
});
