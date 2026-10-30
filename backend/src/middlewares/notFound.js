'use strict';

function notFound(req, res, next) {
  res.status(404);
  next(new Error(`Ruta no encontrada: ${req.method} ${req.originalUrl}`));
}

module.exports = notFound;
