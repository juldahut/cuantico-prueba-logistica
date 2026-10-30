'use strict';

const { DomainError } = require('./errors');

// Solo instantes UTC explicitos: un offset o una fecha sin zona se normaliza
// antes, en el borde (ingesta), no aqui.
const UTC_ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;

const formatters = new Map();

function hourFormatter(timeZone) {
  if (typeof timeZone !== 'string' || timeZone === '') {
    throw new DomainError('INVALID_TIMEZONE', 'Zona horaria invalida');
  }
  if (!formatters.has(timeZone)) {
    try {
      formatters.set(
        timeZone,
        new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', hourCycle: 'h23' }),
      );
    } catch {
      throw new DomainError('INVALID_TIMEZONE', `Zona horaria invalida: ${timeZone}`);
    }
  }
  return formatters.get(timeZone);
}

function isUtcInstant(value) {
  return typeof value === 'string' && UTC_ISO.test(value) && !Number.isNaN(Date.parse(value));
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
