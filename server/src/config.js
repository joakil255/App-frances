const PROVIDERS = ['claude'];

// Lee y valida las variables y secretos de Cloudflare (todos llegan como texto)
export function readConfig(env) {
  const { AI_PROVIDER, AI_MODEL, AI_EFFORT, DAILY_LIMIT, LOOKUP_LIMIT, STORY_LIMIT, SENTENCE_LIMIT, TRANSLATE_LIMIT, ALLOWED_ORIGINS, ANTHROPIC_API_KEY, ACCESS_CODE } = env ?? {};
  const required = [AI_MODEL, AI_EFFORT, ALLOWED_ORIGINS, ANTHROPIC_API_KEY, ACCESS_CODE];
  if (!PROVIDERS.includes(AI_PROVIDER) || required.some((value) => typeof value !== 'string' || value === '')) {
    return { ok: false };
  }
  if (!/^[1-9]\d*$/.test(String(DAILY_LIMIT ?? '').trim())) return { ok: false };
  if (!/^[1-9]\d*$/.test(String(LOOKUP_LIMIT ?? '').trim())) return { ok: false };
  if (!/^[1-9]\d*$/.test(String(STORY_LIMIT ?? '').trim())) return { ok: false };
  if (!/^[1-9]\d*$/.test(String(SENTENCE_LIMIT ?? '').trim())) return { ok: false };
  if (!/^[1-9]\d*$/.test(String(TRANSLATE_LIMIT ?? '').trim())) return { ok: false };
  const allowedOrigins = ALLOWED_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean);
  return {
    ok: true,
    config: {
      provider: AI_PROVIDER,
      model: AI_MODEL,
      effort: AI_EFFORT,
      dailyLimit: Number(DAILY_LIMIT),
      lookupLimit: Number(LOOKUP_LIMIT),
      storyLimit: Number(STORY_LIMIT),
      sentenceLimit: Number(SENTENCE_LIMIT),
      translateLimit: Number(TRANSLATE_LIMIT),
      apiKey: ANTHROPIC_API_KEY,
      accessCode: ACCESS_CODE,
      allowedOrigins,
    },
  };
}
