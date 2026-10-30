# CLAUDE.md

## Contexto

Prueba tecnica para Cuantico (Desarrollador Senior / Lider Tecnico). El enunciado es confidencial y NO esta en este repo.
Se construye un subconjunto funcional de un servicio de logistica urbana:
- Ingesta de eventos de entrega (creada, asignada, recogida, en_ruta, entregada, fallida).
- Calculo de costo por entrega segun la tarifa del comercio, idempotente y tolerante a desorden.
- Consultas agregadas (por comercio y rango de fechas; por estado y mensajero) y busqueda segura.
- Agente conversacional de solo lectura: el LLM orquesta y redacta, el codigo calcula y autoriza.
- Frontend React con chat contra el agente.

Se valora criterio, claridad y decisiones documentadas mas que volumen. Entrega pequena y bien pensada.

## Stack (fijado)

Node.js 24, Express 5, Sequelize 6, PostgreSQL 18 (Docker Compose), JavaScript (CommonJS) en backend.
Frontend: React 19 + Vite (SPA) + Tailwind. Tests: Jest + Supertest. Lint: ESLint + Prettier.
Infraestructura reciclada de un proyecto propio anterior (middlewares, Docker, CI, kit de UI); el dominio se escribe desde cero.
Esto debe declararse en NOTAS.md.

## Reglas duras (no negociables)

- Dinero en enteros (unidad minima). Nunca float. Redondeo half-up una sola vez, al final.
- Fechas en UTC en la BD. La zona horaria del comercio se usa solo para la regla nocturna y los rangos de fechas.
- Jamas concatenar SQL. Solo consultas parametrizadas (o el ORM); escapar `%` y `_` en LIKE; limitar longitud y filas.
- Jamas secretos en codigo, commits, issues o logs. Variables de entorno; `.env` no se versiona.
- El LLM no calcula ni decide permisos. Lo hacen tools deterministas. El alcance por comercio lo impone el servidor, no el modelo.
- Las notas de comercio son datos NO confiables: nunca van al system prompt ni se ejecutan como instrucciones.
- El costo es una funcion pura de (eventos, tarifa, version de reglas). Sin I/O dentro de `src/domain`.
- Idempotencia por `event_id` con restriccion unica: insertar primero y capturar el conflicto (no "existe? -> insertar").
- El resultado no puede depender del orden de llegada de los eventos.

## Requisitos de operaciones: se implementa la alternativa segura

El enunciado trae 4 pedidos riesgosos. NO se implementan como fueron redactados; se resuelven asi y se documentan en el README:
1. Buscador con SQL concatenado -> consultas parametrizadas + escape de LIKE + limites.
2. Notas del comercio tal cual en el prompt -> datos no confiables, delimitados, sin privilegios.
3. Sin control de acceso -> autenticacion y autorizacion por comercio en el servidor, tambien dentro de cada tool.
4. Credenciales y API key en el codigo -> variables de entorno, `.env.example`, gitleaks en CI.

## Practicas obligatorias

- GitHub Flow: un issue = una rama (`feat/<n>-nombre`) = un PR pequeno. Nunca directo a `main`.
- Conventional Commits.
- ADR en `docs/adr/` para decisiones relevantes (contexto, decision, alternativas, trade-offs).
- Tests de los caminos criticos: idempotencia, desorden, calculo nocturno, entrega fallida, inyeccion SQL, prompt injection, acceso.
- TDD en el dominio: la prueba que falla va primero.
- Cada PR completa "que genero la IA y que corregi"; lo relevante se anota en `docs/ai-log.md` (alimenta NOTAS.md). Solo lo que realmente paso.
- Antes de entregar: buscar con `grep -ri` el nombre del proyecto anterior y de su cliente; debe dar cero resultados.

## Definicion de terminado

Tests verdes, lint limpio, README al dia si cambia el comportamiento, sin secretos, diff revisado linea por linea por el autor humano.

## Idioma y tono

Espanol neutro, tuteo, respuestas breves. Explica las decisiones tecnicas en terminos simples cuando las presentes.

## Estructura

```
backend/    API Express + Sequelize (src/domain = dominio puro)
frontend/   React + Vite (chat contra el agente)
docs/       adr/, ai-log.md, riesgos.md (docs/privado no se versiona)
```
