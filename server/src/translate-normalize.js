import { ProviderError } from './errors.js';
import { HAS_MARKUP } from './story-normalize.js';

const MAX_TRANSLATION = 600;

// Valida las traducciones de Claude: una por frase, texto plano; si algo no cumple lanza bad_output
export function normalizeTranslation(raw, count) {
  const bad = () => new ProviderError('bad_output');
  if (raw === null || typeof raw !== 'object' || !Array.isArray(raw.translations)) throw bad();
  const { translations } = raw;
  if (translations.length !== count) throw bad();
  for (const text of translations) {
    if (typeof text !== 'string' || text.trim() === '' || [...text].length > MAX_TRANSLATION || HAS_MARKUP.test(text)) throw bad();
  }
  return translations;
}
