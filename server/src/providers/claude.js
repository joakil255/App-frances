import Anthropic, {
  APIConnectionError,
  APIError,
  AuthenticationError,
  InternalServerError,
  PermissionDeniedError,
  RateLimitError,
} from '@anthropic-ai/sdk';
import { ProviderError } from '../errors.js';
import { OUTPUT_SCHEMA, buildSystemPrompt } from '../prompt.js';
import { normalizeOutput } from '../normalize.js';

const MAX_TOKENS = 4000;

// Traduce un error del SDK a un ProviderError (de lo más específico a lo más general)
function toProviderError(error) {
  if (error instanceof ProviderError) return error;
  if (error instanceof APIConnectionError) return new ProviderError('unavailable');
  if (error instanceof AuthenticationError || error instanceof PermissionDeniedError) return new ProviderError('auth');
  if (error instanceof RateLimitError) {
    return new ProviderError(error.errorCode === 'enforced_spend_limit_reached' ? 'quota' : 'rate_limit');
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

  async function chat({ level, history, message }) {
    const messages = [...history.map(({ role, content }) => ({ role, content })), { role: 'user', content: message }];
    let response;
    try {
      response = await client.messages.create({
        model,
        max_tokens: MAX_TOKENS,
        system: buildSystemPrompt(level),
        messages,
        output_config: { effort, format: { type: 'json_schema', schema: OUTPUT_SCHEMA } },
      });
    } catch (error) {
      throw toProviderError(error);
    }
    if (response.stop_reason === 'refusal') throw new ProviderError('refused');
    if (response.stop_reason === 'max_tokens') throw new ProviderError('bad_output');
    // Puede haber bloques thinking antes del texto
    const block = response.content.find((item) => item.type === 'text');
    if (!block) throw new ProviderError('bad_output');
    let raw;
    try {
      raw = JSON.parse(block.text);
    } catch {
      throw new ProviderError('bad_output');
    }
    return normalizeOutput(raw);
  }

  return { chat };
}
