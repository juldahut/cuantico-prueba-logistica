'use strict';

// Error del dominio con un codigo estable. Las capas externas lo traducen a
// HTTP (p. ej. EVENT_CONFLICT -> 409) sin depender del texto del mensaje.
class DomainError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
  }
}

module.exports = { DomainError };
