/**
 * APP_VERSION — ÚNICA fuente de verdad de la versión del API.
 *
 * Todos los lugares que reportan versión (root endpoint, handlers 404/500,
 * routes/data.ts, routes/health.ts) importan esta constante. Mantener en sync
 * con el archivo /VERSION de la raíz del repo al cortar una release.
 */
export const APP_VERSION = '2.6.0'
