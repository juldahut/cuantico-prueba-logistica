# ADR 0001 — Escalado a 50 comercios / 10.000 eventos por segundo y auditoría del cálculo

Estado: aceptado como ruta de evolución (la prueba implementa la base en PostgreSQL)

## Contexto
Hoy: 5 comercios, cientos de eventos, una API con PostgreSQL. Objetivo: 50 comercios y 10.000 eventos/s en pico,
consultas en tiempo casi real y trazabilidad de cómo se calculó cada costo. El costo es una función pura de
(eventos, tarifa, zona horaria, versión de reglas) y no depende del orden de llegada.

## Opciones
- **A. Monolito + PostgreSQL, cálculo síncrono por evento** (lo que hay hoy). Simple y fuerte en consistencia, pero cada
  evento toma un bloqueo y recalcula dentro de la petición: en picos la ingesta se vuelve el cuello de botella.
- **B. Ingesta desacoplada:** API ligera → log de eventos particionado (Kafka/Kinesis) → consumidores idempotentes que
  proyectan y calculan → modelo de lectura para agregados. Absorbe picos, permite reprocesar y escala por partición. A
  cambio, más piezas y consistencia eventual.
- **C. Cola administrada sin particiones** (SQS estándar). Operación mínima, pero sin orden por clave ni reproceso
  histórico, y con una auditoría más débil.

## Decisión
Opción B.
- **Ingesta:** la API valida, escribe en el log y responde 202. Clave de partición: `delivery_id`, así todos los eventos
  de una entrega los procesa un mismo consumidor, sin bloqueos distribuidos.
- **Entrega y orden:** la entrega es at-least-once y la idempotencia vive en el consumidor (`event_id` único, como hoy).
  Como el cálculo no depende del orden, no hace falta orden global.
- **Lectura:** agregados por comercio/día/estado en un almacén de lectura que se alimenta de las proyecciones.

## Auditoría y trazabilidad
- El log de eventos es inmutable y se archiva en almacenamiento de objetos.
- Cada cálculo es una fila nueva, nunca se sobrescribe. Guarda los eventos usados, la tarifa y la versión de reglas, el
  desglose, el hash de entradas y la marca de tiempo. **Ya implementado:** `cost_calculations` es append-only por trigger
  y se consulta en `GET /deliveries/:id/cost-audit`.
- Un cambio de reglas genera un recálculo con versión nueva. Ambos resultados quedan consultables, y un auditor reproduce
  el mismo número con la función pura y las mismas entradas (el hash lo comprueba).

## Trade-offs que se asumen
- Consistencia eventual: un costo puede tardar segundos en reflejarse (el SLO lo define negocio).
- Más complejidad operativa y más costo de infraestructura que el monolito.
- Los comercios muy activos pueden cargar más algunas particiones; se mitiga subparticionando por `delivery_id`.
- Guardar cada cálculo aumenta el volumen; se mitiga con retención por niveles (caliente / frío).
