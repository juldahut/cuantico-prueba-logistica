# NOTAS — uso de herramientas de IA

> Resumen de `docs/ai-log.md`, donde está el detalle por fase. Solo se registra lo que realmente ocurrió.

## Herramientas de IA usadas
- **Claude Code**, en la terminal. El modelo fue Claude Opus 5.5 hasta el proveedor Gemini, y Claude Sonnet 5.5 en las
  sesiones de #29 (identidad visual y UX) y #31 (cierre de la auditoría). Para:
  - Planear la fase de dominio en modo plan, sin escribir código, hasta que aprobé el plan.
  - Crear issues, ramas, commits y PR con las plantillas del repositorio.
  - Escribir los tests primero (un commit en rojo) en las fases F1 a F4 y en el proveedor Gemini; en el resto, los tests
    se escribieron junto con el código (ver más abajo).
  - Redactar la documentación (README, ADR, informes, incluido el informe de costos de despliegue).
- **Dos subagentes de revisión de solo lectura** definidos en `.claude/agents/`. Corrieron sobre el diff de las fases F1 a
  F5, sobre la revisión de todo `main` y sobre #29; no hay registro de revisión en F0 ni en el proveedor Gemini:
  - `revisor-seguridad`: inyección SQL, prompt injection, fuga entre comercios, secretos y validación.
  - `auditor-reglas`: reglas de negocio y tests que faltan.
- **Seis subagentes de solo lectura, uno por dimensión,** para la auditoría de #31 (reglas de negocio, ingesta y consultas,
  agente y frontend, entregables y documentación, seguridad, rendimiento). Su resultado es `docs/auditoria-prueba.md`:
  sin críticos ni altos de seguridad. Dos riesgos altos de otra clase (confundir el modo simulado con un LLM real y la
  cuota del proveedor) se corrigieron. De los medios, unos se corrigieron y otros se documentaron como límite conocido
  (`docs/mejoras.md`); los que no se tocaron figuran como Pendiente en la sección "Estado tras el cierre" de la auditoría.
- El agente del producto usa Claude (SDK `@anthropic-ai/sdk`) con `LLM_PROVIDER=anthropic`, o Gemini (SDK
  `@google/genai`) con `LLM_PROVIDER=gemini`. Por defecto usa un modelo simulado determinista.

## Qué corregí o rechacé
**Correcciones mías al plan inicial.** Lo escribió sin el enunciado: lo buscó en un PDF que no existía.
- Le indiqué el archivo correcto y le pedí contrastar el plan con él (el campo de coordenadas pasó a llamarse `lon`).
- Le pedí agregar el caso "recogida de noche, entregada de día".
- Le pedí dejar "entregada + fallida" como supuesto abierto para negocio, visible como anomalía y nunca descartado.

**Hallazgos de la revisión que obligaron a corregir el código generado.** Los altos:
- **Rango de fechas.** En Santiago de Chile, el día que empieza el horario de verano la medianoche no existe. El rango del
  día tomaba una hora del día anterior.
- **Verificación de cifras del agente.** Partía las fechas en pedazos y aceptaba números escritos por el usuario o por
  terceros. Se rehízo para que solo cuenten campos de datos de las tools.
- **Fechas del modelo.** La tool de totales aceptaba fechas calculadas por el modelo. Ahora el periodo se pasa como
  expresión y lo resuelve el servidor.
- **Delimitador de las notas.** El de las notas del comercio se podía reconstruir anidándolo. Ahora se quitan `<` y `>` de
  todo texto de terceros.

Los medios relevantes:
- BOTH_TERMINAL se perdía si no había tarifa vigente.
- Tipos en arreglo pasaban la validación de express-validator.
- Las anomalías crecían sin tope.
- Los logs de error incluían datos del cuerpo.
- La clave de los usuarios de ejemplo era compartida: un usuario de operaciones podía entrar como admin.
- Se podían enumerar mensajeros de otros comercios.
- El cliente podía inventar turnos de "asistente" en el historial del chat.

**Hallazgos de #29 y #31 que obligaron a corregir.**
- El manejador de errores ocultaba el mensaje de cualquier 5xx, así que el aviso "El asistente no está disponible" nunca
  llegaba al usuario. Se vio al probar el stack real, no con los tests. Se corrigió con una excepción explícita (`expose`).
- El timeout del cliente de Gemini sale como `AbortError`, no como error de la API: sin ajuste habría terminado en 500 en
  vez de 502. Se encontró al probarlo contra un servidor que nunca responde.

**Errores propios de la herramienta, detectados al correr los tests.**
- Pasaba al proveedor del agente un arreglo que después seguía mutando.
- Usó un nombre de columna equivocado al reabrir anomalías: rompió 11 tests.
- Escribió un test que esperaba que `%` no devolviera nada, cuando sí había una dirección con `%` literal. Se corrigió el
  test, no el código.

**Falsos positivos.** gitleaks marcó como secreto una clave fija de tests. Ahora se genera al azar en cada corrida.

**Lo que no hizo como se pidió.**
- En el frontend y en los tests agregados durante las revisiones, los tests se escribieron junto con el código, no antes.
  Los 30 tests de borde de #31 se escribieron sobre código que ya existía y no encontraron defectos.
- Bajar las llamadas al modelo con el proveedor simulado: se pidió de 4 a 2 y bajaron a 3 (con Gemini real, de 3 a 2).
- Proveedores reales: Gemini se probó a mano una vez contra la API (una pregunta de facturación respondió bien y verificada;
  después el nivel gratuito devolvió 429 por cuota). Anthropic no se probó contra la API.
- Registro incompleto: `docs/ai-log.md` no tiene filas propias de los PR #18, #22, #26 y #28; lo que hizo la herramienta en ellos no está anotado ahí.

## Qué decidí yo
Solo decisiones que están registradas en `docs/ai-log.md`, `docs/bitacora.md`, el README o `docs/auditoria-prueba.md`:
- **No implementar los 4 pedidos riesgosos de operaciones como venían** (SQL concatenado, notas tal cual en el prompt, sin
  control de acceso, credenciales en el código), sino su alternativa segura (tabla del README).
- **No tocar los medios del auditor sobre `eventId` en conflicto y entregada/fallida**, y documentarlos como limitaciones
  conocidas (`ai-log.md`, revisión de `main`).
- **Dejar "entregada + fallida" como supuesto abierto para negocio**: visible como anomalía, nunca descartada.
- **No arreglar la cuota del nivel gratuito de Gemini, sino documentarla** y recomendar `LLM_PROVIDER=fake` o una llave con
  facturación (`bitacora.md`).
- **Quitar el JSON del panel de datos consultados y simplificar la interfaz** cuando, al probarla, me pareció saturada y
  seguía viendo JSON (`ai-log.md`).
- **En el cierre de #31, corregir lo barato y de efecto visible y documentar el resto como límite conocido** en vez de
  implementarlo (`pg_trgm`, rol de BD sin ser dueño, recálculo masivo, credencial por emisor): la prueba pide una entrega
  pequeña (`auditoria-prueba.md`, plan de cierre).
