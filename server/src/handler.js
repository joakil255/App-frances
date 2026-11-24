import { readConfig } from './config.js';
import { ProviderError } from './errors.js';
import { PROVIDERS } from './providers/index.js';
import { safeEqual } from './access.js';
import { validateChatInput } from './validate.js';
import { reserveMessage } from './limit.js';

function jsonResponse(status, body, corsHeaders) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...corsHeaders },
  });
}

// Cabeceras CORS solo para un origen permitido
function corsFor(origin) {
  return { 'access-control-allow-origin': origin, vary: 'Origin' };
}

function bearerCode(request) {
  const header = request.headers.get('authorization') ?? '';
  return header.startsWith('Bearer ') ? header.slice('Bearer '.length) : null;
}

export async function handleRequest(request, env, { providers = PROVIDERS, now = () => new Date() } = {}) {
  const origin = request.headers.get('origin');

  // 1) Origen: se revisa primero, con la lista cruda (aún sin validar la configuración)
  const allowedOrigins = String(env?.ALLOWED_ORIGINS ?? '').split(',').map((item) => item.trim());
  if (origin === null || origin === '' || !allowedOrigins.includes(origin)) {
    return jsonResponse(403, { error: 'forbidden_origin' }, {});
  }
  const cors = corsFor(origin);

  // 2) Ruta y método
  const { pathname } = new URL(request.url);
  if (pathname !== '/chat' || (request.method !== 'POST' && request.method !== 'OPTIONS')) {
    return jsonResponse(404, { error: 'not_found' }, cors);
  }
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        ...cors,
        'access-control-allow-methods': 'POST',
        'access-control-allow-headers': 'authorization, content-type',
        'access-control-max-age': '86400',
      },
    });
  }

  // 3) Configuración y código de acceso
  const configResult = readConfig(env);
  if (!configResult.ok) return jsonResponse(500, { error: 'config' }, cors);
  const { config } = configResult;
  const code = bearerCode(request);
  if (code === null || !safeEqual(code, config.accessCode)) {
    return jsonResponse(401, { error: 'unauthorized' }, cors);
  }

  // 4) Validación
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse(400, { error: 'invalid_input' }, cors);
  }
  const input = validateChatInput(body);
  if (!input.ok) return jsonResponse(400, { error: 'invalid_input' }, cors);

  // 5) Límite diario (cuenta antes de llamar al proveedor)
  const reservation = await reserveMessage(env.CHAT_KV, now(), config.dailyLimit);
  if (!reservation.ok) return jsonResponse(429, { error: 'daily_limit' }, cors);

  // 6) Proveedor
  try {
    const provider = providers[config.provider]({ apiKey: config.apiKey, model: config.model, effort: config.effort });
    const { reply, corrections } = await provider.chat(input.value);
    return jsonResponse(200, { reply, corrections, remaining: reservation.remaining }, cors);
  } catch (error) {
    if (error instanceof ProviderError) {
      return jsonResponse(error.code === 'config' ? 500 : 502, { error: error.code }, cors);
    }
    return jsonResponse(502, { error: 'unavailable' }, cors);
  }
}
