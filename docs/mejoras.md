# Mejoras posibles

Prioridad aproximada. Se completa durante el desarrollo; las últimas filas son lo que quedó fuera de alcance al cerrar la auditoría (issue #31, `docs/auditoria-prueba.md`).

| Prioridad | Mejora | Por qué | Esfuerzo |
| --- | --- | --- | --- |
| Media | Fijar la versión de tzdata o registrarla en cada cálculo | La hora local depende del ICU de Node; un cambio de tzdata podría cambiar un cálculo histórico | Bajo |
| Baja | Pasar la distancia como fracción exacta en vez de metros enteros | Hoy hay un redondeo de medición (máx. 0,5 m) antes del redondeo de dinero | Bajo |
| Alta | Límite de login por cuenta además de por IP, y fijar `TRUST_PROXY` al desplegar detrás de un balanceador | El límite de login es solo por IP; `TRUST_PROXY` ya es configurable, pero hay que definirlo con el número exacto de saltos | Bajo |
| Media | Prueba de arranque que verifique `standard_conforming_strings=on` | El escape de LIKE depende de esa opción de PostgreSQL | Bajo |
| Media | Verificar que cada monto de la respuesta corresponda al comercio y la moneda correctos | Hoy se verifica que la cifra exista en los datos, no a qué dato pertenece | Medio |
| Media | Probar los proveedores reales con un conjunto de preguntas de evaluación | Gemini se probó a mano una vez (una pregunta; luego se agotó la cuota gratuita) y Anthropic no se probó contra la API real | Medio |
| Baja | Actualizar dependencias con avisos moderados (`uuid` vía sequelize, `deepmerge` vía jest) | `npm audit` sin altos, pero con moderados de dependencias transitivas | Bajo |
| Alta | Marcar la entrega como `inconsistent` mientras tenga un `EVENT_CONFLICT` abierto | Hoy gana la primera variante que llega y el costo depende del orden de llegada en ese caso | Bajo |
| Media | Distinguir el orden entre entregada y fallida (fallida posterior a la entrega como `INVALID_TRANSITION`) | Hoy ambos órdenes quedan como `BOTH_TERMINAL`; depende además de que negocio decida cuál prevalece | Bajo |
| Media | Búsqueda con `pg_trgm` (índice GIN en `deliveries.address`), `unaccent` y paginación con aviso de resultados truncados | `ILIKE '%texto%'` con comodín inicial hace una lectura completa: a esta escala cuesta menos de 1 ms, con volumen real no. Hoy corta en 20 filas sin avisar | Medio |
| Media | Rol de BD de la aplicación que no sea dueño de las tablas, y bloquear `TRUNCATE` en `cost_calculations` | El trigger append-only rechaza UPDATE y DELETE, pero no resiste `TRUNCATE` ni al dueño de la base | Medio |
| Media | Comando de recálculo masivo por cambio de reglas o de tarifa | El recálculo existe al ingerir eventos; no hay forma de recalcular el histórico con una versión nueva (ADR 0001) | Medio |
| Media | Delimitar los nombres y las direcciones de terceros ante el modelo, como ya se hace con las notas | Hoy se sanean (NFKC, sin control ni `<`/`>`, truncados) pero no van delimitados | Bajo |
| Media | Credencial o firma por emisor en la ingesta, con lista de comercios permitidos | Una sola cuenta de ingesta puede enviar eventos de cualquier comercio; un emisor comprometido pesa más de lo debido | Medio |
| Baja | Validar `time_zone` al crear o actualizar un comercio | Hoy no hay CHECK ni validación en el modelo; una zona inválida solo se descubre al calcular | Bajo |
| Baja | Rechazar en el verificador de cifras los números con separadores de miles mezclados | Un formato ambiguo podría leerse como una cifra distinta de la que está en los datos | Bajo |
