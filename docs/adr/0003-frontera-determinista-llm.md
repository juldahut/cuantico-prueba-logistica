# ADR 0003 — Frontera entre el LLM y el código determinista

Estado: aceptado

## Contexto
El enunciado pide un agente donde el LLM orquesta e interpreta, pero no calcula. Las respuestas tocan dinero y datos de
varios comercios, y el modelo puede equivocarse, inventar cifras o ser manipulado por textos de terceros (la nota hostil
de Tienda La 80 existe para probar eso). Hay que decidir qué hace el modelo y qué hace el código.

## Decisión
- **Tools deterministas de solo lectura** (`list_merchants`, `resolve_period`, `get_merchant_totals`,
  `get_courier_status_counts`, `search_deliveries`, `explain_cost`, `get_merchant_notes`). Reutilizan el dominio puro y las
  consultas; ninguna escribe.
- **Alcance de la sesión, no del modelo.** Cada tool recibe el usuario autenticado y aplica su alcance: el modelo puede
  pedir cualquier `merchant_id`, y el servidor responde `FORBIDDEN` si no le corresponde.
- **Periodos resueltos por el servidor.** El modelo pasa una expresión (`semana_pasada`, `rango`…); `resolve_period` y las
  tools devuelven las fechas en la zona del comercio, con `last_day`.
- **Verificador de cifras por campos tipados.** Cada fecha y número de la respuesta debe salir de un campo de datos de las
  tools. No cuentan ids, textos de terceros ni números que escribió el usuario. Si algo no cuadra, se descarta el texto del
  modelo, se avisa (`verified: false`) y los datos viajan en `toolCalls`.
- **Notas como dato no confiable.** El system prompt es fijo; notas, nombres y direcciones llegan solo como resultado de
  tool, saneados, y las notas además delimitadas.
- **`list_merchants` preinyectado:** el servidor lo ejecuta antes del bucle con el usuario de la sesión. Una llamada menos
  al modelo por pregunta.

## Alternativas descartadas
- **Dejar que el LLM calcule:** los errores de aritmética y fechas son silenciosos y no reproducibles; contradice que el
  costo sea una función pura.
- **Text-to-SQL directo:** rompe la regla de no concatenar SQL, saca el control de acceso por comercio del servidor y
  impide verificar cifras contra campos conocidos.
- **RAG sobre texto:** mezcla datos de comercios en el contexto, no ata el alcance al usuario y las cifras salen de texto
  libre, no de campos verificables.

## Trade-offs
- El verificador puede dar **falsos negativos**: descarta una respuesta correcta si reformula una cifra de forma no
  reconocida (pasó con fechas en español y con "6.334,00"; se corrigió caso por caso).
- **Límites conocidos:** no detecta cifras en palabras ("seis mil") ni ata cada monto a su comercio y moneda; comprueba que
  la cifra exista en los datos, no a qué dato pertenece. Nombres y direcciones se sanean pero no se delimitan.
- **Costo y cuota:** una pregunta típica son 2 llamadas al modelo, y se depende de la cuota del proveedor (Gemini gratuito:
  5 por minuto y 20 por día; alcanza para una prueba, no para una demo).

## Si piden "darle más libertad al modelo"
Cada libertad (calcular, escribir SQL, elegir el comercio) mueve una garantía del servidor a la confianza en el modelo:
exactitud de los montos, aislamiento entre comercios o resistencia a inyección. Se defiende ampliando por tools nuevas y
deterministas (p. ej. comparar dos periodos), no por permisos, y midiendo antes con un conjunto de evaluación contra el
proveedor real.
