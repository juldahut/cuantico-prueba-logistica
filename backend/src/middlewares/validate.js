'use strict';

const { validationResult } = require('express-validator');

// status: 400 por defecto; 422 cuando el cuerpo es JSON valido pero no cumple
// las reglas del recurso (p. ej. un evento sin zona horaria).
function validate(validations, { status = 400 } = {}) {
  return async (req, res, next) => {
    await Promise.all(validations.map((validation) => validation.run(req)));

    const result = validationResult(req);

    if (result.isEmpty()) {
      return next();
    }

    res.status(status);
    const err = new Error('Datos invalidos.');
    err.details = result.array().map((item) => ({
      field: item.path,
      message: item.msg,
    }));

    return next(err);
  };
}

module.exports = validate;
