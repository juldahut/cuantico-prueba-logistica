'use strict';

const rateLimit = require('express-rate-limit');

const noop = (req, res, next) => next();

function buildLimiter(options) {
  if (process.env.NODE_ENV === 'test') {
    return noop;
  }

  return rateLimit({
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: { message: 'Demasiadas peticiones. Intenta de nuevo mas tarde.', status: 429 },
    },
    ...options,
  });
}

// Login: acotado para frenar fuerza bruta.
const authLimiter = buildLimiter({ windowMs: 15 * 60 * 1000, limit: 10 });

// Agente conversacional: cada mensaje puede costar tokens del proveedor de LLM.
const agentLimiter = buildLimiter({ windowMs: 60 * 1000, limit: 20 });

module.exports = { authLimiter, agentLimiter };
