'use strict';

const { DomainError } = require('./errors');

// Solo instantes UTC explicitos: un offset o una fecha sin zona se normaliza
// antes, en el borde (ingesta), no aqui.
const UTC_ISO = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(\.\d{1,3})?Z$/;

// Cache por nombre canonico IANA: queda acotada por el numero de zonas que
// existen, aunque lleguen variantes de mayusculas.
const formatters = new Map();

function buildFormatter(timeZone) {
  return new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', hourCycle: 'h23' });
}

function hourFormatter(timeZone) {
  if (typeof timeZone !== 'string' || timeZone === '' || timeZone.length > 64) {
    throw new DomainError('INVALID_TIMEZONE', 'Zona horaria invalida');
  }
  const cached = formatters.get(timeZone);
  if (cached) return cached;

  let formatter;
  try {
    formatter = buildFormatter(timeZone);
  } catch {
    throw new DomainError('INVALID_TIMEZONE', 'Zona horaria invalida');
  }
  const canonical = formatter.resolvedOptions().timeZone;
  if (canonical === timeZone) formatters.set(timeZone, formatter);
  return formatter;
}

// Rechaza fechas imposibles que Date normaliza en silencio (30 de febrero,
// 24:00:00): el texto debe coincidir con su propia ida y vuelta.
function isUtcInstant(value) {
  if (typeof value !== 'string') return false;
  const match = UTC_ISO.exec(value);
  if (!match) return false;
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) return false;
  return new Date(ms).toISOString().slice(0, 19) === match[1];
}

function assertTimeZone(timeZone) {
  hourFormatter(timeZone);
}

function localHour(instantUtc, timeZone) {
  if (!isUtcInstant(instantUtc)) {
    throw new DomainError('INVALID_INSTANT', 'Se esperaba un instante ISO 8601 en UTC (con Z)');
  }
  const parts = hourFormatter(timeZone).formatToParts(new Date(instantUtc));
  return Number(parts.find((p) => p.type === 'hour').value);
}

function isNight(instantUtc, timeZone, rules) {
  const hour = localHour(instantUtc, timeZone);
  return hour >= rules.nightStartHour || hour < rules.nightEndHour;
}

module.exports = { localHour, isNight, isUtcInstant, assertTimeZone };
