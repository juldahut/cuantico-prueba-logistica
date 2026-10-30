# ADR 0001 — Escalado a 50 comercios / 10.000 eventos por segundo y auditoría del cálculo

Estado: propuesto

## Contexto
Hoy: 5 comercios, cientos de eventos, API única con PostgreSQL. Objetivo: 50 comercios y 10.000 eventos/s en pico, consultas en tiempo casi real
y trazabilidad de cómo se calculó cada costo. El costo es una función pura de (eventos, tarifa, versión de reglas) y no depende del orden de llegada.

## Opciones
- A. Monolito + PostgreSQL con proyección y cálculo síncronos en la petición. Simple, pero la escritura síncrona y el recálculo por evento bloquean la ingesta en picos.
- B. Ingesta desacoplada: API ligera → log de eventos particionado → consumidores idempotentes que proyectan y calculan → modelo de lectura para agregados. Absorbe picos, permite reprocesar y escala por partición; más piezas y consistencia eventual.
- C. Cola administrada sin particiones. Operación mínima, pero sin orden ni reproceso histórico y con auditoría más débil.

## Decisión
Opción B. Clave de partición: `delivery_id`. Entrega at-least-once; la idempotencia vive en el consumidor (`event_id` único). Como el cálculo no depende del orden, no se exige orden global.
Agregados por comercio/día/estado en un almacén de lectura. La API responde 202 tras persistir en el log.

## Auditoría y trazabilidad
- El log de eventos es inmutable y se archiva en almacenamiento de objetos.
- Cada cálculo se guarda como fila nueva, nunca se sobrescribe: eventos usados, tarifa y versión, versión de reglas, desglose por componente, hash de entradas y marca de tiempo.
- Un cambio de reglas genera un recálculo versionado; ambos resultados quedan consultables y un auditor reproduce el mismo número.

## Trade-offs que se asumen
- Consistencia eventual: un costo puede tardar segundos en reflejarse (el SLO lo define el negocio).
- Mayor complejidad operativa y costo de infraestructura.
- Comercios muy activos pueden sesgar particiones; se mitiga con sub-particionado.
- Guardar cada cálculo aumenta el volumen; se mitiga con retención por niveles.
