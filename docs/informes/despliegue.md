# Informe de despliegue

## Variables de entorno
| Variable | Dónde | Notas |
| --- | --- | --- |
| `DATABASE_URL` | backend | Cadena de PostgreSQL. En Compose se arma con `POSTGRES_*`. |
| `JWT_SECRET` | backend | Obligatoria, mínimo 32 caracteres. Rotarla invalida las sesiones activas. |
| `JWT_EXPIRES_IN` | backend | Por defecto `2h`. |
| `CORS_ORIGIN` | backend | Un solo origen: el del frontend. |
| `LLM_PROVIDER` | backend | `fake` (por defecto) o `anthropic`. |
| `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` | backend | Solo con `anthropic`. Modelo por defecto `claude-opus-5-5`. |
| `DEMO_*_PASSWORD` | backend (seeds) | Solo para datos de ejemplo; en producción no se corren esos seeds. |
| `VITE_API_URL` | frontend (build) | Se incrusta en el bundle al construir; también va en la CSP de `nginx.conf`. |

Los secretos van en el gestor de secretos de la plataforma, nunca en el repositorio ni en la imagen.

## Migraciones y datos de ejemplo
- `npx sequelize-cli db:migrate` antes de iniciar cada versión. Las migraciones tienen `down`.
- Los seeders quedan registrados (`seederStorage: sequelize`), así que `db:seed:all` no se repite al reiniciar.
- En producción: migraciones como paso previo del despliegue (job aparte), no dentro del arranque del contenedor, y sin
  seeds de ejemplo.

## Healthcheck
- `GET /health` responde 200 con `{status, db}` si la base contesta, o 503 si no. Sirve para readiness.
- PostgreSQL en Compose usa `pg_isready`.

## Rollback
- La imagen se versiona por tag (`v1.0.0`). Volver atrás es desplegar el tag anterior.
- Si la versión trae migraciones, se revierten con `db:migrate:undo` antes de bajar la versión. Para cambios
  destructivos de esquema conviene expand/contract en dos versiones.
- `cost_calculations` es append-only: un rollback no borra cálculos; los recálculos quedan como filas nuevas.

## Propuesta en la nube (sin despliegue real)
- **Backend:** contenedor en un servicio administrado (AWS ECS Fargate o Google Cloud Run), con dos o más réplicas detrás
  de un balanceador con TLS. Configurar `trust proxy` para que el rate limit vea la IP real.
- **Base de datos:** PostgreSQL administrado (RDS o Cloud SQL) con copias automáticas y acceso solo desde la red privada.
- **Frontend:** build estático en un bucket con CDN (S3 + CloudFront o Cloud Storage + CDN), con la CSP y el
  `connect-src` apuntando al dominio de la API.
- **Secretos:** Secrets Manager / Secret Manager, inyectados como variables de entorno.
- **CI/CD:** el pipeline actual (lint, tests, audit, gitleaks) más el build y push de imágenes, el job de migraciones y el
  despliegue por tag.
- **A escala (ADR 0001):** cola o log particionado para la ingesta y un almacén de lectura para los agregados.
