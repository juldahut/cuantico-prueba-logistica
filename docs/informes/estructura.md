# Informe de estructura

## Arquitectura
```
navegador ──► frontend (React, nginx :5173) ──► API Express (:3001) ──► PostgreSQL 18
                                                   │
                                                   ├─ dominio puro (costo, periodos)
                                                   └─ agente ──► proveedor LLM (fake | Anthropic)
```
- **API monolítica** en capas: rutas → validadores → controladores → servicios → modelos (Sequelize).
- **Dominio puro** (`backend/src/domain`): funciones sin I/O que la ingesta, las consultas y el agente reutilizan.
- **Agente**: un bucle acotado que llama al proveedor del LLM. Las tools que este pide se ejecutan en el servidor con el
  usuario de la sesión.

## Módulos (backend/src)
| Carpeta | Responsabilidad |
| --- | --- |
| `domain/` | Costo (`cost`, `money`, `distance`, `localTime`, `events`, `rules`), periodos (`period`), errores del dominio. |
| `services/ingestion.service.js` | `POST /events`: inserta primero, bloquea por entrega, recalcula, guarda cálculos y anomalías. |
| `services/queries.service.js` | Totales por comercio, conteo por mensajero, auditoría de costo. |
| `services/search.service.js` | Búsqueda con LIKE escapado, límites y alcance. |
| `services/auth.service.js`, `scope.js` | Login JWT, carga del usuario y su alcance; filtros por comercio. |
| `agent/` | `agent.service` (bucle, límites, verificación de cifras), `tools` (7 tools de solo lectura), `providers/` (fake, gemini, anthropic). |
| `middlewares/` | Autenticación, roles, validación, rate limit, manejo de errores (500 sin detalles internos). |
| `migrations/`, `seeders/` | Esquema y datos de ejemplo (3 comercios en zonas distintas, 4 usuarios). |

Frontend (`frontend/src`): `features/auth` (login dividido con titular y nodos SVG), `features/chat` (chat, lateral
colapsable con comercio, zona horaria, rol y preguntas sugeridas, mensaje con insignia Verificado, resumen legible de
cifras sin verificar, cita de notas de terceros y panel "Datos consultados" estilo consola con JSON colapsable),
`components/ui` (kit base con la identidad visual de Cuantico: tokens en `index.css`, fuentes autoalojadas con
`@fontsource`, animaciones solo CSS con `prefers-reduced-motion`), `lib/api.js` (cliente HTTP con el formato de error
del backend), `lib/format.js` y `lib/summary.js` (presentación de lo que devuelven las tools; nada se recalcula).

## Modelo de datos
| Tabla | Propósito | Claves |
| --- | --- | --- |
| `merchants` | Comercio, zona IANA, notas (no confiables) | `name` único |
| `tariffs` | Tarifa por comercio con vigencia [desde, hasta) | CHECK montos ≥ 0 y rango válido |
| `couriers` | Mensajeros (globales) | |
| `deliveries` | Proyección: estado, mensajero, dirección, costo vigente | PK = id externo |
| `delivery_events` | Eventos tal como llegaron (normalizados a UTC) + hash | `event_id` único |
| `cost_calculations` | Historial de cálculos, append-only (trigger) | eventos usados, tarifa, reglas, hash de entradas |
| `anomalies` | Conflictos e inconsistencias visibles | `dedup_key` único, `resolved_at` |
| `users`, `user_merchants` | Usuarios con rol y alcance por comercio | `email` único, CHECK de rol |

Todas las fechas son `timestamptz` y la sesión de la base usa UTC. Los montos son enteros, en la unidad mínima de la moneda
de la tarifa.
