-- Crea la base separada para los tests (NODE_ENV=test, ver src/config/config.js).
-- La imagen oficial de Postgres corre esto una sola vez, si el volumen esta vacio.
CREATE DATABASE cuantico_test OWNER cuantico;
