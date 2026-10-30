# Registro de riesgos

| Riesgo | Prob. | Impacto | Mitigación | Dueño |
| --- | --- | --- | --- | --- |
| Sobrealcance y entrega a medias | Alta | Alto | Núcleo primero; lo demás es opcional | Julián |
| Secreto filtrado en el historial de Git | Baja | Crítico | `.gitignore`, gitleaks, revisión del historial | Julián |
| El agente devuelve datos de otro comercio | Media | Crítico | Alcance impuesto por el servidor; test con la nota hostil | Julián |
| No poder defender código generado por IA | Media | Alto | Revisar cada diff, `ai-log` veraz, ensayo | Julián |
| Fecha límite en riesgo | Media | Alto | Entregar el sábado; el domingo es colchón | Julián |
| El revisor no logra levantar el proyecto | Baja | Alto | Un solo comando, verificado en clon limpio | Julián |
| `POST /events` y `GET /anomalies` sin autenticación entre las fases 2 y 3 | Alta (temporal) | Alto | Solo en ramas de desarrollo; la fase 3 agrega JWT y autorización por comercio antes de cualquier entrega | Julián |
