'use strict';

const { body } = require('express-validator');

const MAX_MESSAGE = 1000;
const MAX_HISTORY = 10;

const isMessage = (v, max) => typeof v === 'string' && v.trim().length > 0 && v.length <= max;

// El historial solo admite turnos de texto de usuario y asistente: el cliente
// no puede inyectar mensajes de sistema ni resultados de tools.
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
            h &&
            typeof h === 'object' &&
            (h.role === 'user' || h.role === 'assistant') &&
            isMessage(h.content, 2000),
        ),
    )
    .withMessage(`history: hasta ${MAX_HISTORY} turnos { role: user|assistant, content }.`),
];

module.exports = { chatBody };
