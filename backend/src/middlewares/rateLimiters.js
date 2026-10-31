'use strict';

const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');
const env = require('../config/env');

const noop = (req, res, next) => next();

// En tests los limitadores estan apagados (cada suite hace decenas de
// peticiones desde la misma IP). RATE_LIMIT_IN_TEST=true los enciende para
// probarlos; solo tiene efecto con NODE_ENV=test.
const disabled = process.env.NODE_ENV === 'test' && process.env.RATE_LIMIT_IN_TEST !== 'true';

function buildLimiter(options) {
  if (disabled) {
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

// Clave por cuenta autenticada; sin cuenta (no deberia pasar en las rutas que
// la usan: van despues de authenticate) cae a la IP. Por cuenta y no solo por
// IP: detras de un NAT o proxy muchas personas comparten IP, y un emisor con
// varias IPs no debe multiplicar su cupo.
function accountKey(req) {
  if (req.user?.id !== undefined && req.user?.id !== null) return `user:${req.user.id}`;
  // ipKeyGenerator agrupa las IPv6 por subred (si no, un cliente IPv6 rota de IP).
  return `ip:${ipKeyGenerator(req.ip || '')}`;
}

// Login: acotado para frenar fuerza bruta (aun no hay cuenta: va por IP).
const authLimiter = buildLimiter({ windowMs: 15 * 60 * 1000, limit: 10 });

// Agente conversacional: cada mensaje puede costar tokens del proveedor de LLM.
// Cupo por usuario (AGENT_RPM).
const agentLimiter = buildLimiter({
  windowMs: 60 * 1000,
  limit: env.agentRpm,
  keyGenerator: accountKey,
});

// Rutas de lectura (busqueda ILIKE, totales, auditoria): cada una usa una
// conexion del pool hasta statement_timeout, asi que un usuario valido no debe
// poder agotarlo. Cupo por cuenta (READ_RPM).
const readLimiter = buildLimiter({
  windowMs: 60 * 1000,
  limit: env.readRpm,
  keyGenerator: accountKey,
});

// Ingesta: margen amplio para el emisor, pero con techo frente a abuso. Cupo
// por cuenta autenticada (INGEST_RPM).
const ingestLimiter = buildLimiter({
  windowMs: 60 * 1000,
  limit: env.ingestRpm,
  keyGenerator: accountKey,
});

module.exports = { authLimiter, agentLimiter, ingestLimiter, readLimiter, accountKey };
