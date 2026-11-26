import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSystemPrompt, buildStoryPrompt, STORY_SCHEMA, OUTPUT_SCHEMA, LEVELS } from '../src/prompt.js';

test('pone el nivel en las instrucciones', () => {
  const prompt = buildSystemPrompt('A1.1');
  assert.ok(prompt.includes('nivel A1.1'));
  assert.ok(!prompt.includes('{level}'));
  assert.deepEqual(LEVELS, ['A1.1', 'A1.2']);
});

test('el esquema exige reply y corrections sin campos extra', () => {
  assert.equal(OUTPUT_SCHEMA.additionalProperties, false);
  assert.equal(OUTPUT_SCHEMA.properties.corrections.items.additionalProperties, false);
  assert.deepEqual(OUTPUT_SCHEMA.required, ['reply', 'corrections']);
  assert.deepEqual(OUTPUT_SCHEMA.properties.corrections.items.required, ['original', 'corrected', 'explanation']);
});

test('la consulta pide que el nombre propio conserve su mayúscula en baseWithArticle', async () => {
  const { buildLookupPrompt } = await import('../src/prompt.js');
  assert.match(buildLookupPrompt(), /"baseWithArticle" el nombre con su mayúscula/);
});

test('las instrucciones de frases llevan el nivel, la regla de suggestion y el esquema cerrado', async () => {
  const { buildSentencePrompt, SENTENCE_SCHEMA } = await import('../src/prompt.js');
  const prompt = buildSentencePrompt('A2');
  assert.ok(prompt.includes('A2'));
  assert.ok(!prompt.includes('{level}'));
  assert.match(prompt, /"suggestion"/);
  assert.match(prompt, /nunca pongas en "errors"/i);
  assert.equal(SENTENCE_SCHEMA.additionalProperties, false);
  assert.deepEqual([...SENTENCE_SCHEMA.required].sort(), ['corrected', 'errors', 'suggestion']);
  const item = SENTENCE_SCHEMA.properties.errors.items;
  assert.equal(item.additionalProperties, false);
  assert.deepEqual([...item.required].sort(), ['corrected', 'explanation', 'kind', 'original']);
  assert.deepEqual(item.properties.kind.enum, ['grammar', 'syntax', 'spelling']);
});

test('las instrucciones de frases dicen qué hacer si falta una palabra y que no se marquen mayúsculas ni puntuación', async () => {
  const { buildSentencePrompt } = await import('../src/prompt.js');
  const prompt = buildSentencePrompt('A1.2');
  assert.match(prompt, /falta una palabra/i);
  assert.match(prompt, /«mange pain»/);
  assert.match(prompt, /«mange du pain»/);
  assert.match(prompt, /nunca dejes "original" vacío/i);
  assert.match(prompt, /no marques como error las mayúsculas ni la puntuación/i);
});

test('la historia pide frases emparejadas con su traducción al idioma de apoyo', () => {
  const prompt = buildStoryPrompt('A1.2', 'es', 'es');
  assert.ok(prompt.includes('"translation"'));
  assert.ok(prompt.includes('traducción natural y fiel al español'));
  assert.equal(prompt.includes('{'), false);
  assert.equal(prompt.includes('"body"'), false);
  assert.deepEqual(STORY_SCHEMA.properties.sentences.items.required, ['text', 'translation']);
  assert.equal(STORY_SCHEMA.properties.body, undefined);
  assert.deepEqual(STORY_SCHEMA.required, ['title', 'sentences', 'questions']);
});
