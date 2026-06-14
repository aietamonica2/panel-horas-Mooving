# Registro de Cambios Arquitectónicos y Funcionales (Contexto para Plan de Pruebas)

Hola Claude. Este documento fue generado para proveerte de contexto actualizado sobre todas las integraciones recientes que conforman el estado actual de la plataforma "Panel de Operaciones Mooving". Con esta información podrás trazar un plan de pruebas exhaustivo (End-to-End, Integración y Unitarias).

## 1. Arquitectura Base y Base de Datos (Cloudflare D1)
- El proyecto migró de un almacenamiento estático/mockeado a una base de datos relacional **Cloudflare D1** (`panel-mooving-v1`).
- **Tablas principales creadas:**
  - `time_records`: Almacena los registros de horas (`employee_id`, `client_id`, `project_id`, `duration_decimal`, `work_type`, `description`).
  - Tablas maestras de entidades: `clients`, `projects`, `employees`.
- Las APIs del backend (Hono + Workers) ahora leen y escriben directamente contra D1 utilizando validación fuerte con **Zod** (`zValidator`).

## 2. Integración de Inteligencia Artificial (Senda AI y MCP)
Se ha integrado fuertemente Senda AI en el sistema operativo del equipo.
- **Servidor MCP (Model Context Protocol):**
  - Ubicado en `apps/api/src/mcp/server.ts`.
  - Herramientas expuestas para los Agentes IA: `get_employees`, `get_clients`, `get_projects`, `get_time_records`, `parse_natural_language_hours`, `get_employee_insights`, `sync_clockify_hours`, etc.
  - Esto permite que la IA consulte la base de datos de manera autónoma y extraiga métricas.
- **Widget Senda Chat (Frontend):**
  - Componente web `<senda-chat>` inyectado a nivel raíz (`App.tsx`), configurado con el space `tramia`.

## 3. Carga Rápida de Horas (Procesamiento NLP)
- **Componente `QuickLogModal.tsx`**: Un nuevo modal que permite a los usuarios:
  1. **Carga Manual:** Con menús desplegables.
  2. **Carga Senda AI:** Escribir en lenguaje natural (ej: *"Fede trabajó 3 horas en Mooving arreglando bugs"*), lo que hace un POST al MCP (`parse_natural_language_hours`) que extrae estructuradamente el JSON y lo guarda.
- **Entidades Dinámicas:** Los *dropdowns* del modal y del Dashboard ahora se autocompletan llamando al servidor MCP (`api.callMcpTool('get_clients')`, etc.), en lugar de usar arrays hardcodeados.

## 4. Mejoras en "Mis Horas" (`MyTime.tsx`)
- Se implementó la vista individual para empleados, donde ven un dashboard personal (sus horas cargadas en el mes vs las esperadas).
- Se incrustó el botón de "Carga Rápida" para que tengan acceso al bot de Senda para NLP.
- Se implementó lógica **RBAC** (Role-Based Access Control) desde el Frontend hasta el API: un empleado común no puede cargar ni editar horas a nombre de otro usuario, solo un `admin` puede hacerlo.

## 5. Mapeo Inteligente de Archivos CSV
- **Componente `Dashboard.tsx`:** La función de importación masiva de CSV (proveniente de Clockify) fue refactorizada.
- Ahora, antes de subir el CSV, el sistema descarga de la DB los diccionarios de Clientes, Empleados y Proyectos. Luego, **compara los Nombres** que vienen en texto plano en el CSV, y los asocia automáticamente con sus `IDs` correctos de la D1, evitando inconsistencias y registros huérfanos.

## 6. Correcciones y Limpieza de Datos (Data Hygiene)
- Se corrigieron métricas en el Dashboard (el totalizador de horas usaba la métrica entera y descartaba los minutos; ahora usa `duration_decimal`).
- Se realizó una auditoría de horas y una purga en producción:
  - Eliminación de registros con fechas futuras (> 10-06-2026).
  - Recategorización automática de tickets de "error" hacia el `work_type = 'other'` (Soporte Zendesk) para sanear las métricas de rentabilidad de proyecto.

## 7. Variables Dinámicas de Entorno
- La versión de la aplicación ahora se expone dinámicamente en el Login leyendo el archivo raíz `VERSION` durante el proceso de *build* de Vite (vía `vite.config.ts`), garantizando sincronía entre los tags del repositorio y la interfaz de usuario.

---
**Nota para Claude:** Considera en tu plan de pruebas cubrir exhaustivamente el flujo de NLP (Procesamiento de Lenguaje Natural) para la carga de horas, los guards de RBAC en el backend de Hono, y el correcto guardado de datos en D1 SQLite.
