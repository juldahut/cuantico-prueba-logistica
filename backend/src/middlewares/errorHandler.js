'use strict';

const HttpError = require('../errors/HttpError');
const { DomainError } = require('../domain');

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

  if (status >= 500) {
    console.error(err);
  }

  const body = {
    error: {
      // Un 500 nunca expone el mensaje interno (SQL, rutas, stack).
      message: status >= 500 ? 'Error interno del servidor' : err.message,
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
