import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wordDiff, checkExercise, checkFree, createTileBoard } from '../js/lib/sentence-check.js';

const statuses = (d) => d.map((x) => x.status);

test('wordDiff: igual, cambia, falta y sobra', () => {
  assert.deepEqual(statuses(wordDiff('je suis ici', 'je suis ici')), ['same', 'same', 'same']);
  const changed = wordDiff('je suis la', 'je suis ici');
  assert.deepEqual(changed[2], { word: 'la', status: 'changed', expected: 'ici' });
  assert.deepEqual(wordDiff('je ici', 'je suis ici')[1], { word: 'suis', status: 'missing' });
  assert.deepEqual(wordDiff('je suis très ici', 'je suis ici')[2], { word: 'très', status: 'extra' });
});

test('wordDiff: œ frente a oe cuenta como cambio', () => {
  assert.equal(wordDiff('oeuf', 'œuf')[0].status, 'changed');
});

test('wordDiff: entrada vacía es todo missing', () => {
  assert.deepEqual(statuses(wordDiff('', 'je suis')), ['missing', 'missing']);
});

const order = { type: 'order', answers: ["J'habite à Lyon."], rule: 'Regla.' };

test('checkExercise: correcta con apóstrofo tipográfico y sin acento', () => {
  const r = checkExercise(order, 'j’habite a lyon', { requireAccents: false });
  assert.equal(r.correct, true);
  assert.equal(r.accentOnly, true);
  // Según la especificación, también al acertar se avisa del acento
  assert.equal(r.explanation, "Ojo con el acento: J'habite à Lyon.");
  const s = checkExercise(order, 'j’habite a lyon', { requireAccents: true });
  assert.equal(s.correct, false);
  assert.equal(s.accentOnly, true);
  assert.equal(s.explanation, "Ojo con el acento: J'habite à Lyon.");
});

test('checkExercise: espacio fino antes de ?', () => {
  const ex = { type: 'order', answers: ['Tu viens ?'], rule: 'r' };
  assert.equal(checkExercise(ex, 'Tu viens ?', { requireAccents: true }).correct, true);
});

const gap = {
  type: 'gap', before: '', after: ' à Lyon.', answers: ["J'habite"], rule: 'Regla gap.',
  mistakes: [{ answer: 'Je habite', explanation: 'Falta la elisión…' }],
};

test('checkExercise: error previsto en gap', () => {
  const r = checkExercise(gap, 'je habite', { requireAccents: true });
  assert.equal(r.correct, false);
  assert.equal(r.explanation, 'Falta la elisión…');
  assert.equal(r.expected, "J'habite à Lyon.");
});

test('checkExercise: error no previsto da la regla y marca la palabra', () => {
  const r = checkExercise(gap, 'tu habites', { requireAccents: true });
  assert.equal(r.explanation, 'Regla gap.');
  assert.ok(r.diff.some((d) => d.status !== 'same'));
  assert.equal(checkExercise(gap, "J'habite", { requireAccents: true }).correct, true);
});

test('checkExercise: elige la respuesta aceptada más parecida', () => {
  const ex = { type: 'fix', answers: ['Il a deux chats noirs', 'Elle a un chat'], rule: 'r' };
  const r = checkExercise(ex, 'Elle a deux chat', { requireAccents: true });
  assert.equal(r.expected, 'Elle a un chat');
});

test('checkExercise: vacía y muy larga', () => {
  const e = checkExercise(order, '', { requireAccents: true });
  assert.equal(e.correct, false);
  assert.ok(e.diff.every((d) => d.status === 'missing'));
  const l = checkExercise(order, 'a'.repeat(1000), { requireAccents: true });
  assert.equal(l.correct, false);
});

const situation = { models: ['Je voudrais un café.', "Je prends un café, s'il vous plaît."] };

test('checkFree', () => {
  assert.deepEqual(checkFree(situation, "je prends un café s’il vous plaît", { requireAccents: true }),
    { correct: true, accentOnly: false, needsAi: false });
  assert.equal(checkFree(situation, 'Bonjour', { requireAccents: true }).needsAi, true);
  assert.deepEqual(checkFree(situation, '  ', { requireAccents: true }),
    { correct: false, accentOnly: false, needsAi: false });
  assert.equal(checkFree(situation, 'je voudrais un cafe', { requireAccents: false }).correct, true);
});

test('createTileBoard', () => {
  const b = createTileBoard(['le', 'chat', 'le', 'noir']);
  b.place(1); b.place(0); b.place(3);
  b.place(1); // ya colocada: no hace nada
  assert.equal(b.sentence(), 'chat le noir');
  b.remove(0);
  assert.equal(b.sentence(), 'chat noir');
  assert.deepEqual(b.available(), [{ index: 0, text: 'le' }, { index: 2, text: 'le' }]);
  b.place(2);
  assert.deepEqual(b.placed().map((p) => p.index), [1, 3, 2]);
  b.clear();
  assert.equal(b.sentence(), '');
  assert.equal(b.available().length, 4);
});
