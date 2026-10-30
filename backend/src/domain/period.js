'use strict';

const { DomainError } = require('./errors');
const { assertTimeZone } = require('./localTime');

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_DAYS = 366;

function invalid(message) {
  return new DomainError('INVALID_PERIOD', message);
}

// Fecha de calendario YYYY-MM-DD como milisegundos de su medianoche "UTC".
function parseDate(value) {
  const match = typeof value === 'string' ? DATE.exec(value) : null;
  if (!match) throw invalid('Las fechas deben tener el formato YYYY-MM-DD');
  const ms = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (new Date(ms).toISOString().slice(0, 10) !== value) throw invalid('Fecha inexistente');
  return ms;
}

// Diferencia entre la hora de pared de la zona y UTC en un instante dado.
function offsetMs(utcMs, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(utcMs));
  const get = (type) => Number(parts.find((p) => p.type === type).value);
  const wall = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour'),
    get('minute'),
    get('second'),
  );
  return wall - Math.floor(utcMs / 1000) * 1000;
}

// Primer instante UTC del dia local. Se prueban los offsets vigentes medio dia
// antes y despues (cubre cualquier cambio de horario cerca de la medianoche) y
// se queda el menor instante cuya hora local ya es de ese dia. Asi, si la
// medianoche no existe (Santiago salta de 00:00 a 01:00), el dia empieza a la
// 01:00; y si se repite, cuenta la primera vez.
function localMidnightToUtc(wallMs, timeZone) {
  const halfDay = DAY_MS / 2;
  const candidates = [
    wallMs - offsetMs(wallMs - halfDay, timeZone),
    wallMs - offsetMs(wallMs + halfDay, timeZone),
  ];
  const valid = candidates.filter((utc) => utc + offsetMs(utc, timeZone) >= wallMs);
  return Math.min(...valid);
}

// Rango [desde, hasta) en fechas locales del comercio, convertido a UTC para
// filtrar la base de datos.
function localDateRangeToUtc(from, to, timeZone) {
  assertTimeZone(timeZone);
  const fromMs = parseDate(from);
  const toMs = parseDate(to);
  if (toMs <= fromMs) throw invalid('"hasta" debe ser posterior a "desde"');
  if (toMs - fromMs > MAX_DAYS * DAY_MS) throw invalid(`El rango maximo es de ${MAX_DAYS} dias`);

  return {
    fromUtc: new Date(localMidnightToUtc(fromMs, timeZone)).toISOString(),
    toUtc: new Date(localMidnightToUtc(toMs, timeZone)).toISOString(),
  };
}

module.exports = { localDateRangeToUtc };
