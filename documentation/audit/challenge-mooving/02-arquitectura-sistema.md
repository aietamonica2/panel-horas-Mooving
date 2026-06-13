# 02. Arquitectura del Sistema

El proyecto "Panel de Horas Mooving" sigue las *Tramia Architecture Guidelines*, implementando un enfoque monorepo organizado mediante NPM Workspaces. Este enfoque garantiza la separación de responsabilidades y facilita el desarrollo y despliegue unificado.

## Monorepo y NPM Workspaces

La estructura del código base está dividida lógicamente en:

- `apps/web/`: Contiene la aplicación web frontend.
- `apps/api/`: Contiene el backend, la API REST y el Servidor MCP.
- `documentation/`: Concentra todo el conocimiento estructural, de auditoría y directivas para IA.

## Componente Frontend (`apps/web/`)

Construido como una Single Page Application (SPA), el frontend se encarga exclusivamente de la capa de presentación y la interacción con el usuario.

- **Framework Core**: Vue 3 (Composition API) impulsado por Vite, ofreciendo tiempos de compilación extremadamente rápidos y un entorno de desarrollo eficiente.
- **Enrutamiento y Estado**: Utiliza `vue-router` para la navegación y `pinia` para el manejo centralizado del estado.
- **Estilos**: Tailwind CSS se emplea como única fuente de diseño, asegurando componentes modulares, estéticas premium y facilidades nativas para modos oscuros y micro-interacciones (glassmorphism, transiciones).

## Componente Backend (`apps/api/`)

El backend opera como un servicio Serverless altamente escalable, diseñado para responder a la SPA y servir a agentes de IA mediante el protocolo MCP.

- **Framework Core**: Hono (framework ultra-ligero y rápido para entornos edge).
- **Entorno de Ejecución**: Cloudflare Workers, garantizando latencias mínimas y escalabilidad global automática.
- **Endpoints**:
  - Rutas REST tradicionales para el consumo de datos desde el dashboard.
  - El endpoint `/api/mcp/u/:user/tools/call`, el cual implementa el Model Context Protocol para que IA externas (Senda) consuman herramientas (tools).

## Persistencia de Datos (Cloudflare D1)

La base de datos subyacente es Cloudflare D1 (SQLite en el Edge). El modelo de datos y el acceso siguen reglas estrictas:

- **Migraciones Formales**: Todo cambio estructural se realiza mediante comandos `wrangler d1 migrations` y se documenta en esquemas SQL (`schema.sql`).
- **Aislamiento Multi-Tenant (CRITICAL)**: Es imperativo el uso de la columna `company_id`. En este challenge, todas las consultas y mutaciones de datos inyectan estrictamente `company_id = 'mooving-default'` en las cláusulas `WHERE`, garantizando la seguridad perimetral de los datos de Mooving frente a hipotéticos futuros clientes (Tenants) del panel.

---
> [Anterior: Introducción](./01-introduccion.md) | [Volver al Índice](./index.md) | [Siguiente: Desarrollo del Frontend](./03-desarrollo-frontend.md)

*Versión documentada: v1.0.5 · Fecha de generación: 2026-06-13*
