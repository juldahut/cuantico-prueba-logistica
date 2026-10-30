'use strict';

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;

  if (status >= 500) {
    console.error(err);
  }

  const body = {
    error: {
      message: err.message || 'Error interno del servidor',
      status,
    },
  };

  if (err.details) {
    body.error.details = err.details;
  }

  res.status(status).json(body);
}

module.exports = errorHandler;
