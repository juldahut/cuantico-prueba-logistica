'use strict';

// Error con estado HTTP y codigo estable pensados para el cliente. Solo estos
// errores exponen su codigo; cualquier otro se responde como 500 generico.
class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
  }
}

module.exports = HttpError;
