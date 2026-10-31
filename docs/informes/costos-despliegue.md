# Informe de costos y plan de despliegue en AWS

Estimación de referencia, no una cotización. Precios de lista en us-east-1 consultados en octubre de 2026; otras regiones
suelen costar entre 10 % y 30 % más. Antes de comprometer presupuesto se valida con AWS Pricing Calculator y una prueba de carga.

## Resumen para decidir
| Escenario | Para qué | Costo mensual estimado (USD) |
| --- | --- | --- |
| A. Demo / staging | Pruebas de operaciones y demostraciones | ≈ 80 (sin NAT) |
| B. Producción inicial con alta disponibilidad | 5 a 50 comercios, volumen moderado | ≈ 300 a 400 |
| C. Escala del ADR 0001 | 10.000 eventos/s en pico | No se estima aquí: ver "Escenario C" |

El LLM se cobra aparte (por tokens) y no depende de AWS. Con el nivel gratuito de Gemini la demo cuesta cero, con una salvedad: en ese nivel Google puede usar los datos para mejorar sus modelos, así que solo se usa con datos ficticios; en producción
el gasto se acota con los límites ya implementados (5 pasos por consulta, tokens máximos y rate limit del agente).

## Precios unitarios usados
| Componente | Precio de lista (us-east-1) |
| --- | --- |
| Fargate Linux x86 | $0,04048 por vCPU-hora y $0,004445 por GB-hora (ARM/Graviton: $0,03238 y $0,00356, 20 % menos) |
| RDS PostgreSQL db.t4g.small | $0,032/h (≈ $23,36/mes) en una zona; Multi-AZ ≈ el doble |
| Almacenamiento RDS gp3 | $0,115 por GB-mes |
| Application Load Balancer | $0,0225/h (≈ $16,43/mes) + $0,008 por LCU-hora |
| NAT Gateway | $0,045/h + $0,045 por GB procesado; IPv4 pública $0,005/h |

## Escenario A: demo / staging (≈ USD 80 al mes)
- API: 1 tarea Fargate 0,5 vCPU / 1 GB ≈ 18. Frontend: 1 tarea 0,25 vCPU / 0,5 GB ≈ 9 (o S3 + CloudFront, centavos).
- RDS db.t4g.small, una zona, 30 GB ≈ 28. ALB ≈ 18. Logs, ECR y secretos ≈ 5 (estimado).
- Sin NAT Gateway: subredes públicas con grupos de seguridad cerrados. Con NAT se suman ≈ 33 más el tráfico.
- Ahorro: apagar staging fuera de horario o usar Fargate Spot reduce el cómputo hasta cerca de 70 %.

## Escenario B: producción inicial con alta disponibilidad (≈ USD 300 a 400 al mes)
- API: 2 tareas ARM de 1 vCPU / 2 GB ≈ 58. Frontend en S3 + CloudFront ≈ 5.
- RDS db.t4g.medium Multi-AZ con 100 GB ≈ 105 (estimado a partir de las tarifas anteriores).
- ALB con tráfico moderado ≈ 25. NAT en 2 zonas o endpoints de VPC ≈ 65 o más.
- WAF, CloudWatch, Secrets Manager, ECR y copias ≈ 40 (estimado, no verificado).
- Palancas de ahorro: Graviton (-20 %), Savings Plans o instancias reservadas al estabilizar la carga (RDS 1 año ≈ -27 %),
  dimensionar con métricas reales, retención corta de logs.

## Escenario C: escala del ADR 0001 (no se estima con precisión)
10.000 eventos/s en pico equivalen a 864 millones de eventos al día (≈ 26.000 millones al mes). Con un tamaño supuesto de
0,5 KB por evento serían ≈ 13 TB al mes solo de eventos. El costo lo dominarían el log de eventos particionado, el
almacenamiento y las lecturas analíticas, no el cómputo de la API. Para estimarlo bien hace falta: perfil real de tráfico
(el pico no es el promedio), tamaño real de evento, retención y SLO de latencia. Recomendación: medir en el escenario B,
hacer una prueba de carga y recién entonces dimensionar; los cambios de arquitectura están descritos en el ADR 0001.

## Arquitectura de despliegue propuesta
- Cómputo: ECS Fargate (sin servidores que administrar). EKS se descarta por ahora: agrega costo fijo y carga operativa que
  esta escala no justifica. Lambda no encaja bien con el agente por conexiones y tiempos largos.
- Datos: RDS PostgreSQL privado, cifrado, copias con recuperación a un punto en el tiempo, sin acceso público.
- Red: ALB con TLS (ACM), API solo detrás del balanceador, `trust proxy` activado para el rate limit.
- Secretos: Secrets Manager inyectado como variables de entorno; nunca en la imagen ni en el repositorio.
- CI/CD: GitHub Actions con OIDC hacia AWS (sin llaves de larga duración): lint, tests, audit y gitleaks, build de imagen a
  ECR, job de migraciones y despliegue por tag con rollback al tag anterior. Infraestructura como código (Terraform).
- Entornos: staging y producción separados; migraciones expand/contract para cambios destructivos.

## Operación y riesgos (visión de líder)
| Tema | Decisión o riesgo | Mitigación |
| --- | --- | --- |
| Observabilidad | Sin métricas no hay SLO | Logs estructurados, métricas de ingesta (rechazados, duplicados, anomalías, latencia) y alarmas |
| Disponibilidad | Una zona caída detiene la ingesta | Multi-AZ en base y 2 réplicas de API; reintentos del emisor ya soportados por idempotencia |
| Seguridad | Fuga entre comercios, secretos, prompt injection | Alcance en el servidor, WAF, mínimo privilegio en IAM, escaneo de secretos en CI |
| Datos personales | Nombres, direcciones y teléfonos de clientes y mensajeros | Cumplimiento de la Ley 1581 de 2012: finalidad, consentimiento, retención y control de transferencias a terceros (incluido el proveedor de LLM) |
| Costo del LLM | Crece con el uso | Límites por consulta, caché de respuestas frecuentes, modelo configurable por variable de entorno (`ANTHROPIC_MODEL`, `GEMINI_MODEL`); en producción elegir uno liviano, tablero de gasto |
| Dependencia de proveedor | Cambio de precio o cuota del LLM | Proveedor intercambiable ya implementado (fake, anthropic, gemini) |
| Equipo | Persona única es punto de falla | Runbook, ADR y bitácora ya documentados; guardia rotativa cuando haya equipo |

## Hoja de ruta
- 30 días: staging en AWS, CI/CD con despliegue por tag, métricas y alarmas, revisión de seguridad externa liviana.
- 60 días: producción con alta disponibilidad, tablero de costos por entorno, política de retención y datos personales.
- 90 días: prueba de carga con tráfico real, decisión informada sobre el escenario C (ADR 0001) y presupuesto.

## Fuentes consultadas (octubre de 2026)
- Fargate: https://aws.amazon.com/fargate/pricing/ y https://www.opslyft.com/blog/aws-fargate-pricing-calculator
- RDS PostgreSQL: https://aws.amazon.com/rds/postgresql/pricing y https://infratally.com/articles/aws-rds-pricing-explained-2026/
- Load balancer: https://www.opslyft.com/blog/aws-load-balancer-pricing
- NAT Gateway y VPC: https://cloudburn.io/blog/amazon-vpc-pricing
