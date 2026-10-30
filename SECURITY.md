# Seguridad

## Secretos
- Ningún secreto se versiona. Variables de entorno; `.env` está en `.gitignore`; `.env.example` documenta las claves sin valores reales.
- gitleaks corre en CI sobre todo el historial.

## Datos
- Consultas parametrizadas. El buscador escapa `%` y `_` y limita longitud y filas.
- El acceso se autoriza por comercio en el servidor, dentro de cada consulta y cada tool del agente.

## Agente conversacional
- Solo herramientas de lectura, con alcance impuesto por la sesión (no por el modelo).
- Los textos libres de comercios (notas, instrucciones) son datos no confiables: nunca van al system prompt.
- Límite de pasos y de tokens por conversación.

## Reporte de vulnerabilidades
Contacto: julian.desarrollo@gmail.com
