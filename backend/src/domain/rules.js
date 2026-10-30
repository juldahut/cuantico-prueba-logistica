'use strict';

const { DomainError } = require('./errors');

// Versiones de reglas de costo. Una version publicada no se edita: un cambio
// de reglas es una version nueva, para poder reproducir calculos antiguos.
// Porcentajes en puntos basicos (1500 = 15 %) para no usar decimales.
const RULES = Object.freeze({
  v1: Object.freeze({
    nightSurchargeBp: 1500,
    failedBp: 4000,
    // Horario nocturno [20:00, 06:00) en hora local del comercio.
    nightStartHour: 20,
    nightEndHour: 6,
    earthRadiusM: 6371000,
  }),
});

function getRules(version) {
  if (!Object.hasOwn(RULES, version)) {
    throw new DomainError('UNKNOWN_RULES_VERSION', `Version de reglas desconocida: ${version}`);
  }
  return RULES[version];
}

module.exports = { RULES, getRules };
