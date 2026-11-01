# Informe de estructura

## Arquitectura
```
navegador ──► frontend (React, nginx :5173) ──► API Express (:3001) ──► PostgreSQL 18
                                                   │
                                                   ├─ dominio puro (costo, periodos)
                                                   └─ agente ──► proveedor LLM (fake | Anthropic | Gemini)
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
| `agent/` | `agent.service` (bucle, límites, verificación de cifras, `list_merchants` preinyectado por el servidor), `tools` (7 tools de solo lectura), `providers/` (fake, gemini, anthropic). |
| `middlewares/` | Autenticación, roles, validación, rate limit (por cuenta en ingesta y agente), manejo de errores (500 sin detalles internos). |
| `config/` | Variables de entorno validadas (`env.js`, `parse.js`), conexión de `sequelize-cli` (`config.js`) y límites de pool y timeouts de la API (`dbRuntime.js`). |
| `migrations/`, `seeders/` | Esquema y datos de ejemplo (3 comercios en zonas distintas, 4 usuarios). |

Frontend (`frontend/src`): tema claro con la identidad de Cuantico (tokens en `index.css`, fuentes autoalojadas con
`@fontsource`, animaciones solo CSS que se detienen con `prefers-reduced-motion`). `features/auth`: login dividido; la
parte morada lleva una red de nodos animada (`NodesArt`), orbes de luz y un titular con degradado en movimiento.
`features/chat`: cabecera y franja de sesión/comercio fijas (sticky), pantalla de inicio que explica para qué sirve con
preguntas de ejemplo por tema, mensajes con insignia "Verificado" (o "Modo simulado" si el proveedor es `fake`), cita de
notas de terceros y, bajo cada respuesta, una línea discreta "Datos consultados" con "Ver detalle" opcional (se abre sola
cuando los datos son la respuesta: búsquedas o cifras sin verificar). Nada de JSON ni nombres internos de las tools en la
interfaz. `components/ui` (kit base), `lib/api.js` (cliente HTTP con el formato de error del backend), `lib/format.js` y
`lib/summary.js` (presentación de lo que devuelven las tools; nada se recalcula).

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
