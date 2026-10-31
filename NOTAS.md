# NOTAS — uso de herramientas de IA

> Resumen de `docs/ai-log.md`, donde está el detalle por fase. Solo se registra lo que realmente ocurrió.

## Herramientas de IA usadas
- **Claude Code (modelo Claude Opus 5.5)**, en la terminal, para:
  - Planear la fase de dominio en modo plan, sin escribir código, hasta que aprobé el plan.
  - Crear issues, ramas, commits y PR con las plantillas del repositorio.
  - Escribir los tests primero (un commit en rojo por fase) y luego la implementación.
  - Redactar la documentación (README, ADR, informes).
- **Dos subagentes de revisión de solo lectura** definidos en `.claude/agents/`, que corrieron sobre el diff de cada fase
  antes de fusionar:
  - `revisor-seguridad`: inyección SQL, prompt injection, fuga entre comercios, secretos y validación.
  - `auditor-reglas`: reglas de negocio y tests que faltan.
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

**Errores propios de la herramienta, detectados al correr los tests.**
- Pasaba al proveedor del agente un arreglo que después seguía mutando.
- Usó un nombre de columna equivocado al reabrir anomalías: rompió 11 tests.
- Escribió un test que esperaba que `%` no devolviera nada, cuando sí había una dirección con `%` literal. Se corrigió el
  test, no el código.

**Falsos positivos.** gitleaks marcó como secreto una clave fija de tests. Ahora se genera al azar en cada corrida.

**Lo que no hizo como se pidió.**
- En el frontend y en los tests agregados durante las revisiones, los tests se escribieron junto con el código, no antes.
- El proveedor real del agente no se probó contra la API.
