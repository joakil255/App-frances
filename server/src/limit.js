const TTL_SECONDS = 172800; // 2 días: el contador de un día ya no sirve después

// Fecha 'YYYY-MM-DD' en Santiago de Chile (incluye el cambio de horario)
export function chileDate(date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

// Cuenta el mensaje antes de llamar al proveedor; no escribe si se alcanzó el límite
export async function reserveMessage(kv, date, limit) {
  const key = `count:${chileDate(date)}`;
  const stored = Number.parseInt(await kv.get(key), 10);
  const count = Number.isInteger(stored) && stored > 0 ? stored : 0;
  if (count >= limit) return { ok: false };
  await kv.put(key, String(count + 1), { expirationTtl: TTL_SECONDS });
  return { ok: true, remaining: limit - (count + 1) };
}
