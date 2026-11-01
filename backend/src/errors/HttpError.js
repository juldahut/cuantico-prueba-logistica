'use strict';

// Error con estado HTTP y codigo estable pensados para el cliente. Solo estos
// errores exponen su codigo; cualquier otro se responde como 500 generico.
// `expose` permite mostrar el mensaje de un 5xx cuando esta escrito a mano y es
// seguro (p. ej. el proveedor de IA no esta disponible); por defecto un 5xx
// nunca muestra su mensaje.
class HttpError extends Error {
  constructor(status, code, message, { expose = false } = {}) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    this.expose = expose;
  }
}

module.exports = HttpError;
