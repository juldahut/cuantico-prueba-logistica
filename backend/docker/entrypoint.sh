#!/bin/sh
# Arranque del contenedor del backend.
# - Las migraciones corren siempre.
# - Los datos y usuarios de demo SOLO con SEED_DEMO=true (exacto). Sin esa
#   variable el contenedor no siembra nada: un despliegue real no debe crear
#   cuentas conocidas. El docker-compose del repo es de demo y la activa.
set -e

npx sequelize-cli db:migrate

if [ "$SEED_DEMO" = "true" ]; then
  echo "SEED_DEMO=true: aplicando datos de demo."
  npx sequelize-cli db:seed:all
else
  echo "SEED_DEMO no es 'true': se omiten los datos de demo."
fi

# exec: node pasa a ser el proceso principal y recibe las senales de Docker.
exec node src/server.js
