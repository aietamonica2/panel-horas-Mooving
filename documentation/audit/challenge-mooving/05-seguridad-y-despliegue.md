# 05. Seguridad y Despliegue

La seguridad de datos y la escalabilidad del sistema están enmarcadas por estrictas normativas (Security Guidelines) propias de la arquitectura y la gobernanza de IA de Senda.

## Aislamiento Multi-Tenant

Al tratarse de una plataforma B2B concebida para servir a múltiples organizaciones bajo una misma infraestructura, se estableció el patrón de diseño Multi-Tenant:
- Toda entidad dentro de Cloudflare D1 incluye el campo mandatorio `company_id`.
- Es **imposible** ejecutar una mutación de datos (`INSERT`, `UPDATE`, `DELETE`) o lectura (`SELECT`) a través del backend sin inyectar en la cláusula WHERE el `company_id` asociado a la sesión o token del invocador.
- Para este proyecto, se operó exclusivamente sobre el entorno y tenant `mooving-default`.

## Seguridad del Servidor MCP

El endpoint MCP expuesto para Senda (`/api/mcp/u/:user/tools/call`) se protegió mediante mecanismos de validación:
- **Autenticación Bearer**: Las Acciones HTTP de Senda QA operan portando un token de autorización configurado en los Headers (`Bearer mooving2025`). El backend valida este token en su capa de middleware, rechazando de manera fulminante solicitudes sin credenciales (`401 Unauthorized`).
- **Validación de Payload**: El Body de las peticiones es escrutado. Cada Tool llamada (ej. `audit_timesheet`) exige que su parámetro estructurado (ej. `{ "company_id": "..." }`) esté presente y sea un identificador válido.
- **RBAC Governance**: En producción, cada IA opera con un `mcp_user_id` estricto y aislado, validando contra la tabla `mcp_user_permissions` para garantizar que no ejecute una Tool para la que no tiene privilegios explícitos (`access_type` 'read' vs 'write').

## Política CORS y Edge Deployment

El frontend SPA (Vite) y el backend API (Hono) se despliegan en dominios distintos dentro de Cloudflare.
- **CORS Handling**: Se implementó una política de CORS rigurosa en Hono para admitir tráfico desde dominios permitidos (los entornos locales de Vite y los subdominios de Cloudflare Pages).
- **Despliegue Serverless**: La aplicación Backend utiliza la infraestructura **Cloudflare Workers**. Esta elección elimina la necesidad de gestionar contenedores o Kubernetes, garantizando latencias mínimas globales mediante la ejecución de la lógica (y la validación de tokens Senda) directamente en el edge.

---
> [Anterior: Integración Senda y MCP](./04-integracion-senda-mcp.md) | [Volver al Índice](./index.md) | [Siguiente: Conclusiones](./06-conclusiones.md)

*Versión documentada: v1.0.5 · Fecha de generación: 2026-06-13*
