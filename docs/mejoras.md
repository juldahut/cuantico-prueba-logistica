# Mejoras posibles

Priorizadas de mayor a menor impacto. Se completa durante el desarrollo.

| Prioridad | Mejora | Por qué | Esfuerzo |
| --- | --- | --- | --- |
| Media | Fijar la versión de tzdata o registrarla en cada cálculo | La hora local depende del ICU de Node; un cambio de tzdata podría cambiar un cálculo histórico | Bajo |
| Baja | Pasar la distancia como fracción exacta en vez de metros enteros | Hoy hay un redondeo de medición (máx. 0,5 m) antes del redondeo de dinero | Bajo |
| Alta | Límite de login por cuenta además de por IP, y `trust proxy` al desplegar detrás de un balanceador | Hoy el límite es solo por IP | Bajo |
| Media | Prueba de arranque que verifique `standard_conforming_strings=on` | El escape de LIKE depende de esa opción de PostgreSQL | Bajo |
| Media | Verificar que cada monto de la respuesta corresponda al comercio y la moneda correctos | Hoy se verifica que la cifra exista en los datos, no a qué dato pertenece | Medio |
| Media | Probar el proveedor Anthropic con un conjunto de preguntas de evaluación | Solo se probó con el modelo simulado | Medio |
| Baja | Actualizar dependencias con avisos moderados (`uuid` vía sequelize, `deepmerge` vía jest) | `npm audit` sin altos, pero con moderados de dependencias transitivas | Bajo |
