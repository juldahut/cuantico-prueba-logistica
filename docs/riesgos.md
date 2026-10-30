# Registro de riesgos

| Riesgo | Prob. | Impacto | Mitigación | Dueño |
| --- | --- | --- | --- | --- |
| Sobrealcance y entrega a medias | Alta | Alto | Núcleo primero; lo demás es opcional | Julián |
| Secreto filtrado en el historial de Git | Baja | Crítico | `.gitignore`, gitleaks, revisión del historial | Julián |
| El agente devuelve datos de otro comercio | Media | Crítico | Alcance impuesto por el servidor; test con la nota hostil | Julián |
| No poder defender código generado por IA | Media | Alto | Revisar cada diff, `ai-log` veraz, ensayo | Julián |
| Fecha límite en riesgo | Media | Alto | Entregar el sábado; el domingo es colchón | Julián |
| El revisor no logra levantar el proyecto | Baja | Alto | Un solo comando, verificado en clon limpio | Julián |
| `POST /events` y `GET /anomalies` sin autenticación entre las fases 2 y 3 | Alta (temporal) | Alto | Mitigado en la fase 3: JWT y autorización por comercio en todas las rutas salvo `/health` y `/auth/login` | Julián |
| Prompt injection por textos de comercios (notas, nombres, direcciones) | Media | Crítico | System prompt fijo; textos saneados y delimitados; alcance en cada tool; verificación de cifras; tests con un modelo que obedece la nota | Julián |
| El proveedor real del agente se comporta distinto al simulado | Media | Medio | Mismas tools y límites para ambos; el servidor impone el alcance; pendiente un conjunto de evaluación (docs/mejoras.md) | Julián |
| La hora local depende del tzdata de Node | Baja | Medio | Imagen con versión de Node fijada; anotado en docs/mejoras.md | Julián |
| Dependencias con avisos moderados (uuid, deepmerge) | Media | Bajo | `npm audit --audit-level=high` en CI; actualizar cuando haya versión sin cambios incompatibles | Julián |
