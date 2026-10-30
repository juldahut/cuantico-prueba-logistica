# Cuántico · Prueba técnica — servicio de eventos de entrega

> Estado: en construcción. Este README se actualiza en cada PR que cambia el comportamiento.

## Resumen
Servicio que recibe eventos del ciclo de vida de entregas, calcula el costo por comercio de forma determinista e idempotente,
expone consultas agregadas y un agente conversacional de solo lectura (el LLM orquesta, el código calcula y autoriza).

## Cómo levantarlo
Pendiente (se completa en la fase de ingesta). Requisitos: Docker Desktop.

## Cómo probarlo
Pendiente.

## Decisiones de arquitectura y por qué
Ver `docs/adr/`. Resumen en esta sección al cerrar el proyecto.

## Requisitos de operaciones: qué pidieron, qué hice y por qué
| Pedido | Riesgo | Qué hice |
| --- | --- | --- |
| Buscador con SQL concatenado | SQL injection | Pendiente |
| Notas del comercio tal cual en el prompt | Prompt injection indirecta | Pendiente |
| Sin control de acceso | Fuga entre comercios | Pendiente |
| Credenciales y API key en el código | Filtración de secretos | Pendiente |

## Supuestos
Pendiente.

## Fuera de alcance
Pendiente.

## Qué haría con una semana en lugar de unas horas
Pendiente.
