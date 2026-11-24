import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readConfig } from '../src/config.js';

const validEnv = {
  AI_PROVIDER: 'claude',
  AI_MODEL: 'claude-haiku-5-5',
  AI_EFFORT: 'low',
  DAILY_LIMIT: '100',
  ALLOWED_ORIGINS: 'https://joakil255.github.io,http://127.0.0.1:8000',
  ANTHROPIC_API_KEY: 'clave-de-prueba',
  ACCESS_CODE: 'codigo-de-prueba',
};

test('lee la configuración completa', () => {
  const result = readConfig(validEnv);
  assert.equal(result.ok, true);
  assert.equal(result.config.provider, 'claude');
  assert.equal(result.config.model, 'claude-haiku-5-5');
  assert.equal(result.config.effort, 'low');
  assert.equal(result.config.dailyLimit, 100);
  assert.equal(result.config.apiKey, 'clave-de-prueba');
  assert.equal(result.config.accessCode, 'codigo-de-prueba');
  assert.deepEqual(result.config.allowedOrigins, ['https://joakil255.github.io', 'http://127.0.0.1:8000']);
});

test('falta un secreto, una variable o el proveedor no existe → ok: false', () => {
  const cases = [
    { ...validEnv, ANTHROPIC_API_KEY: undefined },
    { ...validEnv, ACCESS_CODE: undefined },
    { ...validEnv, AI_MODEL: undefined },
    { ...validEnv, AI_PROVIDER: 'gemini' },
    { ...validEnv, DAILY_LIMIT: 'cien' },
  ];
  for (const env of cases) {
    assert.deepEqual(readConfig(env), { ok: false });
  }
});
