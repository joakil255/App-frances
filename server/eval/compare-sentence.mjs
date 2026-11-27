import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createClaudeAdapter } from '../src/providers/claude.js';
import { scoreSentence, meetsCriterion } from './score-sentence.js';

const MODEL = 'claude-haiku-5-5';
const EFFORT = 'low';
const LEVEL = 'A1';

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

const cases = JSON.parse(readFileSync(new URL('./sentence-cases.json', import.meta.url), 'utf8'));
const adapter = createClaudeAdapter({ apiKey, model: MODEL, effort: EFFORT, maxRetries: 2, timeout: 60000 });

console.log(`Modelo ${MODEL}, esfuerzo ${EFFORT}.`);
console.log('El costo no se calcula aquí: míralo en la consola de Anthropic.\n');

const scores = [];
let rejected = 0;

for (const [index, item] of cases.entries()) {
  console.log(`#${index + 1} [${item.expect}] ${item.situation} | ${item.focus}`);
  console.log(`   frase: ${item.sentence}`);
  try {
    const output = await adapter.sentence({ lang: 'fr', explainLang: 'es', level: LEVEL, ...item });
    const score = scoreSentence(item, output);
    scores.push(score);
    console.log(`   corregida: ${output.corrected}`);
    for (const error of output.errors) {
      console.log(`   - [${error.kind}] ${error.original} -> ${error.corrected}: ${error.explanation}`);
    }
    if (output.suggestion) console.log(`   sugerencia: ${output.suggestion}`);
    console.log(`   comprobaciones: ${JSON.stringify(score)}\n`);
  } catch (error) {
    rejected += 1;
    console.log(`   ERROR: ${error.code ?? 'desconocido'}\n`);
  }
}

const passed = meetsCriterion(scores, rejected);
console.log(`Rechazadas o con error: ${rejected}.`);
console.log(`Criterio (15 errores corregidos, 6 correctas sin error inventado, 2 de 3 sugerencias, cero rechazos): ${passed ? 'SE CUMPLE' : 'NO se cumple'}.`);
console.log('Revisa a mano las explicaciones y las sugerencias antes de publicar.');
if (!passed) process.exit(1);
