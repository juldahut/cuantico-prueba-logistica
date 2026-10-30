'use strict';

const { body, param, query } = require('express-validator');

const ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const isText = (max) => (value) => typeof value === 'string' && value.length <= max;

const loginBody = [
  body('email')
    .custom((v) => isText(254)(v) && /^[^\s@]+@[^\s@]+$/.test(v))
    .withMessage('email invalido.'),
  body('password')
    .custom((v) => isText(200)(v) && v.length > 0)
    .withMessage('password invalido.'),
];

const merchantIdParam = [param('id').isInt({ min: 1 }).withMessage('id invalido.')];

const totalsQuery = [
  ...merchantIdParam,
  query('from')
    .custom((v) => typeof v === 'string' && DATE.test(v))
    .withMessage('from debe ser YYYY-MM-DD.'),
  query('to')
    .custom((v) => typeof v === 'string' && DATE.test(v))
    .withMessage('to debe ser YYYY-MM-DD.'),
];

const courierIdParam = [param('id').isInt({ min: 1 }).withMessage('id invalido.')];

const deliveryIdParam = [
  param('id')
    .custom((v) => typeof v === 'string' && ID_PATTERN.test(v))
    .withMessage('id invalido.'),
];

// Texto libre acotado: entre 1 y 100 caracteres, un solo valor.
const searchQuery = [
  query('q')
    .custom((v) => typeof v === 'string' && v.trim().length >= 1 && v.length <= 100)
    .withMessage('q debe tener entre 1 y 100 caracteres.'),
];

module.exports = { loginBody, totalsQuery, courierIdParam, deliveryIdParam, searchQuery };
