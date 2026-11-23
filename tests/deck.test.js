import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { A1_DECK_URL, A1_DECK_NAME, DECK_ERROR, loadDeck } from '../js/lib/deck.js';
import { readImport } from '../js/lib/transfer.js';

const deckText = readFileSync(new URL('../data/a1-deck.json', import.meta.url), 'utf8');
const failed = { fatal: DECK_ERROR, rows: [], ignoredColumns: [] };

test('constantes del mazo', () => {
  assert.equal(A1_DECK_URL, 'data/a1-deck.json');
  assert.equal(A1_DECK_NAME, '100 palabras A1');
  assert.equal(DECK_ERROR, 'No se pudo cargar el mazo. Conéctate a internet una vez y vuelve a intentarlo.');
});

test('sin red: devuelve el aviso y ninguna fila', async () => {
  const fetchImpl = async () => { throw new TypeError('Failed to fetch'); };
  assert.deepEqual(await loadDeck(fetchImpl), failed);
});

test('archivo no encontrado (404): devuelve el aviso', async () => {
  const fetchImpl = async () => ({ ok: false, status: 404, text: async () => '<h1>404</h1>' });
  assert.deepEqual(await loadDeck(fetchImpl), failed);
});

test('respuesta correcta: lo mismo que readImport y pide la dirección del mazo', async () => {
  const asked = [];
  const fetchImpl = async (url) => { asked.push(url); return { ok: true, status: 200, text: async () => deckText }; };
  const result = await loadDeck(fetchImpl);
  assert.deepEqual(asked, ['data/a1-deck.json']);
  assert.deepEqual(result, readImport(deckText, 'a1-deck.json'));
  assert.equal(result.rows.length, 100);
});
