# Mejoras posibles

Priorizadas de mayor a menor impacto. Se completa durante el desarrollo.

| Prioridad | Mejora | Por qué | Esfuerzo |
| --- | --- | --- | --- |
| Media | Fijar la versión de tzdata o registrarla en cada cálculo | La hora local depende del ICU de Node; un cambio de tzdata podría cambiar un cálculo histórico | Bajo |
| Baja | Pasar la distancia como fracción exacta en vez de metros enteros | Hoy hay un redondeo de medición (máx. 0,5 m) antes del redondeo de dinero | Bajo |
