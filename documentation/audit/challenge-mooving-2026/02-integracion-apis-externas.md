# 2. Integración de APIs Externas (Sincronización Zendesk)

**Fecha de Generación:** 2026-06-13
**Versión:** 1.0.0

---

## 2.1 El Desafío

En las etapas iniciales de desarrollo de la plataforma, las funciones orquestadas por el agente de Inteligencia Artificial (Senda) consumían datos de prueba ("mocks") estáticos. El desafío para asegurar la viabilidad técnica del Panel de Operaciones consistía en reemplazar estos datos estáticos por conexiones productivas, seguras y asíncronas con plataformas corporativas de terceros.

Como prueba de concepto y demostración técnica principal para el Challenge, elegimos conectar nuestra herramienta MCP `sync_zendesk_tickets` con la **API REST oficial de Zendesk**.

---

## 2.2 Estrategia de Implementación

La integración no ocurre directamente desde el navegador web del usuario, sino que se enruta de manera segura a través de nuestro Worker de Cloudflare, cumpliendo estrictas normas de seguridad:

### 1. Gestión de Secretos
Se eliminó la codificación en duro (hardcoding) de credenciales. Las conexiones se realizan inyectando variables de entorno seguras (`ZENDESK_SUBDOMAIN`, `ZENDESK_EMAIL`, `ZENDESK_API_TOKEN`) desde el archivo local `.dev.vars` (en desarrollo) y desde los Cloudflare Secrets (en producción).

### 2. Flujo de Autenticación
Zendesk utiliza autenticación básica codificada en Base64. El backend construye el token automáticamente inyectando `/token` al email del administrador y adjuntando la clave de API generada en el Centro de Administración de Zendesk.

### 3. Petición y Procesamiento
- **Búsqueda Avanzada:** Para optimizar recursos, no descargamos todos los tickets de la cuenta. Hacemos un llamado específico al endpoint de búsqueda (`GET /api/v2/search.json?query=type:ticket status:solved`) para aislar solo aquellos tickets que ya están cerrados y requieren imputación de horas.
- **Normalización:** La API de Zendesk responde con una estructura compleja (JSON). Nuestro backend intercepta esta respuesta, extrae el ID, el asunto y la fecha de actualización del ticket, e infiere que un ticket estándar equivale a 1 hora de soporte (`duration_decimal = 1.0`).
- **Almacenamiento Seguro (Upsert):** Se utiliza una instrucción SQL `INSERT OR IGNORE` contra nuestra base de datos Cloudflare D1. Esto nos permite ejecutar la herramienta múltiples veces en el mismo día sin duplicar las métricas financieras de la compañía.

---

## 2.3 Resumen de la Ejecución de la Acción

Cuando el usuario aprueba la sincronización desde el Chat de Senda, ocurre lo siguiente bajo la superficie:

1. El usuario envía el comando: *"Senda, sincroniza los tickets de soporte"*.
2. Senda traduce esto en un Action Exec (MCP tool) hacia nuestro Worker.
3. El Worker de Hono valida el JWT de la sesión.
4. El Worker extrae los secretos locales y lanza un `fetch()` asíncrono a Zendesk.
5. El Worker escribe los nuevos registros en D1.
6. El Worker le devuelve a Senda el conteo exacto de horas insertadas.
7. Senda formula la respuesta final para el usuario: *"Horas de soporte importadas correctamente"*.
8. Los gráficos del Dashboard (React) se re-renderizan mostrando la nueva rentabilidad.

---

[← Anterior: Arquitectura y Tecnología](./01-arquitectura-y-tecnologia.md) | [Volver al Índice](./index.md) | [Siguiente: Visión Estratégica Mooving Assistant →](./03-vision-mooving-assistant.md)
