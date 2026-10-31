# Seguridad

## Secretos
- Ningún secreto se versiona. Todo sale de variables de entorno; `.env` está en `.gitignore`, y `.env.example` documenta
  las claves sin valores reales.
- Al arrancar se exige un `JWT_SECRET` de al menos 32 caracteres.
- Cada usuario de ejemplo toma su clave de una variable distinta.
- La siembra de datos y usuarios de demo solo ocurre con `SEED_DEMO=true` (valor exacto). El `docker-compose.yml` del repo es de demo y la activa por defecto; un contenedor desplegado sin esa variable solo aplica migraciones y no crea cuentas conocidas.
- gitleaks corre en CI sobre todo el historial. `.gitleaksignore` contiene un único falso positivo ya corregido: una clave
  fija de tests, que ahora se genera al azar.
- Un 5xx nunca expone su mensaje: el cliente recibe "Error interno del servidor", y los logs de error no incluyen parámetros ni cuerpos. **Única excepción:** un `HttpError` creado con `expose: true`, que muestra su mensaje aunque sea 5xx. Es solo para textos escritos a mano en el código y seguros de mostrar (hoy, el 502 `AGENT_UNAVAILABLE` del agente: "El asistente no está disponible ahora."). Nunca se usa con el mensaje de un error de una librería, de la base o del proveedor. Los errores de validación (422) sí devuelven `details` con el campo y el motivo.

## Acceso
- JWT HS256 (algoritmo fijo al firmar y al verificar) que solo lleva el id del usuario. El rol y los comercios se leen de
  la base en cada petición.
- Roles: `admin`, `operaciones` (solo sus comercios) e `ingesta` (solo `POST /events`).
- Fuera de alcance: 403 en recursos de otro comercio, y 404 en entregas y mensajeros ajenos, para no confirmar que existen.
- Rate limit en login (10 intentos por 15 minutos, por IP), ingesta y agente (por cuenta autenticada, con la IP como respaldo). Con `TRUST_PROXY` sin definir no se confía en `X-Forwarded-For`; detrás de un balanceador hay que fijar el número exacto de saltos, o el límite por IP vería siempre la IP del proxy.

## Datos
- Consultas parametrizadas (ORM o `bind`). La búsqueda escapa `%`, `_` y la barra invertida, y limita longitud (100) y
  filas (20).
- Validación estricta de tipos en los bordes: se rechazan los arreglos donde se espera un escalar y los caracteres de
  control en textos.
- Límites configurables por entorno (valores en `backend/.env.example`; uno inválido hace fallar el arranque): `INGEST_RPM` (600/min por cuenta), `AGENT_RPM` (20/min por usuario), `DB_POOL_MAX` (10), `DB_STATEMENT_TIMEOUT_MS` (15 s), `DB_LOCK_TIMEOUT_MS` (5 s), `DB_IDLE_IN_TX_TIMEOUT_MS` (15 s) y `LLM_TIMEOUT_MS` (30 s). Los timeouts de la base se aplican a la API, no a las migraciones. Un timeout del proveedor de IA se responde como 502 con mensaje fijo.
- En Docker Compose, la base, la API y el frontend se publican solo en `127.0.0.1`. El backend corre con `NODE_ENV=production`, sin log SQL (que incluiría valores como correos y búsquedas) y como usuario `node`, no root.

## Agente conversacional
- Solo tools de lectura. El alcance lo impone la sesión en cada tool, no el modelo.
- El system prompt es fijo. Los textos de comercios (notas, nombres, direcciones) son datos no confiables: llegan solo
  como resultado de tools, normalizados, sin caracteres de control ni `<`/`>`, truncados, y las notas además van
  delimitadas.
- Límites: 5 pasos, 5 tools por paso, 40 000 tokens y mensajes de 1000 caracteres.
- `list_merchants` lo ejecuta el servidor antes del bucle con el usuario de la sesión, así que la lista de comercios que ve el modelo sale del alcance real del usuario.
- Verificación de cifras: un número que no salga de los datos de las tools descarta la respuesta del modelo. Los números de textos de terceros (notas, direcciones) no cuentan.
- El historial del cliente solo admite preguntas del usuario.

## Frontend
- El token vive solo en memoria. Todo el texto se muestra como texto plano (sin HTML).
- nginx envía CSP, `X-Content-Type-Options`, `X-Frame-Options` y `Referrer-Policy` en todas las respuestas (incluidos los 404 de `/assets/`), con `server_tokens off`.

## Reporte de vulnerabilidades
Contacto: julian.desarrollo@gmail.com
