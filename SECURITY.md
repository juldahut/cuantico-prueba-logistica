# Seguridad

## Secretos
- Ningún secreto se versiona. Todo sale de variables de entorno; `.env` está en `.gitignore`, y `.env.example` documenta
  las claves sin valores reales.
- Al arrancar se exige un `JWT_SECRET` de al menos 32 caracteres.
- Cada usuario de ejemplo toma su clave de una variable distinta.
- gitleaks corre en CI sobre todo el historial. `.gitleaksignore` contiene un único falso positivo ya corregido: una clave
  fija de tests, que ahora se genera al azar.
- Los errores 500 no devuelven detalles internos, y los logs de error no incluyen parámetros ni cuerpos.

## Acceso
- JWT HS256 (algoritmo fijo al firmar y al verificar) que solo lleva el id del usuario. El rol y los comercios se leen de
  la base en cada petición.
- Roles: `admin`, `operaciones` (solo sus comercios) e `ingesta` (solo `POST /events`).
- Fuera de alcance: 403 en recursos de otro comercio, y 404 en entregas y mensajeros ajenos, para no confirmar que existen.
- Rate limit en login, ingesta y agente.

## Datos
- Consultas parametrizadas (ORM o `bind`). La búsqueda escapa `%`, `_` y la barra invertida, y limita longitud (100) y
  filas (20).
- Validación estricta de tipos en los bordes: se rechazan los arreglos donde se espera un escalar y los caracteres de
  control en textos.
- En Docker Compose, la base, la API y el frontend se publican solo en `127.0.0.1`. El backend corre con `NODE_ENV=production`, sin log SQL (que incluiría valores como correos y búsquedas) y como usuario `node`, no root.

## Agente conversacional
- Solo tools de lectura. El alcance lo impone la sesión en cada tool, no el modelo.
- El system prompt es fijo. Los textos de comercios (notas, nombres, direcciones) son datos no confiables: llegan solo
  como resultado de tools, normalizados, sin caracteres de control ni `<`/`>`, truncados, y las notas además van
  delimitadas.
- Límites: 5 pasos, 5 tools por paso, 40 000 tokens y mensajes de 1000 caracteres.
- Verificación de cifras: un número que no salga de los datos de las tools descarta la respuesta del modelo. Los números de textos de terceros (notas, direcciones) no cuentan.
- El historial del cliente solo admite preguntas del usuario.

## Frontend
- El token vive solo en memoria. Todo el texto se muestra como texto plano (sin HTML).
- nginx envía CSP, `X-Content-Type-Options`, `X-Frame-Options` y `Referrer-Policy`, con `server_tokens off`.

## Reporte de vulnerabilidades
Contacto: julian.desarrollo@gmail.com
