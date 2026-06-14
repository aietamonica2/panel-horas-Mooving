# Documentación Técnica y Arquitectura

El sistema está construido bajo una arquitectura moderna orientada a la escalabilidad en la nube de Cloudflare. Se basa en el ecosistema **NPM Workspaces (Monorepo)**, segmentando responsabilidades en dos áreas: Frontend y Backend.

## 1. Stack Tecnológico Frontend (`apps/web`)
- **Core**: React 18 + TypeScript + Vite.
- **Routing**: `react-router-dom` para navegación fluida SPA.
- **Styling**: TailwindCSS 3, integrando plugins avanzados como `@tailwindcss/typography`.
- **Iconografía**: `lucide-react`.
- **Despliegue**: Alojado en **Cloudflare Pages** (`https://panel-horas-mooving.pages.dev`).

## 2. Stack Tecnológico Backend (`apps/api`)
- **Core**: Hono Framework optimizado para Edge Computing.
- **Runtime**: Cloudflare Workers.
- **Base de Datos**: Cloudflare D1 (SQLite distribuido), garantizando ultra-baja latencia en el borde.
- **Seguridad**: Autenticación mediante JWT (JSON Web Tokens) gestionados en middlewares custom (`src/middleware/auth.ts`).

## 3. Esquema de Base de Datos D1
El esquema relacional central está diseñado en base al aislamiento estricto de multitenancy (`company_id` obligatorio) y soporte de control de acceso. Entidades principales:
- `users`: Usuarios y administradores del sistema.
- `clients`: Catálogo de clientes registrados (ABM Senda).
- `projects`: Catálogo de proyectos amarrados a un `client_id`.
- `categories`: Tipos de trabajo imputables (desarrollo, soporte, etc).
- `employees`: Nómina de empleados habilitados para imputar horas.
- `time_records`: La tabla transaccional masiva que registra cada bloque de horas, relacionada a un empleado, un proyecto y una categoría.
- `mcp_tool_catalog` / `mcp_user_permissions`: Gobernanza de seguridad que determina qué endpoints MCP pueden ser llamados por qué API Key.

## 4. Control de Cambios y Versionado
Todo despliegue productivo debe estar acompañado de un incremento en el archivo `VERSION` de la raíz del proyecto, y una entrada correspondiente en el `CHANGELOG.md`. Las versiones siguen Semantic Versioning (SemVer).
