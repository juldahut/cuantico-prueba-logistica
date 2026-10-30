require('dotenv').config();

const base = {
  dialect: 'postgres',
  // sequelize-cli no trackea seeders por defecto (a diferencia de las
  // migraciones): sin esto, "db:seed:all" vuelve a intentar correr un
  // seeder ya aplicado y revienta por una restriccion unica -- lo que
  // rompe un arranque repetido del contenedor (ver docker-compose.yml,
  // servicio backend, y ADR 0016).
  seederStorage: 'sequelize',
};

module.exports = {
  development: { ...base, use_env_variable: 'DATABASE_URL' },
  // Base separada de la de development/produccion: evita que correr
  // "npm test" en local ensucie la base que usa docker compose (ver
  // ADR 0016). El CI usa esta misma variable, apuntando a su propio
  // Postgres efimero (ver .github/workflows/ci.yml).
  test: { ...base, use_env_variable: 'TEST_DATABASE_URL' },
  production: { ...base, use_env_variable: 'DATABASE_URL' },
};
