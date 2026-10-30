# ADR 0002 — Stack y persistencia de la prueba

Estado: aceptado

## Contexto
El enunciado permite el backend en Node.js o Python (hay que justificarlo), exige React en el frontend y deja libre la
persistencia (memoria, SQLite o lo que se justifique).

## Decisión
- **Backend:** Node.js 24 + Express 5 + Sequelize 6, en JavaScript (CommonJS). Usa el mismo lenguaje que el frontend y es
  un stack que domino, lo que baja el riesgo en un plazo corto.
- **Persistencia:** PostgreSQL 18 con Docker Compose.
  - La restricción única sobre `event_id` hace segura la idempotencia bajo concurrencia: se inserta primero con
    `ON CONFLICT` y se compara el contenido.
  - `SELECT ... FOR UPDATE` bloquea por entrega.
  - Un trigger hace append-only la tabla de cálculos.
  - Es coherente con la ruta de escala del ADR 0001.
- **Dominio puro** en `backend/src/domain`: sin I/O ni dependencias externas. La zona horaria se resuelve con `Intl`, y el
  dinero con BigInt y enteros.
- **Autenticación:** JWT HS256 que solo lleva el id del usuario. El rol y el alcance por comercio se leen de la base en
  cada petición.
- **Frontend:** React 19 + Vite + Tailwind 4 (SPA), servido con nginx en Docker.
- **Agente:** tools deterministas y proveedor de LLM intercambiable. Por defecto es un modelo simulado (sin llave, tests
  deterministas); opcionalmente Anthropic, con el SDK oficial y la llave en una variable de entorno.
- **Pruebas:**
  - Backend: Jest + Supertest contra una base de test separada (`cuantico_test`); las migraciones se aplican en un
    `globalSetup`.
  - Frontend: Vitest + Testing Library.

## Alternativas descartadas
- **Python/FastAPI:** válido, pero separa el lenguaje del frontend sin dar ventaja para este alcance.
- **SQLite o memoria:** menos fricción para correrlo, pero no demuestran idempotencia ni bloqueo bajo concurrencia real.
- **TypeScript:** más seguridad de tipos, pero agrega tiempo de configuración en un plazo corto. Se compensa con validación
  estricta en los bordes y tests de los caminos críticos.

## Trade-offs
- Docker es prerrequisito para correr todo con un comando. Hay una ruta sin Docker con cualquier PostgreSQL vía
  `DATABASE_URL`.
- El JWT vive en memoria en el frontend: al recargar la página hay que volver a entrar.
