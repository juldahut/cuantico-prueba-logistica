# Informe de desarrollo

## Fases
Cada fase siguió GitHub Flow: issue con criterios de aceptación → rama → tests primero → implementación → revisión con dos
subagentes (`revisor-seguridad`, `auditor-reglas`) → corrección de hallazgos → PR con plantilla → fusión con CI en verde.

| Fase | PR | Resultado |
| --- | --- | --- |
| F0 Higiene | #12 | Limpieza, `logging: false` en tests, finales de línea LF, permisos de gitleaks en CI. |
| F1 Dominio | #13 | Función pura de costo: reglas v1, BigInt, Haversine, nocturno en zona del comercio, deduplicación y orden total. |
| F2 Ingesta | #14 | Migraciones, `POST /events` idempotente, recálculo con bloqueo por entrega, anomalías, seeds. |
| F3 Acceso y consultas | #15 | JWT con alcance por comercio, totales, conteo por mensajero, auditoría, búsqueda segura. |
| F4 Agente | #16 | Tools deterministas, proveedores fake y Anthropic, límites, verificación de cifras. |
| F5 Frontend | #17 | Chat en React con estados de carga, error y vacío; panel de datos consultados; Docker y CI. |
| F6 Entrega | este | Documentación, dependencias, verificación en clon limpio. |

## Decisiones
Las decisiones de arquitectura están en `docs/adr/` y los supuestos de negocio en el README. Ajustes durante el desarrollo
(detalle en `docs/bitacora.md`):
- **Transiciones fuera de orden:** se registran como anomalía en vez de rechazarse. Con eventos desordenados, rechazar
  haría depender el resultado del orden de llegada.
- **Periodos en el servidor:** el modelo pasa una expresión (`semana_pasada`, `rango`) y el servidor calcula las fechas;
  así ningún cálculo de fechas queda en el LLM.
- **Historial del chat:** solo lleva preguntas del usuario, porque los turnos de asistente que envía el cliente no son
  confiables.

## Pruebas
- **Backend: 160 tests (Jest).**
  - Dominio, sin base de datos: costo, dinero, distancia, hora local, periodos.
  - Integración contra PostgreSQL: ingesta, acceso, consultas, búsqueda, agente.
- **Frontend: 7 tests (Vitest + Testing Library).**
- **Caminos críticos cubiertos:**
  - Idempotencia: ×3 y 10 envíos en paralelo; mismo id con contenido distinto.
  - Desorden: 720 permutaciones.
  - Nocturno: 20:00 y 06:00 exactos, otra zona y horario de verano.
  - Entrega fallida.
  - Inyección SQL y comodines.
  - Prompt injection, con un modelo guionizado que obedece la nota hostil.
  - Acceso: 403 y 404 entre comercios.
- **CI:** lint y tests de backend y frontend, build, `npm audit --audit-level=high` y gitleaks sobre todo el historial.
