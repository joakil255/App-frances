import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeLookup } from '../src/lookup-normalize.js';
import { ProviderError } from '../src/errors.js';

const base = {
  contextTranslation: 'la casa',
  lemma: 'maison',
  lemmaTranslation: 'casa',
  partOfSpeech: 'noun',
  gender: 'f',
  baseWithArticle: 'la maison',
  sentenceTranslation: 'La casa es grande.',
};
const make = (changes) => ({ ...base, ...changes });
const isBad = (error) => error instanceof ProviderError && error.code === 'bad_output';

test('un sustantivo válido pasa igual', () => {
  assert.deepEqual(normalizeLookup(make({})), base);
});

test('acepta «les vacances» (f) y «l\'école» (m)', () => {
  assert.equal(normalizeLookup(make({ lemma: 'vacances', baseWithArticle: 'les vacances' })).lemma, 'vacances');
  assert.equal(normalizeLookup(make({ lemma: 'école', gender: 'm', baseWithArticle: "l'école" })).gender, 'm');
});

test('«le» con f es bad_output', () => {
  assert.throws(() => normalizeLookup(make({ baseWithArticle: 'le maison' })), isBad);
  assert.throws(() => normalizeLookup(make({ gender: 'm' })), isBad);
});

test('un sustantivo sin género es bad_output', () => {
  assert.throws(() => normalizeLookup(make({ gender: null })), isBad);
});

test('baseWithArticle que no da el lemma es bad_output', () => {
  assert.throws(() => normalizeLookup(make({ baseWithArticle: 'la maisons' })), isBad);
  assert.throws(() => normalizeLookup(make({ baseWithArticle: 'maison' })), isBad);
});

test('nombre propio: lemma en minúsculas, género null, palabra con mayúscula', () => {
  const out = normalizeLookup(make({ partOfSpeech: 'proper_noun', lemma: 'paris', gender: null, baseWithArticle: 'Paris' }));
  assert.equal(out.lemma, 'paris');
  assert.equal(out.baseWithArticle, 'Paris');
  assert.throws(() => normalizeLookup(make({ partOfSpeech: 'proper_noun', lemma: 'paris', gender: 'm', baseWithArticle: 'Paris' })), isBad);
  assert.throws(() => normalizeLookup(make({ partOfSpeech: 'proper_noun', lemma: 'paris', gender: null, baseWithArticle: 'Lyon' })), isBad);
});

test('otros tipos exigen género null y baseWithArticle igual al lemma', () => {
  const verb = make({ partOfSpeech: 'verb', lemma: 'manger', gender: null, baseWithArticle: 'manger' });
  assert.equal(normalizeLookup(verb).lemma, 'manger');
  assert.throws(() => normalizeLookup({ ...verb, gender: 'm' }), isBad);
  assert.throws(() => normalizeLookup({ ...verb, baseWithArticle: 'manges' }), isBad);
  const expr = make({ partOfSpeech: 'expression', lemma: 'un peu', gender: null, baseWithArticle: 'un peu' });
  assert.equal(normalizeLookup(expr).lemma, 'un peu');
});

test('normaliza el lemma: minúsculas y apóstrofo recto', () => {
  const out = normalizeLookup(make({ partOfSpeech: 'adverb', lemma: 'Aujourd’hui', gender: null, baseWithArticle: 'aujourd’hui' }));
  assert.equal(out.lemma, "aujourd'hui");
  assert.equal(out.baseWithArticle, "aujourd'hui");
});

test('no le quita artículos al lemma', () => {
  assert.throws(() => normalizeLookup(make({ lemma: 'la maison' })), isBad);
});

test('campos de más, faltantes, vacíos o de tipo malo son bad_output', () => {
  assert.throws(() => normalizeLookup({ ...base, extra: 1 }), isBad);
  const missing = { ...base };
  delete missing.sentenceTranslation;
  assert.throws(() => normalizeLookup(missing), isBad);
  assert.throws(() => normalizeLookup(make({ contextTranslation: ' ' })), isBad);
  assert.throws(() => normalizeLookup(make({ lemmaTranslation: 3 })), isBad);
  assert.throws(() => normalizeLookup(make({ partOfSpeech: 'sustantivo' })), isBad);
  assert.throws(() => normalizeLookup(make({ gender: 'x' })), isBad);
  for (const raw of [null, [], 'x']) assert.throws(() => normalizeLookup(raw), isBad);
});
