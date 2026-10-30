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
| Buscador con SQL concatenado | SQL injection: con `texto = "x' OR 1=1 --"` la consulta sugerida devuelve o borra todo | `GET /search` usa el ORM con valores parametrizados, escapa `%`, `_` y la barra invertida para que se busquen literales, limita `q` a 100 caracteres y la respuesta a 20 filas, y filtra por los comercios del usuario. Tests con payloads de inyección. |
| Notas del comercio tal cual en el prompt | Prompt injection indirecta | Pendiente |
| Sin control de acceso | Cualquiera lee la facturación de todos los comercios (y el agente se vuelve un canal de fuga) | Login con JWT; el rol y los comercios del usuario se leen de la base en cada petición. Roles: `admin` (todo), `operaciones` (solo sus comercios: 403 en otro comercio, 404 en entregas ajenas) e `ingesta` (solo `POST /events`). |
| Credenciales y API key en el código | Filtración de secretos | Pendiente |

## Endpoints
| Método | Ruta | Rol |
| --- | --- | --- |
| POST | `/auth/login` | público (rate limit) |
| POST | `/events` | ingesta, admin |
| GET | `/merchants` | admin, operaciones |
| GET | `/merchants/:id/totals?from=YYYY-MM-DD&to=YYYY-MM-DD` | admin, operaciones (su comercio) |
| GET | `/couriers/:id/status-counts` | admin, operaciones (solo cuenta sus comercios) |
| GET | `/deliveries/:id/cost-audit` | admin, operaciones (su comercio) |
| GET | `/search?q=` | admin, operaciones (sus comercios) |
| GET | `/anomalies?code=&state=` (open, resolved o all) | admin, operaciones (sus comercios) |

Usuarios de ejemplo (seeds): `admin@cuantico.test`, `ops.la80@cuantico.test` (Tienda La 80), `ops.farmacia@cuantico.test` (Farmacia Central) e `ingesta@cuantico.test`. La clave es la de `DEMO_USERS_PASSWORD` en tu `.env`; no está en el código.

## Supuestos
Cálculo de costo (`backend/src/domain`, reglas `v1`):
- **Horario nocturno [20:00, 06:00)** en la zona del comercio: 20:00:00 ya es noche y 06:00:00 ya es día. El enunciado dice "8:00 p.m. a 6:00 a.m." sin fijar los bordes.
- El recargo nocturno lo decide **solo el instante del evento `entregada`** ("se completó"). Una recogida de noche con entrega de día cobra tarifa diurna.
- El 15 % se aplica sobre base + distancia.
- La distancia es Haversine entre las coordenadas de `recogida` y `entregada`, redondeada a metros (R = 6 371 000 m). El dinero se redondea una sola vez, half-up, al final.
- Los montos son enteros en la unidad mínima de la moneda de la tarifa (ver monedas más abajo).
- La entrega fallida cobra el 40 % de la base aunque no haya recogida.
- **Entregada sin recogida** queda `incomplete`, sin monto (nunca 0): falta información, no es gratis.
- Si llegan varios eventos del mismo tipo con ids distintos (p. ej. dos `recogida`), cuenta el último en orden de `occurredAt`; con el mismo instante desempata el `eventId` (orden lexicográfico). Es determinista, no una regla de negocio.
- En el dominio, dos copias de un evento con el mismo `eventId` se comparan por `deliveryId`, `type`, instante y `location`. La ingesta es más estricta: compara todos los campos aceptados (incluye `merchantId`, `courierId` y `address`).
- La hora local depende de la base de zonas horarias (tzdata) que trae Node; no forma parte de la versión de reglas.

Ingesta (`POST /events`):
- Cada evento trae `merchantId`: como los eventos llegan desordenados, la `entregada` puede llegar antes que la `creada` y no habría de dónde sacar el comercio.
- `occurredAt` debe traer zona (`Z` o `±hh:mm`); se guarda en UTC. Sin zona → 422, porque adivinarla cambiaría el recargo nocturno.
- Mismo `eventId` y mismo contenido → 200 sin efecto. Contenido distinto → 409 y anomalía `EVENT_CONFLICT` (una por `eventId`, para que reintentos con variantes no llenen la tabla); el evento original no cambia.
- Un evento de otro comercio para una entrega ya existente → 409 y anomalía `MERCHANT_MISMATCH`.
- Se usa la tarifa vigente en el instante del evento terminal (o del último evento si la entrega sigue en curso). Sin tarifa vigente → el evento se guarda y queda la anomalía `NO_TARIFF`.
- Una transición fuera de orden en el tiempo (p. ej. `en_ruta` después de `entregada`) no se rechaza: el evento ya ocurrió. Queda como anomalía `INVALID_TRANSITION`. Saltarse etapas (p. ej. `creada` → `entregada`) sí está permitido: el enunciado no exige registrar todos los estados.
- Los `eventId` y `deliveryId` son globales: los emite un único sistema de flota confiable, no cada comercio. Por eso la ingesta será un rol de servicio (fase 3), no un usuario de comercio.
- Totales por comercio: cuentan las entregas cuyo evento terminal cae en [desde, hasta) según la zona del comercio. Las que no tienen monto (incompletas o inconsistentes) cuentan, pero no suman.
- Monedas: cada tarifa define la suya (COP, MXN, CLP en los datos de ejemplo) y los montos están en su unidad mínima. No se suman montos de monedas distintas.
- **Supuesto abierto para negocio: entregada y fallida en la misma entrega.** El costo queda `inconsistent` (estado de la entrega `inconsistente`), sin monto, y la ingesta lo registra como anomalía visible; nunca se descarta. Negocio debe definir cuál prevalece.

## Fuera de alcance
Pendiente.

## Qué haría con una semana en lugar de unas horas
Pendiente.
