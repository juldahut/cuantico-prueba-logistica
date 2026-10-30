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
Cálculo de costo (`backend/src/domain`, reglas `v1`):
- **Horario nocturno [20:00, 06:00)** en la zona del comercio: 20:00:00 ya es noche y 06:00:00 ya es día. El enunciado dice "8:00 p.m. a 6:00 a.m." sin fijar los bordes.
- El recargo nocturno lo decide **solo el instante del evento `entregada`** ("se completó"). Una recogida de noche con entrega de día cobra tarifa diurna.
- El 15 % se aplica sobre base + distancia.
- La distancia es Haversine entre las coordenadas de `recogida` y `entregada`, redondeada a metros (R = 6 371 000 m). El dinero se redondea una sola vez, half-up, al final.
- Moneda COP; los montos son enteros en pesos (unidad mínima).
- La entrega fallida cobra el 40 % de la base aunque no haya recogida.
- **Entregada sin recogida** queda `incomplete`, sin monto (nunca 0): falta información, no es gratis.
- Si llegan varios eventos del mismo tipo con ids distintos (p. ej. dos `recogida`), cuenta el último en orden de `occurredAt`; con el mismo instante desempata el `eventId` (orden lexicográfico). Es determinista, no una regla de negocio.
- Dos copias de un evento con el mismo `eventId` se comparan por sus campos (`deliveryId`, `type`, instante, `location`); campos extra se ignoran. Si difieren, es conflicto.
- La hora local depende de la base de zonas horarias (tzdata) que trae Node; no forma parte de la versión de reglas.
- **Supuesto abierto para negocio: entregada y fallida en la misma entrega.** Se marca `inconsistent`, sin monto, y la ingesta lo registra como anomalía visible; nunca se descarta. Negocio debe definir cuál prevalece.

## Fuera de alcance
Pendiente.

## Qué haría con una semana en lugar de unas horas
Pendiente.
