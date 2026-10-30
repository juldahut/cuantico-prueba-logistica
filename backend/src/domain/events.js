'use strict';

const { DomainError } = require('./errors');
const { isUtcInstant } = require('./localTime');
const { assertCoordinate } = require('./distance');

// Orden del ciclo de vida. Solo desempata eventos con el mismo instante.
const EVENT_TYPES = Object.freeze([
  'creada',
  'asignada',
  'recogida',
  'en_ruta',
  'entregada',
  'fallida',
]);
const RANK = new Map(EVENT_TYPES.map((type, i) => [type, i]));
const TYPES_WITH_LOCATION = new Set(['recogida', 'entregada']);

function invalid(message) {
  return new DomainError('INVALID_EVENT', message);
}

function assertEvent(event) {
  if (!event || typeof event !== 'object') throw invalid('Evento invalido');
  if (typeof event.eventId !== 'string' || event.eventId === '') throw invalid('eventId invalido');
  if (typeof event.deliveryId !== 'string' || event.deliveryId === '') {
    throw invalid(`deliveryId invalido en ${event.eventId}`);
  }
  if (!RANK.has(event.type)) throw invalid(`Tipo de evento desconocido en ${event.eventId}`);
  if (!isUtcInstant(event.occurredAt)) {
    throw invalid(`occurredAt debe ser ISO 8601 en UTC (con Z) en ${event.eventId}`);
  }
  if (TYPES_WITH_LOCATION.has(event.type)) {
    try {
      assertCoordinate(event.location);
    } catch {
      throw invalid(`${event.type} requiere location { lat, lon } valida en ${event.eventId}`);
    }
  }
}

// Serializacion con llaves ordenadas: dos copias del mismo evento comparan
// igual aunque sus propiedades lleguen en otro orden.
function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function compareEvents(a, b) {
  const byTime = Date.parse(a.occurredAt) - Date.parse(b.occurredAt);
  if (byTime !== 0) return byTime;
  const byRank = RANK.get(a.type) - RANK.get(b.type);
  if (byRank !== 0) return byRank;
  if (a.eventId === b.eventId) return 0;
  return a.eventId < b.eventId ? -1 : 1;
}

// Deduplica por eventId y ordena de forma total. El resultado no depende del
// orden de llegada. No muta la entrada.
function normalizeEvents(events) {
  if (!Array.isArray(events)) throw invalid('events debe ser un arreglo');

  const byId = new Map();
  for (const event of events) {
    assertEvent(event);
    const seen = byId.get(event.eventId);
    if (!seen) {
      byId.set(event.eventId, { event, key: canonical(event) });
    } else if (seen.key !== canonical(event)) {
      throw new DomainError(
        'EVENT_CONFLICT',
        `El evento ${event.eventId} llego con contenido distinto`,
      );
    }
  }

  const unique = [...byId.values()].map((entry) => entry.event);
  const deliveryIds = new Set(unique.map((e) => e.deliveryId));
  if (deliveryIds.size > 1) {
    throw new DomainError('MIXED_DELIVERIES', 'Los eventos pertenecen a entregas distintas');
  }

  return unique.sort(compareEvents);
}

module.exports = { EVENT_TYPES, normalizeEvents };
