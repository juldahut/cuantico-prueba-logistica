'use strict';

const { DomainError } = require('./errors');
const { getRules } = require('./rules');
const { roundHalfUp } = require('./money');
const { haversineMeters } = require('./distance');
const { isNight, assertTimeZone } = require('./localTime');
const { normalizeEvents } = require('./events');

const BP = 10000n; // 100 % en puntos basicos
const M_PER_KM = 1000n;

function isAmount(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

function assertTariff(tariff) {
  const valid =
    tariff &&
    isAmount(tariff.baseAmount) &&
    isAmount(tariff.perKmAmount) &&
    typeof tariff.currency === 'string' &&
    /^[A-Z]{3}$/.test(tariff.currency);

  if (!valid) {
    throw new DomainError(
      'INVALID_TARIFF',
      'La tarifa requiere baseAmount y perKmAmount enteros no negativos y currency ISO 4217',
    );
  }
}

// Si hay varios eventos del mismo tipo con ids distintos, cuenta el ultimo en
// el orden normalizado (determinista).
function lastOfType(events, type) {
  return events.findLast((e) => e.type === type);
}

// Costo de una entrega como funcion pura de (eventos, tarifa, zona horaria del
// comercio, version de reglas). Dinero en enteros; un solo redondeo half-up.
function calculateDeliveryCost({ events, tariff, timeZone, rulesVersion = 'v1' }) {
  const rules = getRules(rulesVersion);
  assertTariff(tariff);
  assertTimeZone(timeZone);
  const ordered = normalizeEvents(events);

  const result = {
    status: 'incomplete',
    amount: null,
    currency: tariff.currency,
    rulesVersion,
    breakdown: null,
    distanceMeters: null,
    isNight: null,
    eventIdsUsed: ordered.map((e) => e.eventId).sort(),
    reason: null,
  };

  const delivered = lastOfType(ordered, 'entregada');
  const failed = lastOfType(ordered, 'fallida');

  if (delivered && failed) {
    return { ...result, status: 'inconsistent', reason: 'BOTH_TERMINAL' };
  }

  if (failed) {
    const amount = roundHalfUp(BigInt(tariff.baseAmount) * BigInt(rules.failedBp), BP);
    return {
      ...result,
      status: 'failed',
      amount,
      breakdown: { base: amount, distance: 0, nightSurcharge: 0 },
    };
  }

  if (!delivered) return { ...result, reason: 'NOT_FINISHED' };

  const pickup = lastOfType(ordered, 'recogida');
  if (!pickup) return { ...result, reason: 'MISSING_PICKUP' };

  const meters = haversineMeters(pickup.location, delivered.location, rules.earthRadiusM);
  const night = isNight(delivered.occurredAt, timeZone, rules);

  // Subtotal exacto en milesimas de la unidad minima (perKm / 1000 m).
  const base = BigInt(tariff.baseAmount);
  const distanceMilli = BigInt(meters) * BigInt(tariff.perKmAmount);
  const subtotalMilli = base * M_PER_KM + distanceMilli;
  const factorBp = night ? BP + BigInt(rules.nightSurchargeBp) : BP;

  const amount = roundHalfUp(subtotalMilli * factorBp, M_PER_KM * BP);
  const distance = roundHalfUp(distanceMilli, M_PER_KM);

  return {
    ...result,
    status: 'calculated',
    amount,
    // El recargo se deriva para que el desglose sume exactamente el total.
    breakdown: {
      base: tariff.baseAmount,
      distance,
      nightSurcharge: amount - tariff.baseAmount - distance,
    },
    distanceMeters: meters,
    isNight: night,
  };
}

module.exports = { calculateDeliveryCost };
