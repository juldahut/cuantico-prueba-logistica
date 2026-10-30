'use strict';

const { param } = require('express-validator');

function idParam(name = 'id') {
  return [param(name).isInt().withMessage(`${name} debe ser un numero entero.`)];
}

module.exports = { idParam };
