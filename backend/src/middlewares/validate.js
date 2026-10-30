'use strict';

const { validationResult } = require('express-validator');

function validate(validations) {
  return async (req, res, next) => {
    await Promise.all(validations.map((validation) => validation.run(req)));

    const result = validationResult(req);

    if (result.isEmpty()) {
      return next();
    }

    res.status(400);
    const err = new Error('Datos invalidos.');
    err.details = result.array().map((item) => ({
      field: item.path,
      message: item.msg,
    }));

    return next(err);
  };
}

module.exports = validate;
