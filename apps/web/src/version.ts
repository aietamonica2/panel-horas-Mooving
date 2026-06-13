/**
 * Application version management
 * Updated with each release to track deployments and changelog
 */

export const APP_VERSION = 'v1.0.1'
export const RELEASE_DATE = '12 de Junio de 2026'
export const RELEASE_NOTES = `
v1.0.1 - 12 de Junio de 2026

🐛 FIXES
- Se resolvieron los problemas de inicialización del esquema en Cloudflare D1.
- Se conectó la API para recuperar los registros existentes en base de datos.
- Se solucionó la desincronización de company_id/tenant entre la base de datos (semilla) y el middleware de autenticación del API.
- Se integró la subida de archivos CSV directamente a la base de datos D1 del Workers.
- Se habilitó la carga de horas manuales (Quick Log) conectada al backend real.
- Corrección de errores en pruebas unitarias del backend en entornos de test sin variables de entorno definidas.

Anterior: Versión inicial v1.0.0
`
