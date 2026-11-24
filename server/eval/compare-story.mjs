import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createClaudeAdapter } from '../src/providers/claude.js';
import { scoreStory, meetsCriterion } from './score-story.js';

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

const cases = JSON.parse(readFileSync(new URL('./story-cases.json', import.meta.url), 'utf8'));
const adapter = createClaudeAdapter({ apiKey, model: MODEL, effort: EFFORT, maxRetries: 2, timeout: 60000 });

console.log(`Modelo ${MODEL}, esfuerzo ${EFFORT}.`);
console.log('El costo no se calcula aquí: míralo en la consola de Anthropic.\n');

const scores = [];
let rejected = 0;

for (const item of cases) {
  console.log(`#${item.id} nivel ${item.level} | tema: ${item.topic} | preguntas en: ${item.quizLang}`);
  try {
    const output = await adapter.story(item);
    const score = scoreStory(output);
    scores.push(score);
    console.log(`\n${output.title}\n\n${output.body}\n`);
    output.questions.forEach((q, index) => {
      console.log(`   ${index + 1}. ${q.question}`);
      q.options.forEach((option, i) => console.log(`      ${i === q.answer ? '*' : ' '} ${i}. ${option}`));
      console.log(`      explicación: ${q.explanation}`);
      console.log(`      evidencia: ${q.evidence}`);
    });
    console.log(`   comprobaciones: ${JSON.stringify(score)}\n`);
  } catch (error) {
    rejected += 1;
    console.log(`   ERROR: ${error.code ?? 'desconocido'}\n`);
  }
}

const passed = meetsCriterion(scores, rejected);
console.log(`Rechazadas o con error: ${rejected}.`);
console.log(`Criterio (las ${cases.length} pasan las cuatro comprobaciones, cero rechazos): ${passed ? 'SE CUMPLE' : 'NO se cumple'}.`);
console.log('Revisa a mano el francés, las preguntas y las evidencias antes de publicar.');
if (!passed) process.exit(1);
