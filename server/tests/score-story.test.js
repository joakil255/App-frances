import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { scoreStory, meetsCriterion } from '../eval/score-story.js';

const cases = JSON.parse(readFileSync(new URL('../eval/story-cases.json', import.meta.url), 'utf8'));

const body = Array.from({ length: 20 }, (_, i) => `Je vois un chat ${i} dans la maison.`).join(' ');
const question = {
  question: '¿Qué ve?', options: ['Un gato', 'Un perro', 'Un pájaro'], answer: 0,
  explanation: 'Ve un gato.', evidence: 'Je vois un chat 3 dans la maison.',
};
const sentences = Array.from({ length: 20 }, (_, i) => ({ text: `Je vois un chat ${i} dans la maison.`, translation: `Veo un gato ${i} en la casa.` }));
const good = { title: 'Mon chat', body, sentences, questions: [question, question, question, question] };

test('hay 3 casos: A1.1 mon chat (es), A1.2 le marché (es), A2 un voyage (fr)', () => {
  assert.deepEqual(
    cases.map(({ level, topic, quizLang }) => [level, topic, quizLang]),
    [['A1.1', 'mon chat', 'es'], ['A1.2', 'le marché', 'es'], ['A2', 'un voyage', 'fr']],
  );
  for (const item of cases) assert.equal(item.lang, 'fr');
});

test('una historia correcta pasa las cuatro comprobaciones', () => {
  assert.deepEqual(scoreStory(good), {
    wordsOk: true, sentencesOk: true, noMarkupOk: true, questionsOk: true, translationsOk: true,
  });
});

test('detecta pares sin traducción o sin frases', () => {
  assert.equal(scoreStory({ ...good, sentences: [] }).translationsOk, false);
  assert.equal(scoreStory({ ...good, sentences: undefined }).translationsOk, false);
  const blank = [...sentences.slice(1), { ...sentences[0], translation: '  ' }];
  assert.equal(scoreStory({ ...good, sentences: blank }).translationsOk, false);
  assert.equal(scoreStory({ ...good, sentences: sentences.slice(1) }).translationsOk, false);
});

test('detecta pocas palabras', () => {
  assert.equal(scoreStory({ ...good, body: 'Je vois un chat. Il dort. Il mange. Il joue.' }).wordsOk, false);
});

test('detecta pocas frases', () => {
  const long = Array.from({ length: 90 }, () => 'chat').join(' ');
  assert.equal(scoreStory({ ...good, body: `${long}.` }).sentencesOk, false);
});

test('detecta Markdown y HTML', () => {
  assert.equal(scoreStory({ ...good, body: `**${body}**` }).noMarkupOk, false);
  assert.equal(scoreStory({ ...good, body: `${body} <b>chat</b>` }).noMarkupOk, false);
});

test('detecta preguntas mal formadas o con evidencia que no está en el texto', () => {
  assert.equal(scoreStory({ ...good, questions: [question] }).questionsOk, false);
  const bad = { ...question, evidence: 'Cette phrase est absente.' };
  assert.equal(scoreStory({ ...good, questions: [question, question, question, bad] }).questionsOk, false);
});

test('criterio: las 3 pasan todo y cero rechazos', () => {
  const ok = {
    wordsOk: true, sentencesOk: true, noMarkupOk: true, questionsOk: true, translationsOk: true,
  };
  const rows = [ok, ok, ok];
  assert.equal(meetsCriterion(rows, 0), true);
  assert.equal(meetsCriterion(rows, 1), false);
  assert.equal(meetsCriterion([ok, ok, { ...ok, wordsOk: false }], 0), false);
  assert.equal(meetsCriterion([ok, ok], 0), false);
});
