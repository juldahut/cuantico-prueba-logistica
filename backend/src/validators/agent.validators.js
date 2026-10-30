'use strict';

const { body } = require('express-validator');

const MAX_MESSAGE = 1000;
const MAX_HISTORY = 10;

const isMessage = (v, max) => typeof v === 'string' && v.trim().length > 0 && v.length <= max;

// El historial solo admite preguntas anteriores del usuario. El cliente no
// puede enviar turnos de asistente (podria inventarlos), de sistema ni
// resultados de tools.
const chatBody = [
  body('message')
    .custom((v) => isMessage(v, MAX_MESSAGE))
    .withMessage(`message debe tener entre 1 y ${MAX_MESSAGE} caracteres.`),
  body('history')
    .optional()
    .custom(
      (v) =>
        Array.isArray(v) &&
        v.length <= MAX_HISTORY &&
        v.every(
          (h) =>
            h && typeof h === 'object' && h.role === 'user' && isMessage(h.content, MAX_MESSAGE),
        ),
    )
    .withMessage(`history: hasta ${MAX_HISTORY} preguntas anteriores { role: user, content }.`),
];

module.exports = { chatBody };
