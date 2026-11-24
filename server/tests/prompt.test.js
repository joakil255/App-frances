import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSystemPrompt, OUTPUT_SCHEMA, LEVELS } from '../src/prompt.js';

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
