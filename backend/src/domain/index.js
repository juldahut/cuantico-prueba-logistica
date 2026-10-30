'use strict';

// Dominio puro: sin I/O, sin base de datos, sin red. Solo importa modulos de
// esta carpeta.
const { DomainError } = require('./errors');
const { RULES, getRules } = require('./rules');
const { roundHalfUp } = require('./money');
const { haversineMeters } = require('./distance');
const { localHour, isNight } = require('./localTime');
const { EVENT_TYPES, normalizeEvents } = require('./events');
const { calculateDeliveryCost } = require('./cost');
const {
  localDateRangeToUtc,
  localToday,
  resolveRelativePeriod,
  PERIOD_EXPRESSIONS,
} = require('./period');

module.exports = {
  DomainError,
  RULES,
  getRules,
  roundHalfUp,
  haversineMeters,
  localHour,
  isNight,
  EVENT_TYPES,
  normalizeEvents,
  calculateDeliveryCost,
  localDateRangeToUtc,
  localToday,
  resolveRelativePeriod,
  PERIOD_EXPRESSIONS,
};
