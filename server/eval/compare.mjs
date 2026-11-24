import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createClaudeAdapter } from '../src/providers/claude.js';
import { scoreCase } from './score.js';

const MODEL = 'claude-haiku-5-5';
const EFFORT = 'low';
const LEVEL = 'A1.2';

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

const cases = JSON.parse(readFileSync(new URL('./a1-sentences.json', import.meta.url), 'utf8'));
const adapter = createClaudeAdapter({ apiKey, model: MODEL, effort: EFFORT, maxRetries: 2, timeout: 30000 });

console.log(`Modelo ${MODEL}, esfuerzo ${EFFORT}, nivel ${LEVEL}.`);
console.log('El costo no se calcula aquí: míralo en la consola de Anthropic.\n');

const started = Date.now();
let calls = 0;
let foundCount = 0;
let inventedCount = 0;
let failed = 0;

for (const item of cases) {
  calls += 1;
  try {
    const { corrections } = await adapter.chat({ level: LEVEL, history: [], message: item.sentence });
    const { found, invented } = scoreCase(item, corrections);
    if (found) foundCount += 1;
    if (invented) inventedCount += 1;
    const shown = item.expected === null ? '(correcta)' : `¿encontró? ${found ? 'sí' : 'NO'}`;
    console.log(`#${item.id} ${item.sentence}`);
    console.log(`   ${shown} | ¿inventó? ${invented ? 'SÍ' : 'no'}`);
    for (const c of corrections) console.log(`   - ${c.original} -> ${c.corrected}: ${c.explanation}`);
  } catch (error) {
    failed += 1;
    console.log(`#${item.id} ${item.sentence}\n   ERROR: ${error.code ?? 'desconocido'}`);
  }
}

const withError = cases.filter((item) => item.expected !== null).length;
const correct = cases.length - withError;
console.log(`\nEncontró ${foundCount} de ${withError} errores; inventó ${inventedCount} de ${correct} frases correctas; fallaron ${failed}.`);
console.log(`Llamadas: ${calls}. Tiempo: ${((Date.now() - started) / 1000).toFixed(1)} s.`);
if (failed > 0) process.exit(1);
