# Bitácora de uso de IA

Se actualiza al cerrar cada PR. Registra solo lo que realmente ocurrió: alimenta `NOTAS.md`.

| Fecha | Herramienta | Qué pedí | Qué produjo | Qué rechacé o corregí y por qué |
| --- | --- | --- | --- | --- |
| 2026-10-30 | Claude Code (Opus 5.5) | Plan de la fase 1 (dominio de costo) en modo plan, sin escribir código | Plan con firmas, lista de tests y 9 supuestos, escrito sin el enunciado (lo buscó en `enunciado.pdf`, que no existía) | Le indiqué que el enunciado estaba en `.md` y que contrastara el plan; corrigió el nombre del campo a `lon`. Le pedí agregar el caso "recogida de noche, entregada de día" y dejar el supuesto entregada + fallida como abierto para negocio. Quité la verificación del esqueleto porque ya la había hecho yo. |
| 2026-10-30 | Claude Code (Opus 5.5) | F0: higiene, etiquetas, issues de F1 a F6 | Issues #5 a #11, limpieza de textos y comentarios, `logging: false` en test, `.gitattributes` | La herramienta propuso conservar en `NOTAS.md` una línea sobre el origen de la infraestructura; decidí quitarla. Detectó finales de línea CRLF en Windows que hacían fallar `prettier --check`; se fijó LF con `.gitattributes`. |
