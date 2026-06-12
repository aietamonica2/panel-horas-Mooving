/**
 * Application version management
 * Updated with each release to track deployments and changelog
 */

export const APP_VERSION = 'v1.0.0'
export const RELEASE_DATE = '12 de Junio de 2026'
export const RELEASE_NOTES = `
v1.0.0 - 12 de Junio de 2026

✨ FEATURES
- Dashboard interactivo con KPIs en tiempo real
- Carga de archivos CSV
- Filtros multi-criterio
- Análisis de distribución de carga
- Disponibilidad mensual por empleado
- Bolsa de horas
- Gráficos dinámicos con Recharts

🏗️ ARCHITECTURAL
- Monorepo structure (apps/web + apps/api)
- React 18 + TypeScript
- Zustand for state management
- TailwindCSS styling
- Vite build tool

🔒 SECURITY
- Multi-tenant ready architecture
- JWT token validation
- Input validation with Zod
- CORS protection
- Tenant isolation in all operations

📚 DOCUMENTATION
- Versioned documentation system
- Architecture guide
- Release notes
- Database schema

Anterior: Versión inicial de HTML estático v0.1.0
`
