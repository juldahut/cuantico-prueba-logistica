'use strict';

const { DomainError } = require('./errors');

function assertCoordinate(point) {
  const valid =
    point &&
    Number.isFinite(point.lat) &&
    Number.isFinite(point.lon) &&
    Math.abs(point.lat) <= 90 &&
    Math.abs(point.lon) <= 180;

  if (!valid) {
    throw new DomainError('INVALID_COORDINATES', 'Coordenadas invalidas');
  }
}

const toRad = (deg) => (deg * Math.PI) / 180;

// Distancia de circulo maximo en metros enteros. Redondear a metros es
// precision de medicion, no de dinero: el dinero se redondea una sola vez.
function haversineMeters(a, b, radiusM) {
  assertCoordinate(a);
  assertCoordinate(b);

  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;

  return Math.round(2 * radiusM * Math.asin(Math.min(1, Math.sqrt(h))));
}

module.exports = { haversineMeters, assertCoordinate };
