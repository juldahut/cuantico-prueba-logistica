'use strict';

const HttpError = require('../errors/HttpError');
const { DomainError } = require('../domain');

// Postgres: 55P03 lock_timeout (otra transaccion tiene la entrega) y 57014
// statement_timeout / consulta cancelada. Son transitorios: se responde 503 con
// Retry-After para que el emisor reintente (la ingesta es idempotente por
// eventId) en vez de tratarlo como un fallo permanente.
const BUSY_DB_CODES = new Set(['55P03', '57014']);

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let status = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  let code;

  if (err instanceof HttpError) {
    status = err.status;
    code = err.code;
  } else if (err instanceof DomainError) {
    status = 422;
    code = err.code;
  } else if (err.type === 'entity.parse.failed' || err.type === 'entity.too.large') {
    status = err.status;
  }

  let busy = false;
  if (!(err instanceof HttpError) && BUSY_DB_CODES.has(err.parent?.code || err.original?.code)) {
    status = 503;
    code = 'DB_BUSY';
    busy = true;
    res.set('Retry-After', '2');
  }

  if (status >= 500) {
    // Sin el mensaje ni los parametros: un error de BD puede traer datos del
    // cuerpo (direcciones, notas). Basta con el tipo, el codigo y la traza.
    const frames = (err.stack || '').split('\n').slice(1, 6).join('\n');
    console.error(`[${err.name}] ${err.parent?.code || err.code || ''}\n${frames}`);
  }

  const body = {
    error: {
      // Un 500 nunca expone el mensaje interno (SQL, rutas, stack).
      message: busy
        ? 'El servicio está ocupado. Reintenta en unos segundos.'
        : status >= 500 && !(err instanceof HttpError && err.expose)
          ? 'Error interno del servidor'
          : err.message,
      status,
    },
  };

  if (code) {
    body.error.code = code;
  }

  if (err.details) {
    body.error.details = err.details;
  }

  res.status(status).json(body);
}

module.exports = errorHandler;
