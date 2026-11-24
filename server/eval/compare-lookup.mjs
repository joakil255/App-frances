import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createClaudeAdapter } from '../src/providers/claude.js';
import { scoreLookup, meetsCriterion } from './score-lookup.js';

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

const cases = JSON.parse(readFileSync(new URL('./lookup-cases.json', import.meta.url), 'utf8'));
const adapter = createClaudeAdapter({ apiKey, model: MODEL, effort: EFFORT, maxRetries: 2, timeout: 30000 });

console.log(`Modelo ${MODEL}, esfuerzo ${EFFORT}.`);
console.log('El costo no se calcula aquí: míralo en la consola de Anthropic.\n');

const rows = [];
let rejected = 0;

for (const item of cases) {
  console.log(`#${item.id} ${item.word} | ${item.sentence}`);
  try {
    const output = await adapter.lookup({ lang: 'fr', word: item.word, sentence: item.sentence });
    const { lemmaOk, posOk } = scoreLookup(item, output);
    rows.push({ id: item.id, ok: lemmaOk && posOk });
    console.log(`   forma base: ${output.baseWithArticle} (esperada: ${item.lemma}) ${lemmaOk ? 'ok' : 'NO'}`);
    console.log(`   tipo: ${output.partOfSpeech} (esperado: ${item.partOfSpeech}) ${posOk ? 'ok' : 'NO'}`);
    console.log(`   en contexto: ${output.contextTranslation} | ${output.sentenceTranslation}`);
  } catch (error) {
    rejected += 1;
    rows.push({ id: item.id, ok: false });
    console.log(`   ERROR: ${error.code ?? 'desconocido'}`);
  }
}

const okCount = rows.filter((row) => row.ok).length;
const originalOk = rows.filter((row) => row.id <= 10 && row.ok).length;
const passed = meetsCriterion(rows, rejected);
console.log(`\nForma base y tipo correctos: ${okCount} de ${cases.length}. Rechazadas o con error: ${rejected}.`);
console.log(`Casos originales (1 a 10) correctos: ${originalOk} de 10.`);
console.log(`Criterio (al menos 9 de los 10 originales y cero rechazos en los ${cases.length}): ${passed ? 'SE CUMPLE' : 'NO se cumple'}.`);
console.log('Revisa a mano las traducciones en contexto antes de publicar.');
if (!passed) process.exit(1);
