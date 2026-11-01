# Auditoría de la prueba técnica: checklist de cobertura

Fecha: 2026-10-31. Revisión de solo lectura hecha con seis auditores independientes (reglas de negocio, ingesta y consultas, agente y frontend, entregables y documentación, seguridad, optimización) contra el enunciado y las reglas del proyecto. La evidencia detallada (archivo y línea) está en el resultado de cada auditor; aquí va el resumen accionable. Lo que dice "Falta" o "Riesgo" no es un defecto probado: es lo que un revisor podría señalar.

## Estado tras el cierre (issue 31)

Foto de lo que realmente quedó en el código y en la documentación al cerrar #31. Las tablas de más abajo son la auditoría original (antes del cierre) y no se reescribieron. **Cerrado:** corregido y probado o documentado en su sitio. **Documentado como límite:** no se implementó a propósito y está escrito en el README, un ADR o `docs/mejoras.md`. **Pendiente:** ni corregido ni anotado como mejora; sigue siendo un hallazgo abierto.

Al cerrar: backend 263 tests en 15 suites, frontend 33 tests, todos en verde.

| Hallazgo | Estado |
| --- | --- |
| Modo simulado confundible con un LLM real (riesgo alto de usabilidad): ahora hay insignia en cada respuesta y aviso bajo la cabecera cuando el proveedor es `fake` | Cerrado |
| Login sin pista de usuarios de demo: ahora indica los tres correos y que las claves están en `.env` (sin ninguna clave) | Cerrado |
| El 429 del proveedor ofrecía Reintentar, que agrava el límite: ya no se muestra el botón | Cerrado |
| Llamadas al LLM por pregunta (riesgo alto de cuota): el servidor ejecuta `list_merchants` antes del bucle; con Gemini real una pregunta típica baja de 3 a 2 llamadas (con el proveedor simulado, de 4 a 3) | Cerrado |
| Cifras de tests contradictorias entre documentos: se quitaron los conteos exactos y se remite a `npm test` | Cerrado |
| README sin códigos 429/502 del agente, sin ejemplo de `POST /events` (curl y PowerShell) ni formato de error | Cerrado |
| `SECURITY.md` sin la excepción `expose` ni los límites configurables | Cerrado |
| `NOTAS.md` y `ai-log.md` desactualizados (Sonnet 5.5, #29, #31, pruebas de proveedores reales) | Cerrado |
| Afirmación de que ningún proveedor real se probó: Gemini real se probó a mano una vez (luego 429 por cuota); Anthropic no | Cerrado |
| ADR sobre la frontera determinista vs LLM y la verificación de cifras (ADR 0003) | Cerrado |
| ADR 0001 presentaba el recálculo por cambio de reglas como capacidad existente: ahora dice que existe al ingerir eventos y que el recálculo masivo es una mejora | Cerrado |
| Tests de borde (fallida desde cada etapa, saltos de etapas, redondeo, México, Santiago y Kolkata en la ingesta, distancia 0 de noche): 30 tests nuevos, sin defectos en `src/` | Cerrado |
| nginx sin gzip ni caché de assets: gzip, caché larga e inmutable en `/assets/`, `index.html` sin caché y cabeceras de seguridad en todas las respuestas | Cerrado |
| Límite de ingesta fijo en 600 por IP: ahora `INGEST_RPM`, por cuenta autenticada | Cerrado |
| Límite del agente por IP: ahora `AGENT_RPM`, por usuario | Cerrado |
| `trust proxy` sin configurar: ahora `TRUST_PROXY` (hay que definirlo al desplegar tras un balanceador) | Cerrado |
| Pool y timeouts de PostgreSQL sin configurar: `DB_POOL_MAX`, `statement_timeout`, `lock_timeout` e `idle_in_transaction_session_timeout` | Cerrado |
| Gemini sin timeout: `LLM_TIMEOUT_MS` en Gemini y Anthropic; un timeout responde 502 | Cerrado |
| Siembra de demo siempre activa en el contenedor: ahora solo con `SEED_DEMO=true` (el compose de demo la activa) | Cerrado |
| Búsqueda `ILIKE` con comodín inicial, sin índice ni paginación | Documentado como límite |
| `cost_calculations` append-only no resiste `TRUNCATE` ni al dueño de la base | Documentado como límite |
| No hay comando de recálculo masivo por cambio de reglas o de tarifa | Documentado como límite |
| Nombres y direcciones de terceros saneados pero no delimitados ante el modelo | Documentado como límite |
| Datos de clientes que salen a un tercero con un proveedor real; el verificador no cubre cifras en palabras ni ata cada monto a su comercio | Documentado como límite |
| Una sola cuenta de ingesta, sin credencial ni firma por emisor | Documentado como límite |
| `time_zone` del comercio sin validación al crearlo | Documentado como límite |
| Verificador de cifras con separadores de miles mezclados | Documentado como límite |
| Límite de login solo por IP, sin límite por cuenta | Documentado como límite |
| `NODE_ENV=production` lo fija el compose, no el Dockerfile | Documentado como límite |
| `eventId` en conflicto y entregada/fallida (ya estaban como limitaciones conocidas en el README) | Documentado como límite |
| Rendimiento real de la ingesta sin medir (no hay prueba de carga) | Pendiente |
| Documentación formal de la API (OpenAPI): el README ahora tiene ejemplos y formato de error, pero no hay `openapi.yaml` ni se quitó el `@swagger` huérfano | Pendiente |
| Fricción para crear el `.env` (6 valores a mano) y `OWNER` fijo en `init-test-db.sql` | Pendiente |
| ADR 0001: trade-off de las particiones y opción A+ con una cifra | Pendiente |
| Informe de costos AWS: fuentes de blogs, consistencia del cálculo y tope de costo del LLM por consulta | Pendiente |
| Auditoría completa: registro de cálculo sin tarifa y trigger append-only en `delivery_events` | Pendiente |
| Sugerencias del chat para admin ("Todos los comercios") y mensaje "No pude verificar todas las cifras" poco claro | Pendiente |
| Endurecimiento de contenedores y CI (`read_only`, `cap_drop`, nginx sin root, acciones fijadas por SHA, CodeQL, trivy) | Pendiente |
| JWT sin `iss`/`aud`/`jti`; mensajes 4xx que repiten entrada; sin limitador general en lecturas ni deadline global del agente | Pendiente |
| Test de arranque de `standard_conforming_strings`; eventos con referencias desconocidas; ajustes de latencia del agente (thinking, SDK perezoso) | Pendiente |

## Resumen

| Estado | Filas |
| --- | --- |
| Cubierto | 59 |
| Parcial | 36 |
| Falta | 4 |
| Riesgo | 15 |
| Extra | 7 |

**Conclusión:** los entregables mínimos del enunciado están cubiertos y probados (ingesta idempotente, desorden, nocturno, fallida, consultas, buscador, agente con tools, frontend, README, NOTAS.md, ADR). No hay críticos ni altos de seguridad. Los huecos reales son de consistencia documental, algunos tests de borde, la cuota del proveedor de IA y varias mejoras de rendimiento y seguridad que ya estaban anotadas como fuera de alcance.

## Plan de cierre priorizado

**Antes de entregar (barato y con efecto visible)**
- Mostrar "Modo simulado" en la interfaz cuando el proveedor es `fake`, para que nadie concluya que el agente no es un LLM (único riesgo alto de usabilidad).
- Alinear la documentación: cifras de tests (README, `desarrollo.md`, `estructura.md`), `NOTAS.md` y `ai-log.md` al día, códigos 429/502 del agente en el README, la excepción `expose` en `SECURITY.md`, ejemplo de `POST /events` y formato de error.
- ADR breve "frontera determinista vs LLM y verificación de cifras": es el tema explícito de la defensa en vivo.
- Bajar las llamadas al LLM de 3 a 2 por pregunta (el servidor ejecuta `list_merchants` antes del bucle). Con el nivel gratuito de Gemini (5 por minuto, 20 por día) es lo que más cambia la experiencia.
- Tests de borde: fallida desde cada estado, salto de etapas, redondeo con base no múltiplo de 5, zona horaria no Bogotá en la ingesta.

**Rápido y de bajo riesgo**
- nginx: gzip y caché de assets con hash (cuidado: un `add_header` dentro de un `location` anula los de arriba).
- Límite de ingesta configurable por entorno (hoy 600 por minuto por IP contradice el discurso de 10.000 eventos por segundo) y configuración explícita del pool y de `statement_timeout`.
- Timeout del cliente Gemini y límite del agente por usuario en vez de por IP; `NODE_ENV=production` en el Dockerfile; siembra de demo solo con una variable explícita; `trust proxy` antes de desplegar tras un balanceador.

**Documentar como límite conocido (no hacer ahora)**
- Búsqueda `ILIKE` con comodín inicial: a esta escala un seq scan cuesta menos de 1 ms; con volumen real haría falta `pg_trgm`, `unaccent` y paginación.
- `cost_calculations` append-only no resiste `TRUNCATE` ni al dueño de la BD: se resolvería con un rol de aplicación sin ser dueño.
- Recálculo por cambio de reglas o tarifa: el ADR lo presenta como capacidad pero no existe un comando; alinear la redacción o agregar un script pequeño.
- Datos de clientes que salen a un tercero con un proveedor real de LLM; el verificador no cubre cifras en palabras ni ata cada monto a su comercio.

## Mejoras que agregamos sobre lo que pedía el enunciado

- **Mejoras propias:** Extras no pedidos por el enunciado
- **Agente:** Historial / entradas del cliente no pueden suplantar al asistente ni ampliar permisos
- **Agente:** Topes de coste/abuso del agente (pasos, tokens, tools por paso, rate limit)
- **Frontend:** Evidencia visible de verificación de cifras (el usuario sabe si la respuesta es confiable)
- **Extras sobre lo pedido:** Mejoras agregadas por el equipo (no exigidas por el enunciado)
- **Extra de seguridad:** Controles no pedidos por el enunciado
- **Dominio / zonas horarias:** Cache de formateadores Intl por zona horaria

## Detalle por dimensión

### Reglas de negocio y dominio

Las 7 reglas de negocio estan implementadas. Las reglas de costo (1, 2, 3, 4, 6) y la de dinero entero y fechas UTC (5) tienen tests que cubren los casos criticos. Estos son los 20:00 exacto, el 06:00 exacto, el duplicado x3, las 720 permutaciones y la entregada sin recogida con costo nulo. El dominio es puro, el calculo usa BigInt con un solo redondeo half-up, y la idempotencia la decide la restriccion unica de event_id (INSERT ... ON CONFLICT). Lo que falta, en orden de importancia: (1) La regla 7 (transiciones) esta solo parcialmente cubierta. Vive en el servicio y no en el dominio puro, y no hay test de fallida desde creada, recogida ni en_ruta, ni de salto de etapas. (2) No hay test de integracion con una zona distinta de Bogota, ni con medias horas, ni con Santiago en el calculo nocturno. Solo el dominio prueba Mexico_City y New_York.

| Estado | Severidad | Área | Requisito | Qué falta o recomendación |
| --- | --- | --- | --- | --- |
| Riesgo | baja | Riesgo operativo | Consistencia del historial de auditoria y manejo de datos de comercio | Documentar que el historial refleja el orden de llegada aunque el resultado final no. Validar time_zone al crear o actualizar el comercio (hoy no hay CHECK ni validacion en el modelo, backend/src/models/merchant.js:8). Mapear INVALID_TIMEZONE de un comercio como error 500 de configuracion y no como 422 del cliente. |
| Parcial | media | Transiciones (regla 7) | Estados en orden; fallida permitida desde cualquier estado previo a entregada | Faltan tests de: fallida desde creada, recogida y en_ruta por HTTP (solo se prueba desde asignada); salto de etapas permitido (creada -> recogida sin asignada); ranking de transitionAnomalies como funcion aislada (hoy vive en el servicio y solo tiene un caso). |
| Parcial | media | Redondeo (regla 5) | Redondeo half-up una sola vez; sin test explicito del redondeo del 40% ni del empate .5 en el costo completo | Falta un test con nombre que declare 'un solo redondeo' (el caso 6334 -> 7285 vs 7284 solo lo cubre implicitamente). Falta un caso fallido con base no multiplo de 5 (p. ej. 5001 -> 2000.4 -> 2000; |
| Parcial | media | Zona horaria por comercio (enunciado) | Zona horaria propia del comercio: fuera de Bogota en integracion y casos con medias horas | Faltan: un test de ingestion con un comercio no-Bogota (p. ej. Mexico_City o Santiago, que esta en el seed) que confirme que el recargo usa la zona del comercio y no la del servidor; zonas con medias horas (Asia/Kolkata); Santiago con horario de verano en el calculo nocturno (solo se prueba en period.test.js, rangos); |
| Cubierto | n/a | Costo (regla 1) | Costo = base + km x valor_km + 15% si completada entre 20:00 y 05:59 hora local | — |
| Cubierto | n/a | Entrega fallida (regla 2) | Fallida cobra 40% de la base, sin distancia ni recargo | — |
| Cubierto | n/a | Idempotencia (regla 3) | Evento repetido (mismo event_id) no altera el costo; mismo id con contenido distinto es conflicto | — |
| Cubierto | n/a | Desorden (regla 4) | Resultado independiente del orden de llegada; entregada sin recogida deja costo nulo (incompleto), no cero | — |
| Cubierto | n/a | Dinero entero y fechas UTC (regla 5) | Dinero en enteros; fechas en UTC en la BD | — |
| Cubierto | n/a | Distancia (regla 6) | Distancia = Haversine entre coordenada de recogida y la de entrega | — |
| Cubierto | n/a | Aislamiento del dominio (CLAUDE.md) | El costo es funcion pura de (eventos, tarifa, version de reglas); sin I/O en src/domain; versionado de reglas | — |

### Ingesta, consultas y persistencia

Dimension ingesta, consultas y persistencia: los requisitos minimos del enunciado estan cubiertos y bien probados. Ingesta idempotente con restriccion unica, calculo por recalculo completo bajo bloqueo de fila, dos consultas agregadas con alcance por comercio, buscador parametrizado y auditoria append-only por trigger. Hay tests de integracion contra PostgreSQL real: 10 peticiones paralelas, 720 permutaciones en dominio, permutacion en ingesta y nocturno de punta a punta. No encontre huecos de severidad alta. Los huecos reales son de severidad media o baja y la mayoria ya estan documentados como fuera de alcance. (1) El buscador no tiene indice ni paginacion, es sensible a tildes y no avisa si truncó los resultados. (2) No hay recalculo por cambio de reglas o de tarifa, aunque el ADR lo menciona como parte de la auditoria.

| Estado | Severidad | Área | Requisito | Qué falta o recomendación |
| --- | --- | --- | --- | --- |
| Falta | media | Auditoria | Recalculo por cambio de reglas o tarifa (el ADR lo afirma como parte de la auditoria) | Hueco honesto y declarado. Antes de la defensa, alinear la redaccion del ADR (presenta el recalculo como una capacidad) con el codigo (no existe un comando). Un script pequeño que reutilice recalculate con una version nueva demostraria la idea. |
| Riesgo | media | Ingesta / rendimiento | Coherencia con el escenario de escala del ADR (10.000 ev/s) en el limitador de la ingesta | Un emisor unico (flota) podria recibir 429 y perder eventos si no reintenta. Hacerlo configurable por entorno y documentar que ese tope es solo de abuso. El rendimiento real de ingesta no esta medido (README:160 lo deja como mejora). |
| Riesgo | baja | Ingesta | Eventos con referencias desconocidas (comercio, mensajero) cuando llegan desordenados | Aceptable porque los mensajeros y comercios son datos maestros. Considerar registrar una anomalia o guardar el evento sin la referencia para no perderlo, o documentar el contrato con el emisor. |
| Parcial | media | Calculo de costos | Regla de estados: una entrega pasa por estados en orden, pero puede saltar a fallida desde cualquier estado previo a entregada | Decision razonable para eventos desordenados y bien documentada, pero la regla de negocio queda como señalizacion y no como validacion. Para la defensa conviene explicar por que no se rechaza y que negocio debe definir cual terminal prevalece (README:135). |
| Parcial | media | Buscador | Buscador usable y escalable (relevancia, paginacion, rendimiento) | Decision aceptable para la prueba, pero conviene documentarla en la defensa: con volumen real haria falta indice GIN trigram (pg_trgm) y unaccent, paginacion por cursor y devolver un flag 'truncated' o total para que operaciones sepa que hay mas resultados. |
| Parcial | media | Auditoria | Auditoria completa: cubrir todos los resultados de calculo y garantizar inmutabilidad de las entradas | Recomendado: guardar un registro de calculo con status 'no_tariff' y razon; marcar las filas incompletas o no persistirlas; añadir trigger append-only a delivery_events y bloquear TRUNCATE; y documentar que el hash garantiza reproducibilidad pero no inmutabilidad de eventos. Son mejoras de baja urgencia para la prueba. |
| Extra | n/a | Mejoras propias | Extras no pedidos por el enunciado | Mejoras bien razonadas que suman a la defensa; asegurarse de poder explicar cada una como decision propia, no solo como salida de la IA. |
| Cubierto | n/a | Ingesta | Endpoint HTTP que reciba eventos de entrega (creada, asignada, recogida, en_ruta, entregada, fallida) | — |
| Cubierto | n/a | Ingesta | Idempotencia por event_id: duplicados no alteran el costo | — |
| Cubierto | n/a | Ingesta | Tolerancia al desorden: el resultado no depende del orden de llegada | — |
| Cubierto | n/a | Ingesta | Correccion bajo concurrencia (no solo duplicados secuenciales) | — |
| Cubierto | n/a | Calculo de costos | Costo = base + km x tarifa + 15% nocturno [20:00,06:00) hora local del comercio; fallida cobra 40% de la base sin recargos; | — |
| Cubierto | n/a | Consultas agregadas | Costo total y numero de entregas por comercio en un rango de fechas | — |
| Cubierto | n/a | Consultas agregadas | Entregas por estado para un mensajero dado | — |
| Cubierto | n/a | Persistencia | Persistencia justificada para el alcance | — |
| Cubierto | n/a | Buscador | Buscador de entregas por texto libre (comercio, direccion, mensajero), sin SQL concatenado | — |
| Cubierto | n/a | Auditoria | Trazabilidad de como se calculo cada costo (ADR + implementacion) | — |
| Cubierto | n/a | Dataset de ejemplo | Dataset de comercios y eventos, incluido 'Tienda La 80' con la nota de inyeccion | — |
| Cubierto | n/a | Tests | Tests de caminos criticos: idempotencia, desorden, calculo nocturno, entrega fallida | — |

### Agente conversacional y frontend

En la dimensión agente conversacional y frontend la prueba está cubierta y por encima de lo mínimo. El LLM orquesta con function calling y las sumas, fechas y zonas horarias las hacen tools deterministas. Hay un verificador de cifras que descarta la respuesta si una cifra no sale de las tools. El system prompt es constante y las notas solo llegan como resultado de la tool get_merchant_notes, saneadas y delimitadas. El alcance por comercio lo impone el servidor en cada tool. La nota hostil de Tienda La 80 está en el seeder y en tests, incluido uno donde un modelo guionizado que obedece la nota recibe FORBIDDEN al pedir otro comercio. El frontend React cumple lo pedido: chat, panel de datos consultados, carga, error con reintento, 401, texto plano y tests. Las brechas son de usabilidad y presentación, no de arquitectura.

| Estado | Severidad | Área | Requisito | Qué falta o recomendación |
| --- | --- | --- | --- | --- |
| Riesgo | alta | UX / usabilidad | Modo simulado (fake) no se confunde con un LLM real | Un revisor que escriba una pregunta libre en lenguaje natural verá respuestas rígidas y puede concluir que 'el agente no es un LLM'. Mostrar una insignia 'Modo simulado' en la UI cuando provider === 'fake' (el dato ya viaja en la respuesta), documentarlo en la pantalla de inicio y, si es posible, grabar/adjuntar una co… |
| Parcial | media | UX / usabilidad | Una persona nueva entiende para qué sirve la app y cómo empezar | Añadir en el login una pista (usuarios de demo y 'las claves están en tu .env') o un enlace/nota; añadir al estado vacío una lista corta de lo que el asistente SÍ puede hacer (facturación por periodo, entregas por mensajero, buscar, explicar costo, notas). |
| Parcial | media | Seguridad (agente/UI) | No fuga de datos hacia el cliente ni hacia terceros | Riesgo documentado pero no mitigado técnicamente: con proveedor real, datos de clientes salen a un tercero. Para producción: acuerdo de datos con el proveedor o modelo en la nube privada. Dejarlo explícito en 'qué dejé fuera de alcance' del README. |
| Parcial | media | Documentación | README/ADR cubren las decisiones del agente y la frontera determinista vs LLM | Añadir un ADR breve 'Frontera determinista vs LLM y verificación de cifras' (contexto, decisión, alternativas como dejar que el LLM calcule o RAG directo sobre SQL, trade-offs: falsos positivos del verificador, cifras en palabras). Es el tema explícito de la defensa en vivo. |
| Parcial | baja | UX / usabilidad | Preguntas sugeridas útiles y no frágiles | Para el admin (merchantIds null) el lateral dice 'Sin comercios asignados' y las sugerencias con 'mi comercio' no funcionan: mostrar 'Todos los comercios' y sugerir un nombre real (p. ej. el primero devuelto por /merchants). Las fechas fijas dependen del seed de octubre 2026; comentarlo o generarlas dinámicamente. |
| Parcial | baja | Optimización | Costo/latencia del agente | Para la prueba es aceptable. Mejoras que mencionar en 'qué haría con una semana': ejecutar tools independientes en paralelo, inyectar la lista de comercios permitidos como contexto determinista para ahorrar una vuelta, streaming/SSE de la respuesta y caché de list_merchants. |
| Extra | n/a | Agente | Historial / entradas del cliente no pueden suplantar al asistente ni ampliar permisos | Mejora propia no pedida por el enunciado. Bien resuelta. |
| Extra | n/a | Agente | Topes de coste/abuso del agente (pasos, tokens, tools por paso, rate limit) | Extra. Gap pequeño: el proveedor Gemini no define timeout ni reintentos (gemini.js:128-129), mientras Anthropic sí tiene timeout 60s (anthropic.js:15); una llamada colgada deja la petición abierta. Añadir timeout (httpOptions) al cliente de Gemini. |
| Extra | n/a | Frontend | Evidencia visible de verificación de cifras (el usuario sabe si la respuesta es confiable) | Extra de valor para la defensa. Riesgo UX: el mensaje 'No pude verificar todas las cifras...' (agent.service.js:159-161) puede resultar alarmante/poco claro para operaciones; no explica qué hacer. |
| Cubierto | n/a | Agente | Agente conversacional con tools / function calling; el LLM orquesta e interpreta, no calcula | — |
| Cubierto | n/a | Agente | Frontera determinista vs LLM bien trazada (periodos, fechas, sumas, zonas horarias fuera del modelo) | — |
| Cubierto | n/a | Agente | Notas del comercio como dato NO confiable: nunca en el system prompt | — |
| Cubierto | n/a | Agente | Alcance por comercio impuesto por el servidor (el modelo no decide permisos) | — |
| Cubierto | n/a | Agente | Nota hostil de 'Tienda La 80' tratada con seguridad | — |
| Cubierto | n/a | Agente | Tests del agente: prompt injection y acceso | — |
| Cubierto | n/a | Agente | Manejo de errores del proveedor de IA (cuota, caída) sin filtrar detalles internos | — |
| Cubierto | n/a | Frontend | React obligatorio con chat contra el agente que muestre respuestas Y datos consultados | — |
| Cubierto | n/a | Frontend | Manejo de estado, llamadas a la API, estados de carga/error y componentes limpios | — |
| Cubierto | n/a | UX / usabilidad | Accesibilidad básica y adaptación móvil | — |
| Cubierto | n/a | Seguridad (agente/UI) | Credenciales/API keys fuera del código (requisito operaciones #4) en la capa del agente | — |

### Entregables y documentación

Dimensión entregables y documentación: todos los entregables que pide el enunciado existen (repositorio con instrucciones, README con los 5 apartados, NOTAS.md, ADR de una página, tests de caminos críticos) y las 4 peticiones riesgosas están documentadas con su alternativa segura (README.md:74-80). No hay afirmaciones falsas graves en NOTAS.md; sí hay sobregeneralizaciones menores. Los problemas reales son de consistencia y de completitud. (1) Las cifras de tests están desactualizadas y contradictorias entre documentos. (2) La API no tiene documentación formal: no hay OpenAPI y el README no trae ejemplos de payload ni de errores, ni siquiera para POST /events. (3) El ai-log y NOTAS.md omiten trabajo reciente (#22, #26, #28, #29 y el cambio sin commitear del 429) y no mencionan Sonnet 5.5. (4) El informe de costos es coherente en lo aritmético, pero tiene lagunas y fuentes débiles.

| Estado | Severidad | Área | Requisito | Qué falta o recomendación |
| --- | --- | --- | --- | --- |
| Riesgo | media | README: consistencia interna | Cifras de tests coherentes entre documentos | Corrige 160/14 y 160/7 con los números reales (corre `npm test` y `npm test` del frontend). Mejor: no incluyas conteos, o di 'más de 180'. Actualiza desarrollo.md y estructura.md. Un revisor que corre la suite y ve 186 en vez de 160 verá una inconsistencia. |
| Riesgo | media | Entregable: NOTAS.md / ai-log | Afirmaciones sobre pruebas contra proveedores reales de LLM | Si ya probaste Gemini real, actualiza README, NOTAS y ai-log con lo que pasó (qué funcionó, el 429, qué se corrigió). Si no, quita el comentario del nivel gratuito, que da a entender lo contrario. |
| Riesgo | media | Estado del repositorio al entregar | Trabajo sin commitear y rama de entrega | Antes de entregar: cierra el PR de #29, commitea el cambio del 429 en su propia rama con test y fusiona. Actualiza el README (códigos 429/502 del agente) y SECURITY.md (el flag `expose` es la única excepción al 'un 500 nunca expone su mensaje' de errorHandler.js:29-34). Confirma que todo va a main por PR, no directo. |
| Parcial | media | Entregable: repositorio y ejecución | Fricción para levantar el proyecto | Agrega un script (`make demo` o `scripts/init-env.sh/ps1`) que cree el .env con valores aleatorios, o aclara en el README que son 6 valores por completar. Quita el OWNER fijo de init-test-db.sql o usa $POSTGRES_USER. |
| Parcial | media | README: documentación de API | Documentación de API (OpenAPI o tabla de endpoints) | Mínimo: añade al README un ejemplo de `POST /events` (curl con un evento válido y el 200/409) y un bloque con el formato de error y los códigos. Ideal: un `docs/openapi.yaml` pequeño. Elimina el `@swagger` huérfano o impleméntalo. |
| Parcial | media | Entregable: NOTAS.md | NOTAS.md transparente: herramientas de IA, para qué y qué se corrigió o rechazó; sin afirmaciones falsas respecto a docs/ai-log.md | No hay falsedades graves, pero actualiza NOTAS.md: agrega Sonnet 5.5, matiza 'por fase' como 'en las fases de backend y Gemini', incorpora los hallazgos de #29 y completa ai-log con #18, #22, #26, #28 y el cambio en curso. Si el informe de costos usó búsqueda web, dilo. |
| Parcial | media | Entregable: ADR 0001 | ADR breve, máx. 1 página, escalando de 5 a 50 comercios y de cientos a 10.000 ev/s, con trazabilidad; opciones, elegida y trade-off | Corrige el trade-off de las particiones (el riesgo real es una entrega o un comercio muy caliente, no el sesgo por clave). Agrega una opción A+ con una cifra aproximada (p. ej. 0,5 KB × 10.000/s = 5 MB/s, que el informe de costos ya calcula) y di por qué aun así eliges B (reproceso, desacople, auditoría). |
| Parcial | media | Informe de costos AWS | Cifras dudosas y fuentes | Sustituye los blogs por las páginas oficiales de precios (ALB y VPC) o marca 'sin verificar'. Añade un tope de costo del LLM por consulta con el precio de lista del modelo configurado. Para C, da un rango (p. ej. |
| Parcial | baja | README: apartados requeridos | README con (4) qué quedó fuera de alcance y por qué | Añade una frase de motivo a cada ítem sin él. El de la prueba del proveedor real es el más delicado: dilo con el motivo (costo/cuota) y el riesgo. |
| Parcial | baja | Informe de costos AWS | Consistencia interna del cálculo | Corrige la línea de RDS Multi-AZ (≈ 115) o aclara que es un mínimo, suma IPv4 en A, di explícitamente que 300 es el piso (suma 298) y que 400 es un colchón sin desglose, y aclara que A es solo para demo no sensible (RDS público vs privado). Suaviza la afirmación de Lambda. |
| Extra | n/a | Extras sobre lo pedido | Mejoras agregadas por el equipo (no exigidas por el enunciado) | Los extras son sólidos en seguridad, pero el volumen (informes, 3 proveedores, identidad visual) va contra 'preferimos una entrega pequeña'. Prepara en la defensa una justificación de por qué cada extra reduce riesgo, y evita que el README crezca más: el README ya tiene 163 líneas muy densas. |
| Cubierto | n/a | Entregable: repositorio y ejecución | Código fuente en un repositorio que compile y corra con instrucciones claras | — |
| Cubierto | n/a | README: apartados requeridos | README con (1) cómo levantar y probar | — |
| Cubierto | n/a | README: apartados requeridos | README con (2) decisiones de arquitectura y por qué (incluye justificar Node vs Python) | — |
| Cubierto | n/a | README: apartados requeridos | README con (3) supuestos ante requisitos ambiguos | — |
| Cubierto | n/a | README: apartados requeridos | README con (5) qué haría distinto con una semana | — |
| Cubierto | n/a | README: 4 peticiones riesgosas de operaciones | Documentar SQL concatenado, notas tal cual en el prompt, sin control de acceso y credenciales en código, con la alternativa segura | — |
| Cubierto | n/a | Entregable: tests de caminos críticos | Tests de idempotencia, desorden, cálculo nocturno y entrega fallida | — |
| Cubierto | n/a | Entregable: ADR 0002 | Justificación del stack (el enunciado pide justificar Node o Python) | — |
| Cubierto | n/a | Documentación adicional | SECURITY.md, docs/riesgos.md y docs/mejoras.md coherentes con el código | — |

### Seguridad

Revisión de seguridad de todo el repo (backend, frontend, Docker, CI, docs), solo lectura. No encontré hallazgos críticos ni altos. Los controles duros del CLAUDE.md están implementados y probados: SQL parametrizado, LIKE escapado, alcance por comercio en servidor y dentro de cada tool, JWT con rol cargado desde BD, notas tratadas como dato no confiable, secretos solo por entorno y errores 5xx sin detalles internos. Los hallazgos reales son de severidad media y baja: topes de costo y tiempo del agente, límites de tasa fuera de login, la auditoría append-only que no resiste TRUNCATE ni al dueño de la BD, la separación de datos de terceros que no llega a direcciones y nombres, la siembra de demo en un contenedor marcado como production, y endurecimiento de nginx, CI y Dockerfile.

| Estado | Severidad | Área | Requisito | Qué falta o recomendación |
| --- | --- | --- | --- | --- |
| Riesgo | media | Rate limiting | Límite de login contra fuerza bruta, trust proxy, límite por cuenta | Ya está anotado en docs/mejoras.md:9. Antes de desplegar tras un balanceador, fija `app.set('trust proxy', <saltos>)`. Añade un contador por email normalizado (o backoff) y skipSuccessfulRequests. Falla el arranque si NODE_ENV=test llega a un entorno no-test. |
| Riesgo | baja | Prompt injection / verificador | El verificador de cifras no debe poder burlarse con texto de terceros | Quita del conjunto `texts` los campos controlables por terceros (ids, nombres) o permite solo los que el servidor genera (estados, códigos). Ya está anotado parcialmente en docs/mejoras.md:11. |
| Riesgo | baja | Secretos / logs | Sin SQL con valores en logs fuera de producción | Añade `ENV NODE_ENV=production` al Dockerfile (y ajusta el comando de migraciones/seeders si hace falta) o pon `logging:false` también en development. |
| Riesgo | baja | Ingesta | La cuenta de ingesta y el endpoint de eventos no deben permitir abuso entre comercios ni agotamiento | Para esta prueba es aceptable, pero documéntalo en el ADR. Para producción: credencial por emisor con lista de comercios permitidos, tope de eventos por entrega, y firma HMAC o mTLS. Un `UNIQUE(delivery_id, merchant_id)` o prefijo por comercio evita el squatting. |
| Riesgo | baja | Docker / datos de demo | No sembrar identidades ni datos de demo en un contenedor de producción | Protege la siembra con una variable explícita (SEED_DEMO=true) y no la ejecutes por defecto. Documenta en el README que el compose es solo de demo. |
| Parcial | media | Rate limiting / DoS | Límites en endpoints de lectura costosos | Añade un limitador general por usuario (p. ej. 120/min) y configura `dialectOptions: { statement_timeout, idle_in_transaction_session_timeout }`. A escala, usa un índice pg_trgm o una búsqueda prefijo/normalizada. |
| Parcial | media | DoS del agente / costo | Límites de pasos y tokens; timeouts y presupuesto frente a abuso | Pasa httpOptions.timeout al cliente Gemini y un deadline global por petición con AbortSignal. Limita por usuario (key = req.user.id), añade un tope de concurrencia y un presupuesto diario de tokens. Usa un mensaje genérico para 429. |
| Parcial | media | Auditoría / BD | cost_calculations append-only (trazabilidad pedida por el ADR) | Crea un rol de aplicación sin ser dueño (solo INSERT/SELECT en cost_calculations y los DML mínimos en el resto), y deja las migraciones a un rol aparte. Añade un trigger BEFORE TRUNCATE a nivel de sentencia o REVOKE TRUNCATE. Anótalo como límite conocido en el ADR. |
| Parcial | baja | Inyección SQL / LIKE | Escapar % y _ en LIKE; limitar longitud y filas | Añade la prueba de arranque que ya tienes anotada (SHOW standard_conforming_strings debe dar 'on'). Si quieres bind real, usa `sequelize.query` con :pattern y ESCAPE '\'. Hoy el riesgo es bajo porque el valor por defecto de PG es seguro. |
| Parcial | baja | Autenticación (JWT) | Endurecimiento del token y del login | Calienta dummyHash al arrancar. Añade iss/aud y un `jti` o una versión de token en users para poder revocar. Documenta que el logout es solo del cliente. |
| Parcial | baja | Prompt injection | Todo texto no confiable delimitado, no solo las notas | Devuelve esos campos dentro de una estructura marcada (p. ej. { untrusted: '<<<...>>>' }) o delimítalos igual que las notas. Añade un test donde la dirección contenga una orden y un modelo simulado que la obedezca, y comprueba que no se ejecuta ninguna tool fuera de alcance. |
| Parcial | baja | Manejo de errores | Mensajes 4xx que reflejan entrada o detalles | Usa mensajes fijos para 404 y para entity.parse.failed ('JSON inválido'). Quita receivedMerchantId de detail para operaciones (o muéstralo solo a admin). |
| Parcial | baja | Docker / despliegue | Dockerfiles, usuario no root, puertos, .dockerignore | Usa nginxinc/nginx-unprivileged (o una versión vigente de nginx) en el puerto 8080, fija digests y añade el ecosistema `docker` a dependabot. En compose añade `read_only: true`, `cap_drop: [ALL]` y `security_opt: [no-new-privileges:true]` al backend. |
| Parcial | baja | nginx / CSP / cabeceras | CSP del frontend y cabeceras | Genera la CSP desde una variable al arrancar (envsubst en una plantilla) o sirve la API bajo el mismo origen vía proxy y deja connect-src 'self'. Añade Permissions-Policy y HSTS en el balanceador. |
| Parcial | baja | CI / cadena de suministro | Workflows con permisos mínimos, gitleaks, auditoría de dependencias | Fija las actions por SHA (Dependabot puede actualizarlas), añade CodeQL y un job trivy sobre las dos imágenes, y revisa si las versiones declaradas en package.json realmente existen y son las que resuelve el lockfile antes de entregar. |
| Extra | n/a | Extra de seguridad | Controles no pedidos por el enunciado | Defiéndelos en la entrevista como decisiones propias, junto con los límites que conoces (ver los ítems de auditoría y DoS). |
| Cubierto | n/a | Inyección SQL | Jamás concatenar SQL; solo consultas parametrizadas o ORM | — |
| Cubierto | n/a | Autenticación (JWT) | JWT, secreto, expiración, algoritmo fijo | — |
| Cubierto | n/a | Control de acceso / IDOR | Autenticación y pertenencia al comercio en todos los endpoints | — |
| Cubierto | n/a | Agente / alcance | Las tools no aceptan un comercio elegido por el modelo sin imponer el alcance de la sesión | — |
| Cubierto | n/a | Prompt injection | Notas y textos de terceros no van al system prompt ni se ejecutan como instrucciones | — |
| Cubierto | n/a | Secretos | Sin secretos en código, commits, logs ni imágenes | — |
| Cubierto | n/a | Manejo de errores | Respuestas que no filtren datos internos | — |
| Cubierto | n/a | Validación de entradas | Entradas validadas en el borde, tamaños y tipos estrictos | — |
| Cubierto | n/a | CORS / cabeceras API | CORS restringido y helmet | — |
| Cubierto | n/a | XSS / frontend | Sin inyección de HTML; token fuera de almacenamiento persistente | — |
| Cubierto | n/a | Base de datos / Sequelize | Versión de ORM y política de actualización | — |

### Optimización y rendimiento

A la escala de la prueba (5 comercios, cientos de eventos, seeders de 277 lineas) el rendimiento del backend es adecuado y no hay N+1 reales. Los indices cubren las consultas de totales, estados por mensajero, eventos por entrega y ultimo calculo. La ingesta usa una transaccion con bloqueo por fila de entrega, de ~14-16 viajes a la BD (estimado leyendo el codigo, no medido). El camino caliente de zonas horarias ya esta cacheado (75 us contra 1,9 us, medido). Las reglas duras de CLAUDE.md (insertar primero, recalcular desde todos los eventos) impiden optimizaciones que parecerian obvias, y no conviene intentarlas. El ADR 0001 ya resuelve los 10.000 ev/s con un log particionado por delivery_id, asi que no hay que exprimir el monolito. Lo que si importa es lo siguiente.

| Estado | Severidad | Área | Requisito | Qué falta o recomendación |
| --- | --- | --- | --- | --- |
| Falta | media | Ingesta / pool de conexiones | Configuracion explicita del pool y de tiempos de espera | Hoy con 5 conexiones y ~5-10 ms por transaccion el techo teorico de un proceso es de cientos de eventos/s (estimacion), muy por encima de 'cientos de eventos'. Aun asi, vale la pena fijar pool {max: env, acquire: ~10 s} y dialectOptions con statement_timeout y lock_timeout (p. ej. |
| Falta | media | Despliegue / nginx | Compresion gzip y cache de assets con hash | Es la mejora de despliegue con mejor relacion costo/beneficio (~5 min): gzip on; gzip_vary on; gzip_min_length 1024; gzip_types text/css application/javascript application/json image/svg+xml; |
| Falta | baja | Ingesta / viajes redundantes | Recortes baratos de viajes por evento (si se quiere defender la capacidad del monolito) | Opcionales, en orden de retorno: (1) un solo UPDATE ... WHERE dedup_key IN (...) AND resolved_at IS NULL en lugar de 3 (-2 viajes, riesgo nulo). (2) Cache TTL de 30-60 s para merchants/couriers por id (-1 a -2 viajes; ojo: la zona horaria entra al inputHash, asi que expira bien con TTL corto). |
| Riesgo | alta | Agente / cuota LLM | Numero de llamadas al LLM por pregunta (nivel gratuito Gemini: 5/min y 20/dia, dato dado por el usuario, no verificado) | Es el unico punto de rendimiento que importa hoy. Palanca principal (esfuerzo bajo, ~1 h): que el SERVIDOR ejecute list_merchants antes del bucle (executeTool con el usuario de la sesion) e inyecte el par functionCall/functionResponse sintetico como primer turno, y lo agregue a toolCalls para que verificacion y panel d… |
| Riesgo | media | Ingesta / limitador | Coherencia del limite de ingesta con la capacidad declarada | Es un tope que contradice el discurso de escala (ADR: 10.000 ev/s) y una prueba de carga o un reintento masivo del emisor recibira 429 a 10 ev/s. Hacerlo configurable por entorno (INGEST_RPM) y subirlo, o clavearlo por cuenta de ingesta en vez de por IP; |
| Riesgo | baja | BD / busqueda | Busqueda ILIKE '%texto%' (comodin inicial) sobre comercio, direccion y mensajero | A la escala de la prueba (cientos de filas) un seq scan cuesta <1 ms: no hace falta nada y agregar indices seria sobreingenieria. Para la defensa/README ('con una semana'): pg_trgm (CREATE EXTENSION es 'trusted' desde PG13, viene en la imagen postgres:18-alpine) con indice GIN gin_trgm_ops en deliveries.address, y rees… |
| Parcial | media | Agente / cuota LLM | Limitador del endpoint del agente alineado con la cuota real del proveedor | Opcional y barato: hacer el limite configurable por entorno (p. ej. LLM_RPM) y, si se quiere ser prolijo, contar llamadas al LLM (no peticiones) con un cubo de fichas en memoria; al agotarse responder 429 con Retry-After sin llamar al proveedor. |
| Parcial | media | Prioridad global | Orden recomendado de acciones de rendimiento | Hacer (barato y con efecto visible): 1) preinyectar list_merchants desde el servidor para bajar el agente de 3 a 2 llamadas por pregunta (alta, ~1 h); 2) gzip + cache de assets en nginx con la advertencia de add_header (media, ~10 min); |
| Parcial | baja | Agente / latencia y tokens | Configuracion del modelo: pensamiento (thinking), timeout y tamano de contexto | Dos ajustes de una linea cada uno: thinkingConfig con presupuesto bajo (o 0 en 2.5-flash, que lo permite) para orquestar tools mas rapido y barato (probar que no empeore la eleccion de tools), y httpOptions.timeout (~20-30 s) en el cliente. |
| Parcial | baja | Agente / consultas de las tools | Consultas redundantes dentro de las tools (N+1) | Cosmetico a esta escala (consultas por PK, milisegundos, y el LLM tarda segundos). Si se toca el codigo por otra razon: pasar attributes ['id','timeZone'] en periodFor y un parametro limit a costAudit. No priorizar. |
| Parcial | baja | BD / indices | Listado de anomalias | Con pocas anomalias es irrelevante. Si crecen: indice parcial (id DESC) WHERE resolved_at IS NULL, o (merchant_id, id DESC) WHERE resolved_at IS NULL, que ademas es mas pequeno. Esfuerzo bajo (1 migracion), prioridad baja: no hacerlo salvo que sobre tiempo. |
| Parcial | baja | BD / tamano de datos | Almacenamiento por evento y por calculo | Irrelevante hoy. Ya reconocido en ADR 0001 (retencion por niveles). Dejarlo como esta; solo mencionar en la defensa que es duplicacion deliberada para auditoria. |
| Parcial | baja | API / paginacion y limites | Paginacion y limites de filas en consultas | Los topes cumplen el objetivo (proteger BD y tokens). La paginacion seria funcional, no de rendimiento; documentarla como fuera de alcance. No agregar nada. |
| Parcial | baja | Despliegue / arranque del backend | Carga de ambos SDK de LLM aunque solo se use uno | Un require perezoso dentro de cada case de createProvider (providers/index.js:12-24) deja cargado solo el proveedor activo: -100 a -280 ms de arranque y ~10-20 MB de memoria. Esfuerzo de 5 minutos y bajo riesgo, pero a esta escala no cambia nada para el usuario: opcional, util si se mide en el contenedor antes. |
| Extra | n/a | Dominio / zonas horarias | Cache de formateadores Intl por zona horaria | El camino caliente ya esta optimizado; period.js corre una vez por consulta y suma ~1 ms frente a una consulta SQL: no optimizar. Nada que hacer. |
| Cubierto | baja | Ingesta / transaccion | Tamano de la transaccion, viajes a la BD por evento y bloqueo por entrega | — |
| Cubierto | baja | Ingesta / autenticacion | Costo de authenticate por peticion | — |
| Cubierto | baja | BD / indices | Indices frente a las consultas reales (totales por comercio y rango, estados por mensajero) | — |
| Cubierto | baja | Frontend / bundle y fuentes | Tamano del bundle y de las fuentes | — |
| Cubierto | baja | Despliegue / imagen backend | Tamano, capas y cache de npm de la imagen backend | — |
| Cubierto | n/a | Agente / verificacion de cifras | Costo de verifyNumbers | — |
| Cubierto | n/a | Ingesta / recalculo | Recalculo desde todos los eventos de la entrega en cada evento | — |
| Cubierto | n/a | Despliegue / imagen frontend | Imagen del frontend (build en dos etapas) | — |
| Cubierto | n/a | Despliegue / PostgreSQL | Configuracion de la BD en Docker | — |
