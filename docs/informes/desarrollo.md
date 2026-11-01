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
- **Backend: más de 250 tests (Jest);** `npm test` imprime la cifra exacta.
  - Dominio, sin base de datos: costo, dinero, distancia, hora local, periodos.
  - Integración contra PostgreSQL: ingesta, acceso, consultas, búsqueda, agente.
- **Frontend: más de 30 tests (Vitest + Testing Library).**
- **Caminos críticos cubiertos:**
  - Idempotencia: ×3 y 10 envíos en paralelo; mismo id con contenido distinto.
  - Desorden: 720 permutaciones.
  - Nocturno: 20:00 y 06:00 exactos, otra zona y horario de verano.
  - Entrega fallida.
  - Inyección SQL y comodines.
  - Prompt injection, con un modelo guionizado que obedece la nota hostil.
  - Acceso: 403 y 404 entre comercios.
- **CI:** lint y tests de backend y frontend, build, `npm audit --audit-level=high` y gitleaks sobre todo el historial.

## Verificación final en clon limpio (2026-10-30)
Clon desde GitHub en una carpeta temporal, con un `.env` creado a partir de `.env.example` con valores aleatorios, y un
proyecto de Compose aparte en puertos alternos:
- **Arranque:** `docker compose up --build` levantó la base, el backend (3 migraciones y 2 seeders) y el frontend.
  Al reiniciar el backend, los seeders no se repiten.
- **Prueba de humo contra la API:**
  - `/health` 200 y login de 3 usuarios; la clave de otro usuario da 401.
  - Alcance: operaciones ve un solo comercio y recibe 403 en otro.
  - Búsqueda: `%` y `' OR 1=1 --` no devuelven nada.
  - Anomalías visibles, `POST /events` con rol de operaciones da 403 y un evento duplicado da 200.
  - Agente con el modelo simulado: totales verificados, notas mostradas como dato y otro comercio no encontrado.
  - Frontend 200 con CSP.
- **Tests y lint:** en esa fecha, backend 160 tests, lint y Prettier en verde, y frontend 7 tests, lint y build en verde (cifras de ese día; el conteo actual lo da `npm test`).
- **Seguridad:** `npm audit --audit-level=high` sin hallazgos en backend ni frontend, y gitleaks v8.24.3 sobre los 14
  commits del historial sin fugas.
