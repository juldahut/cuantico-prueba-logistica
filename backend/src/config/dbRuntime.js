'use strict';

require('dotenv').config({ quiet: true });

const { intFromEnv } = require('./parse');

// Pool y timeouts de la conexion a PostgreSQL para el runtime de la API (y los
// tests). Viven aqui y NO en config.js a proposito: config.js tambien lo lee
// sequelize-cli, y una migracion o un seeder legitimo puede tardar mas que
// estos limites.
//
// - statement_timeout: corta una consulta que se queda colgada.
// - lock_timeout: no espera indefinidamente un lock de otra transaccion.
// - idle_in_transaction_session_timeout: libera una transaccion abierta que
//   quedo sin uso (si no, retiene locks y una conexion del pool).
function runtimeOptions(baseConfig) {
  return {
    ...baseConfig,
    pool: {
      max: intFromEnv('DB_POOL_MAX', { defaultValue: 10 }),
      // Si no hay conexion libre en 10 s, falla la peticion en vez de
      // encolarla sin limite.
      acquire: 10000,
    },
    dialectOptions: {
      ...baseConfig.dialectOptions,
      statement_timeout: intFromEnv('DB_STATEMENT_TIMEOUT_MS', { defaultValue: 15000 }),
      lock_timeout: intFromEnv('DB_LOCK_TIMEOUT_MS', { defaultValue: 5000 }),
      idle_in_transaction_session_timeout: intFromEnv('DB_IDLE_IN_TX_TIMEOUT_MS', {
        defaultValue: 15000,
      }),
    },
  };
}

module.exports = { runtimeOptions };
