'use strict';

const { execSync } = require('child_process');

// Deja la base de test con el esquema al dia antes de correr la suite. Si no
// hay base (p. ej. solo se corren los tests del dominio), avisa y sigue: los
// tests que la necesitan fallaran con su propio error.
module.exports = async () => {
  try {
    execSync('npx sequelize-cli db:migrate', {
      env: { ...process.env, NODE_ENV: 'test' },
      stdio: 'ignore',
    });
  } catch {
    console.warn('globalSetup: no se pudieron aplicar las migraciones en la base de test.');
  }
};
