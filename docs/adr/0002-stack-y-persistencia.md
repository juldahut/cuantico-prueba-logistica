# ADR 0002 — Stack y persistencia de la prueba

Estado: aceptado

## Contexto
El enunciado permite backend en Node.js o Python (a justificar), exige React en el frontend y deja libre la persistencia (memoria, SQLite o lo que se justifique).

## Decisión
- Backend: Node.js 24 + Express 5 + Sequelize 6, en JavaScript. Un solo lenguaje con el frontend y dominio total del stack, lo que reduce el riesgo en un plazo corto.
- Persistencia: PostgreSQL 18 con Docker Compose. La restricción única sobre `event_id` da idempotencia segura bajo concurrencia (insertar primero y capturar el conflicto), y es coherente con la ruta de escala del ADR 0001.
- Frontend: React 19 + Vite (SPA).
- Agente: tools deterministas; el proveedor de LLM es intercambiable (modelo simulado por defecto, Anthropic opcional por variable de entorno).

## Alternativas descartadas
- Python/FastAPI: válido, pero separa el lenguaje del frontend sin ventaja para el alcance.
- SQLite o memoria: menos fricción para correrlo, pero no demuestran idempotencia bajo concurrencia real.

## Trade-offs
- Docker es prerrequisito para correr el proyecto; se documenta una ruta sin Docker con cualquier PostgreSQL vía `DATABASE_URL`.
- Sin TypeScript: se compensa con validación en los bordes y tests de los caminos críticos.
