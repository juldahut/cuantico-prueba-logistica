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

// Una entrega real tiene pocos eventos; el tope evita trabajo sin limite.
const MAX_EVENTS = 200;
const ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

function invalid(message) {
  return new DomainError('INVALID_EVENT', message);
}

// Los mensajes no repiten valores de entrada: pueden ser largos o traer
// saltos de linea que ensucien los logs.
function assertEvent(event) {
  if (!event || typeof event !== 'object') throw invalid('Evento invalido');
  if (typeof event.eventId !== 'string' || !ID_PATTERN.test(event.eventId)) {
    throw invalid('eventId invalido');
  }
  if (typeof event.deliveryId !== 'string' || !ID_PATTERN.test(event.deliveryId)) {
    throw invalid('deliveryId invalido');
  }
  if (!RANK.has(event.type)) throw invalid('Tipo de evento desconocido');
  if (!isUtcInstant(event.occurredAt)) {
    throw invalid('occurredAt debe ser ISO 8601 en UTC (con Z)');
  }
  if (TYPES_WITH_LOCATION.has(event.type) || event.location !== undefined) {
    try {
      assertCoordinate(event.location);
    } catch {
      throw invalid('location { lat, lon } invalida o ausente');
    }
  }
}

// Huella de los campos que definen un evento (lista blanca). El instante se
// compara como milisegundos: "19:00:00Z" y "19:00:00.000Z" son el mismo.
// Campos extra no forman parte del evento y se ignoran.
function fingerprint(event) {
  const location = event.location ? [event.location.lat, event.location.lon] : null;
  return JSON.stringify([
    event.eventId,
    event.deliveryId,
    event.type,
    Date.parse(event.occurredAt),
    location,
  ]);
}

function compareEvents(a, b) {
  const byTime = Date.parse(a.occurredAt) - Date.parse(b.occurredAt);
  if (byTime !== 0) return byTime;
  const byRank = RANK.get(a.type) - RANK.get(b.type);
  if (byRank !== 0) return byRank;
  if (a.eventId === b.eventId) return 0;
  return a.eventId < b.eventId ? -1 : 1;
}

// Deduplica por eventId y ordena de forma total por (instante, etapa,
// eventId). El resultado no depende del orden de llegada. No muta la entrada.
function normalizeEvents(events) {
  if (!Array.isArray(events)) throw invalid('events debe ser un arreglo');
  if (events.length > MAX_EVENTS) throw invalid(`Maximo ${MAX_EVENTS} eventos por entrega`);

  const byId = new Map();
  for (const event of events) {
    assertEvent(event);
    const seen = byId.get(event.eventId);
    if (!seen) {
      byId.set(event.eventId, { event, key: fingerprint(event) });
    } else if (seen.key !== fingerprint(event)) {
      throw new DomainError('EVENT_CONFLICT', 'Un eventId llego con contenido distinto');
    }
  }

  const unique = [...byId.values()].map((entry) => entry.event);
  const deliveryIds = new Set(unique.map((e) => e.deliveryId));
  if (deliveryIds.size > 1) {
    throw new DomainError('MIXED_DELIVERIES', 'Los eventos pertenecen a entregas distintas');
  }

  return unique.sort(compareEvents);
}

module.exports = { EVENT_TYPES, MAX_EVENTS, normalizeEvents };
