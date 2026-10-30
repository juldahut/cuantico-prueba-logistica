# Bitácora del proyecto

Registro breve por fase. Solo lo que realmente pasó.

## Aprendizajes
- F0: con `core.autocrlf=true` en Windows, Prettier marcaba 12 archivos por CRLF. Se fija `eol=lf` en `.gitattributes` para que local y CI coincidan.

- F1: `Date` acepta en silencio fechas imposibles ("2026-02-30T10:00:00Z"); se valida con ida y vuelta por `toISOString`.
- F1: `Intl` acepta zonas sin distinguir mayúsculas; cachear por el texto recibido haría crecer la memoria sin tope.

- F2: `isInt`/`isIn` de express-validator validan cada elemento de un arreglo; `[]` pasa. Hay que exigir el tipo primitivo.
- F2: con `INSERT ... ON CONFLICT DO NOTHING` la transacción no se aborta por la violación única (a diferencia de capturar el error 23505).

## Consultas
- F1: el borde "8:00 p.m. a 6:00 a.m." no está fijado en el enunciado; se toma [20:00, 06:00).

## Ajustes
- F2: las transiciones fuera de orden se registran como anomalía en vez de rechazarse: con eventos desordenados, rechazar dependería del orden de llegada.
- F0: los issues quedaron #5 (F1) a #11 (F0) porque #1 a #4 ya eran PR de Dependabot. Las ramas usan esos números.
