'use strict';

const { sequelize } = require('../src/models');

// Helpers de prueba compartidos. Se ampliaran con las fabricas de comercios,
// tarifas y eventos en las fases de dominio e ingesta.
module.exports = { sequelize };
