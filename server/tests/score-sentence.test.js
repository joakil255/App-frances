import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { scoreSentence, meetsCriterion } from '../eval/score-sentence.js';

const cases = JSON.parse(readFileSync(new URL('../eval/sentence-cases.json', import.meta.url), 'utf8'));

const err = { original: 'Je aime', corrected: "J'aime", kind: 'spelling', explanation: 'x' };
const withError = { correct: false, corrected: "J'aime le café.", errors: [err], suggestion: '' };
const clean = { correct: true, corrected: 'Je mange.', errors: [], suggestion: '' };

test('hay 12 casos: 6 con error, 3 correctas y 3 correctas con sugerencia', () => {
  assert.equal(cases.length, 12);
  const count = (expect) => cases.filter((item) => item.expect === expect).length;
  assert.deepEqual([count('error'), count('correct'), count('correct-suggest')], [6, 3, 3]);
  for (const item of cases) {
    assert.ok(item.situation && item.focus && item.sentence);
    if (item.expect === 'error') assert.ok(item.accepted.length > 0);
  }
  assert.deepEqual(
    cases.filter((item) => item.expect === 'error').map((item) => [item.sentence, item.accepted[0]]),
    [
      ['Je aime le café.', "J'aime le café."],
      ['Je suis 20 ans.', "J'ai 20 ans."],
      ['Je vais à le marché.', 'Je vais au marché.'],
      ['Nous mangez une pomme.', 'Nous mangeons une pomme.'],
      ['Je ne aime pas le thé.', "Je n'aime pas le thé."],
      ['Est-ce que il parle français ?', "Est-ce qu'il parle français ?"],
    ],
  );
});

test('error: encuentra el error y acepta la corrección ignorando apóstrofo y puntuación final', () => {
  const item = { expect: 'error', accepted: ["J'aime le café."] };
  assert.deepEqual(scoreSentence(item, withError), { errorFound: true, correctedOk: true });
  assert.equal(scoreSentence(item, { ...withError, corrected: 'J’aime le café' }).correctedOk, true);
  assert.equal(scoreSentence(item, { ...withError, corrected: 'Jaime le café.' }).correctedOk, false);
});

test('error: sin errores devueltos no se encuentra nada', () => {
  const item = { expect: 'error', accepted: ["J'aime le café."] };
  assert.deepEqual(scoreSentence(item, { ...clean, corrected: 'Je aime le café.' }), { errorFound: false, correctedOk: false });
});

test('correct: no debe inventar errores', () => {
  assert.deepEqual(scoreSentence({ expect: 'correct' }, clean), { noInvented: true });
  assert.deepEqual(scoreSentence({ expect: 'correct' }, withError), { noInvented: false });
});

test('correct-suggest: sin errores y con sugerencia no vacía', () => {
  const item = { expect: 'correct-suggest' };
  assert.deepEqual(scoreSentence(item, { ...clean, suggestion: 'Usa être. Ej.: Je suis ici.' }), { noInvented: true, suggestionOk: true });
  assert.deepEqual(scoreSentence(item, clean), { noInvented: true, suggestionOk: false });
  assert.deepEqual(scoreSentence(item, { ...withError, suggestion: 'x' }), { noInvented: false, suggestionOk: true });
});

function allGood() {
  return cases.map((item) => {
    if (item.expect === 'error') return { errorFound: true, correctedOk: true };
    if (item.expect === 'correct') return { noInvented: true };
    return { noInvented: true, suggestionOk: true };
  });
}

test('criterio: todo bien y cero rechazos se cumple', () => {
  assert.equal(meetsCriterion(allGood(), 0), true);
});

test('criterio: falla con un rechazo, un error sin corregir o una correcta con error inventado', () => {
  assert.equal(meetsCriterion(allGood(), 1), false);
  const a = allGood(); a[0] = { errorFound: true, correctedOk: false };
  assert.equal(meetsCriterion(a, 0), false);
  const b = allGood(); b[6] = { noInvented: false };
  assert.equal(meetsCriterion(b, 0), false);
  assert.equal(meetsCriterion(allGood().slice(1), 0), false);
});

test('criterio: acepta 2 de 3 sugerencias pero no 1', () => {
  const a = allGood(); a[11] = { noInvented: true, suggestionOk: false };
  assert.equal(meetsCriterion(a, 0), true);
  a[10] = { noInvented: true, suggestionOk: false };
  assert.equal(meetsCriterion(a, 0), false);
});
