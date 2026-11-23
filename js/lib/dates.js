// Fechas de calendario «AAAA-MM-DD» para el repaso.
// Se calculan con Date.UTC para que el horario de verano no las mueva.

const DAY_MS = 24 * 60 * 60 * 1000;
const pad = (n) => String(n).padStart(2, '0');

// Fecha local del dispositivo: el día cambia a medianoche en su zona horaria
export function localDate(now) {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function toUtc(date) {
  const [year, month, day] = date.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

export function addDays(date, days) {
  const d = new Date(toUtc(date) + days * DAY_MS);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

// Días de «from» a «to» (negativo si «to» es anterior)
export function daysBetween(from, to) {
  return Math.round((toUtc(to) - toUtc(from)) / DAY_MS);
}
