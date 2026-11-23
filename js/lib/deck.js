// Mazo A1 opcional: se descarga (o se lee de la caché sin conexión) y se pasa
// por la misma importación de la Etapa 2, que nunca cambia nada por sí sola.
import { readImport } from './transfer.js';

export const A1_DECK_URL = 'data/a1-deck.json';
export const A1_DECK_NAME = '100 palabras A1';
export const DECK_ERROR = 'No se pudo cargar el mazo. Conéctate a internet una vez y vuelve a intentarlo.';

// Devuelve lo mismo que readImport: { fatal, rows, ignoredColumns }
export async function loadDeck(fetchImpl, url = A1_DECK_URL) {
  let text;
  try {
    const response = await fetchImpl(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    text = await response.text();
  } catch {
    return { fatal: DECK_ERROR, rows: [], ignoredColumns: [] };
  }
  return readImport(text, 'a1-deck.json');
}
