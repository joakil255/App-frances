import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createReadingQuiz } from '../js/lib/reading-quiz.js';

const quiz = {
  lang: 'es',
  questions: [0, 1, 2].map((n) => ({
    question: `P${n}`, options: ['a', 'b', 'c'], answer: n, explanation: `E${n}`, evidence: `V${n}`,
  })),
};

test('current muestra la pregunta sin la respuesta', () => {
  const q = createReadingQuiz(quiz);
  assert.deepEqual(q.current(), { index: 0, question: 'P0', options: ['a', 'b', 'c'] });
});

test('answer puntúa y devuelve explicación y evidencia', () => {
  const q = createReadingQuiz(quiz);
  assert.deepEqual(q.answer(0), { correct: true, answer: 0, explanation: 'E0', evidence: 'V0' });
  assert.equal(q.next(), true);
  assert.deepEqual(q.answer(0), { correct: false, answer: 1, explanation: 'E1', evidence: 'V1' });
});

test('no deja responder dos veces la misma pregunta', () => {
  const q = createReadingQuiz(quiz);
  q.answer(1);
  assert.equal(q.answer(0), null);
  assert.deepEqual(q.result(), { correct: 0, total: 3 });
});

test('opciones fuera de rango no cuentan', () => {
  const q = createReadingQuiz(quiz);
  for (const bad of [-1, 3, 1.5, '0', undefined]) assert.equal(q.answer(bad), null);
  assert.notEqual(q.answer(0), null);
});

test('next avanza y al final devuelve false sin salirse', () => {
  const q = createReadingQuiz(quiz);
  assert.equal(q.next(), true);
  assert.equal(q.current().index, 1);
  assert.equal(q.next(), true);
  assert.equal(q.next(), false);
  assert.equal(q.current().index, 2);
});

test('result cuenta los aciertos y el total', () => {
  const q = createReadingQuiz(quiz);
  q.answer(0); q.next();
  q.answer(1); q.next();
  q.answer(0);
  assert.deepEqual(q.result(), { correct: 2, total: 3 });
});
