import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { scoreLookup } from '../eval/score-lookup.js';

const cases = JSON.parse(readFileSync(new URL('../eval/lookup-cases.json', import.meta.url), 'utf8'));

test('hay 10 casos con los campos esperados', () => {
  assert.equal(cases.length, 10);
  for (const item of cases) {
    for (const key of ['id', 'word', 'sentence', 'lemma', 'partOfSpeech']) assert.ok(item[key], `${key} en #${item.id}`);
    assert.ok(item.sentence.toLowerCase().includes(item.word));
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
