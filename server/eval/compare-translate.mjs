import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createClaudeAdapter } from '../src/providers/claude.js';
import { createUsageMeter, describeUsage } from './usage-meter.js';

const MODEL = 'claude-haiku-5-5';
const EFFORT = 'low';

// La clave viene de la variable de entorno o del archivo local; nunca se imprime
function readApiKey() {
  const fromEnv = process.env.ANTHROPIC_API_KEY?.trim();
  if (fromEnv) return fromEnv;
  try {
    return readFileSync(join(homedir(), '.config', 'app-frances', 'anthropic.key'), 'utf8').trim();
  } catch {
    return '';
  }
}

const apiKey = readApiKey();
if (!apiKey) {
  console.error('No encontré la clave de Anthropic. Define ANTHROPIC_API_KEY o guárdala en ~/.config/app-frances/anthropic.key.');
  process.exit(1);
}

const cases = JSON.parse(readFileSync(new URL('./translate-cases.json', import.meta.url), 'utf8'));
const meter = createUsageMeter();
const adapter = createClaudeAdapter({
  apiKey, model: MODEL, effort: EFFORT, maxRetries: 2, timeout: 60000, fetch: meter.fetch,
});
const segmenter = new Intl.Segmenter('fr', { granularity: 'sentence' });

console.log(`Modelo ${MODEL}, esfuerzo ${EFFORT}.\n`);

let failed = 0;
for (const item of cases) {
  const sentences = [...segmenter.segment(item.body)].map((part) => part.segment.trim()).filter(Boolean);
  console.log(`#${item.id} nivel ${item.level} | ${sentences.length} frases`);
  try {
    const translations = await adapter.translate({ level: item.level, supportLang: 'es', sentences });
    sentences.forEach((text, index) => console.log(`   ${text}\n   -> ${translations[index]}`));
    console.log(`   uso: ${describeUsage(meter.takeLast())}\n`);
  } catch (error) {
    failed += 1;
    console.log(`   ERROR: ${error.code ?? 'desconocido'}\n`);
  }
}

console.log(`Total: ${describeUsage(meter.total)}.`);
console.log('Revisa a mano las traducciones antes de publicar.');
if (failed > 0) process.exit(1);
