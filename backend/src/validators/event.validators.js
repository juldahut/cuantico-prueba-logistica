'use strict';

const { body, query } = require('express-validator');
const { EVENT_TYPES } = require('../domain');

const ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
// Instante con zona explicita: Z o un offset +hh:mm / -hh:mm.
const ISO_WITH_ZONE =
  /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(\.\d{1,3})?(Z|([+-])(\d{2}):(\d{2}))$/;

// Rechaza fechas imposibles que Date normaliza en silencio (30 de febrero):
// la hora de pared reconstruida desde el instante debe coincidir con el texto.
function isInstantWithZone(value) {
  if (typeof value !== 'string') return false;
  const match = ISO_WITH_ZONE.exec(value);
  if (!match) return false;
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) return false;
  const offsetMin =
    match[3] === 'Z' ? 0 : (match[4] === '-' ? -1 : 1) * (Number(match[5]) * 60 + Number(match[6]));
  return new Date(ms + offsetMin * 60000).toISOString().slice(0, 19) === match[1];
}

function isCoordinate(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    typeof value.lat === 'number' &&
    typeof value.lon === 'number' &&
    Math.abs(value.lat) <= 90 &&
    Math.abs(value.lon) <= 180
  );
}

const eventBody = [
  body('eventId').isString().matches(ID_PATTERN).withMessage('eventId invalido.'),
  body('deliveryId').isString().matches(ID_PATTERN).withMessage('deliveryId invalido.'),
  body('merchantId').isInt({ min: 1 }).withMessage('merchantId debe ser un entero positivo.'),
  body('type').isIn(EVENT_TYPES).withMessage('type no es un estado valido.'),
  body('occurredAt')
    .custom(isInstantWithZone)
    .withMessage('occurredAt debe ser ISO 8601 con zona horaria (Z o +hh:mm).'),
  body('location')
    .custom((value, { req }) => {
      const required = req.body.type === 'recogida' || req.body.type === 'entregada';
      if (value === undefined) return !required;
      return isCoordinate(value);
    })
    .withMessage('location { lat, lon } es obligatoria en recogida y entregada.'),
  body('courierId').optional().isInt({ min: 1 }).withMessage('courierId invalido.'),
  body('address')
    .optional()
    .isString()
    .isLength({ max: 200 })
    .withMessage('address admite maximo 200 caracteres.'),
];

const anomaliesQuery = [
  query('code')
    .optional()
    .matches(/^[A-Z_]{1,32}$/)
    .withMessage('code invalido.'),
  query('state').optional().isIn(['open', 'resolved', 'all']).withMessage('state invalido.'),
];

module.exports = { eventBody, anomaliesQuery, isInstantWithZone };
