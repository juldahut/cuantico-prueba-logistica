// Formatos de presentacion. Nunca recalculan nada: solo dan forma legible a lo
// que ya devolvieron las tools.

const number = new Intl.NumberFormat('es-CO');

// Montos en la unidad minima de la moneda, igual que el texto de la respuesta.
export function formatAmount(amount, currency) {
  if (!Number.isFinite(amount)) return '—';
  return `${number.format(amount)}${currency ? ` ${currency}` : ''}`;
}

// "2026-10-19" -> "19 de octubre de 2026" (sin convertir zonas horarias).
export function formatDay(iso) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso ?? ''));
  if (!match) return String(iso ?? '—');
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return date.toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

// "del 19 al 25 de octubre de 2026" (o con los dos meses si cruza de mes o año).
export function formatRange(from, lastDay) {
  const a = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(from ?? ''));
  const b = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(lastDay ?? ''));
  if (!a || !b) return `del ${formatDay(from)} al ${formatDay(lastDay)}`;
  if (a[1] === b[1] && a[2] === b[2]) return `del ${Number(a[3])} al ${formatDay(lastDay)}`;
  return `del ${formatDay(from)} al ${formatDay(lastDay)}`;
}

export function formatInstant(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return `${date.toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' })} UTC`;
}

const STATUS = {
  creada: 'Creada',
  asignada: 'Asignada',
  recogida: 'Recogida',
  en_ruta: 'En ruta',
  entregada: 'Entregada',
  fallida: 'Fallida',
};

export function formatStatus(status) {
  return STATUS[status] ?? String(status ?? '—').replaceAll('_', ' ');
}
