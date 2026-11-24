import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { scoreLookup, meetsCriterion } from '../eval/score-lookup.js';

const cases = JSON.parse(readFileSync(new URL('../eval/lookup-cases.json', import.meta.url), 'utf8'));

test('los casos tienen los campos esperados', () => {
  for (const item of cases) {
    for (const key of ['id', 'word', 'sentence', 'lemma', 'partOfSpeech']) assert.ok(item[key], `${key} en #${item.id}`);
    assert.ok(item.sentence.toLowerCase().includes(item.word.toLowerCase()));
  }
});

test('acierta forma base y tipo', () => {
  assert.deepEqual(scoreLookup(cases[0], { lemma: 'manger', partOfSpeech: 'verb' }), { lemmaOk: true, posOk: true });
});

test('falla si la forma base o el tipo no coinciden', () => {
  assert.deepEqual(scoreLookup(cases[0], { lemma: 'manges', partOfSpeech: 'noun' }), { lemmaOk: false, posOk: false });
});

test('ignora mayúsculas y el tipo de apóstrofo', () => {
  const item = { lemma: "aujourd'hui", partOfSpeech: 'adverb' };
  assert.deepEqual(scoreLookup(item, { lemma: 'Aujourd’hui', partOfSpeech: 'adverb' }), { lemmaOk: true, posOk: true });
});

test('hay 12 casos: los 10 originales y 2 con mayúscula', () => {
  assert.equal(cases.length, 12);
  assert.deepEqual(cases.slice(10).map((item) => item.lemma), ['bonjour', 'paris']);
});

test('criterio: 9 de los 10 originales bien y cero rechazos en los 12', () => {
  const rows = (failIds) => cases.map((item) => ({ id: item.id, ok: !failIds.includes(item.id) }));
  assert.equal(meetsCriterion(rows([]), 0), true);
  assert.equal(meetsCriterion(rows([3]), 0), true);
  assert.equal(meetsCriterion(rows([3, 4]), 0), false);
  assert.equal(meetsCriterion(rows([11, 12]), 0), true);
  assert.equal(meetsCriterion(rows([]), 1), false);
});
