import Anthropic, {
  APIConnectionError,
  APIError,
  AuthenticationError,
  InternalServerError,
  PermissionDeniedError,
  RateLimitError,
} from '@anthropic-ai/sdk';
import { ProviderError } from '../errors.js';
import { LOOKUP_SCHEMA, OUTPUT_SCHEMA, STORY_SCHEMA, SENTENCE_SCHEMA, buildLookupPrompt, buildStoryPrompt, buildSentencePrompt, buildSystemPrompt } from '../prompt.js';
import { normalizeOutput } from '../normalize.js';
import { normalizeLookup } from '../lookup-normalize.js';
import { normalizeStory } from '../story-normalize.js';
import { normalizeSentence } from '../sentence-normalize.js';

const MAX_TOKENS = 4000;
const SPEND_LIMIT_CODES = ['enforced_spend_limit_reached', 'contract_spend_limit_reached'];

// Traduce un error del SDK a un ProviderError (de lo más específico a lo más general)
function toProviderError(error) {
  if (error instanceof ProviderError) return error;
  if (error instanceof APIConnectionError) return new ProviderError('unavailable');
  if (error instanceof AuthenticationError || error instanceof PermissionDeniedError) return new ProviderError('auth');
  if (error instanceof RateLimitError) {
    return new ProviderError(SPEND_LIMIT_CODES.includes(error.errorCode) ? 'quota' : 'rate_limit');
  }
  if (error instanceof InternalServerError) return new ProviderError('unavailable');
  if (error instanceof APIError) {
    if (error.status === 402) return new ProviderError('quota');
    if (error.status === 400 || error.status === 404) return new ProviderError('config');
    return new ProviderError('unavailable');
  }
  return new ProviderError('unavailable');
}

export function createClaudeAdapter({ apiKey, model, effort, fetch, maxRetries = 2, timeout = 30000 }) {
  const client = new Anthropic({ apiKey, fetch, maxRetries, timeout });

  // Llama a Claude con salida estructurada y devuelve el JSON ya leído
  async function requestJson({ system, messages, schema }) {
    let response;
    try {
      response = await client.messages.create({
        model,
        max_tokens: MAX_TOKENS,
        system,
        messages,
        output_config: { effort, format: { type: 'json_schema', schema } },
      });
    } catch (error) {
      throw toProviderError(error);
    }
    if (response.stop_reason === 'refusal') throw new ProviderError('refused');
    if (response.stop_reason === 'max_tokens') throw new ProviderError('bad_output');
    // Puede haber bloques thinking antes del texto
    const block = response.content.find((item) => item.type === 'text');
    if (!block) throw new ProviderError('bad_output');
    try {
      return JSON.parse(block.text);
    } catch {
      throw new ProviderError('bad_output');
    }
  }

  async function chat({ level, history, message }) {
    const messages = [...history.map(({ role, content }) => ({ role, content })), { role: 'user', content: message }];
    return normalizeOutput(await requestJson({ system: buildSystemPrompt(level), messages, schema: OUTPUT_SCHEMA }));
  }

  async function lookup({ word, sentence }) {
    const content = `Palabra: ${word}\nFrase: ${sentence}`;
    const raw = await requestJson({
      system: buildLookupPrompt(),
      messages: [{ role: 'user', content }],
      schema: LOOKUP_SCHEMA,
    });
    return normalizeLookup(raw);
  }

  async function story({ level, topic, quizLang }) {
    const content = topic ? `Tema: ${topic}` : 'Tema: libre';
    const raw = await requestJson({
      system: buildStoryPrompt(level, quizLang),
      messages: [{ role: 'user', content }],
      schema: STORY_SCHEMA,
    });
    return normalizeStory(raw);
  }

  async function sentence({ level, situation, focus, sentence: text }) {
    const content = `Situación: ${situation}\nPatrón de la lección: ${focus}\nFrase del alumno: ${text}`;
    const raw = await requestJson({
      system: buildSentencePrompt(level),
      messages: [{ role: 'user', content }],
      schema: SENTENCE_SCHEMA,
    });
    return normalizeSentence(raw, text);
  }

  return { chat, lookup, story, sentence };
}
