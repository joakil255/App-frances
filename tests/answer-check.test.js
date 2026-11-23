import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAnswer, foldAccents, checkAnswer } from '../js/lib/answer-check.js';

const RIGHT = { correct: true, accentOnly: false };
const WRONG = { correct: false, accentOnly: false };
const ACCENT_OK = { correct: true, accentOnly: true };
const ACCENT_BAD = { correct: false, accentOnly: true };
const tolerant = (typed, expected) => checkAnswer(typed, expected, { requireAccents: false });
const strict = (typed, expected) => checkAnswer(typed, expected, { requireAccents: true });

test('C1: «e» por «é» es un error solo de acento', () => {
  assert.deepEqual(tolerant('ete', 'été'), ACCENT_OK);
  assert.deepEqual(strict('ete', 'été'), ACCENT_BAD);
});

test('C2: el apóstrofo tipográfico vale igual que el recto, en los dos sentidos', () => {
  for (const check of [tolerant, strict]) {
    assert.deepEqual(check('l’ami', "l'ami"), RIGHT);
    assert.deepEqual(check("l'ami", 'l’ami'), RIGHT);
  }
});

test('C3: se ignoran los espacios sobrantes (dobles, tabulador, salto de línea, no separable)', () => {
  for (const check of [tolerant, strict]) {
    for (const typed of ['le  chat ', ' le\tchat', 'le\nchat', 'le chat']) {
      assert.deepEqual(check(typed, 'le chat'), RIGHT, JSON.stringify(typed));
    }
  }
});

test('C4: se ignoran las mayúsculas, también con acento', () => {
  for (const check of [tolerant, strict]) {
    assert.deepEqual(check('LE CHAT', 'le chat'), RIGHT);
    assert.deepEqual(check('ÉTÉ', 'été'), RIGHT);
  }
});

test('C5: se ignora la puntuación y el espacio fino francés antes de «?»', () => {
  for (const check of [tolerant, strict]) {
    assert.deepEqual(check('bonjour marie ça va', 'Bonjour, Marie, ça va ?'), RIGHT);
  }
});

test('C6: la frase sin cedilla es un error solo de acento', () => {
  assert.deepEqual(tolerant('bonjour marie ca va', 'Bonjour, Marie, ça va ?'), ACCENT_OK);
  assert.deepEqual(strict('bonjour marie ca va', 'Bonjour, Marie, ça va ?'), ACCENT_BAD);
});

test('C7: otra palabra o sin artículo es un fallo', () => {
  for (const check of [tolerant, strict]) {
    assert.deepEqual(check('le chien', 'le chat'), WRONG);
    assert.deepEqual(check('chat', 'le chat'), WRONG);
  }
});

test('C8: una respuesta vacía o con solo espacios es un fallo sin acento', () => {
  for (const check of [tolerant, strict]) {
    for (const typed of ['', '   ', undefined, null]) assert.deepEqual(check(typed, 'le chat'), WRONG);
  }
});

test('C9: «oe» por «œ» es un error solo de acento', () => {
  assert.deepEqual(tolerant("l'oeuf", "l'œuf"), ACCENT_OK);
  assert.deepEqual(strict("l'oeuf", "l'œuf"), ACCENT_BAD);
});

test('C10: el guion cuenta', () => {
  for (const check of [tolerant, strict]) assert.deepEqual(check('le grand pere', 'le grand-père'), WRONG);
});

test('C11: una «é» descompuesta (e + acento) vale igual que la compuesta', () => {
  for (const check of [tolerant, strict]) assert.deepEqual(check('été', 'été'), RIGHT);
});

test('C12: «è» por «é» y al revés es un error solo de acento', () => {
  assert.deepEqual(tolerant('élève', 'élevé'), ACCENT_OK);
  assert.deepEqual(strict('élève', 'élevé'), ACCENT_BAD);
});

test('C13: los espacios junto al apóstrofo no cuentan', () => {
  for (const check of [tolerant, strict]) {
    assert.deepEqual(check("l' ami", "l'ami"), RIGHT);
    assert.deepEqual(check('l ’ami', "l'ami"), RIGHT);
  }
});

test('normalizeAnswer y foldAccents', () => {
  assert.equal(normalizeAnswer('  Bonjour, Marie, ça va ?'), 'bonjour marie ça va');
  assert.equal(normalizeAnswer('l’ami'), "l'ami");
  assert.equal(normalizeAnswer('« Oui » (dit-il)… ¿¡;:!'), 'oui dit-il');
  assert.equal(normalizeAnswer(undefined), '');
  assert.equal(foldAccents("l'œuf élève ça"), "l'oeuf eleve ca");
  assert.equal(foldAccents('Æ'), 'AE');
});
