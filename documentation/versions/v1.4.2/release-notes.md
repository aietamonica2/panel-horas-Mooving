# Release Notes v1.4.2 - Mooving Assistant

**Fecha de Lanzamiento**: 16 de Junio de 2026  
**Versión**: v1.4.2  

---

## 📈 Resumen Ejecutivo

La versión v1.4.2 de Mooving Assistant introduce mejoras de consistencia en el modelo de datos y en los sistemas de conocimiento de inteligencia artificial (RAG). Se unifican todas las tareas operativas internas (anteriormente clasificadas bajo el cliente ficticio `Interno`) bajo el cliente único `Mooving`. 

Adicionalmente, se actualiza la Base de Conocimiento RAG de los tres agentes de Senda QA (`router_operaciones_mooving`, `analista_gerencial_mooving`, `qa_datos_mooving`) para reflejar esta nueva jerarquía y asegurar que las respuestas de la IA estén 100% alineadas con el estado actual de la base de datos.

---

## 🚀 Cambios Principales

### 1. Unificación de Cliente 'Interno' bajo 'Mooving'
- Se actualizaron todos los registros históricos en la tabla `time_records` que hacían referencia a `client_id = 'interno'` para apuntar a `client_id = 'mooving'` y `client_name = 'Mooving'`.
- Se migraron los proyectos asociados (`mkt`, `senda`, `tareas-internas`) al cliente `mooving`.
- Se eliminó de forma permanente la entidad de cliente `interno` de la tabla `clients`.

### 2. Adición del Cliente 'DESA'
- Para posibilitar el testing consistente de flujos de staging/QA por la IA, se agregó la entidad de cliente de pruebas `DESA` en la tabla `clients`.

### 3. Actualización RAG en Senda QA (Versión 1.5)
- Se ingirió el nuevo [RAG_GLOSARIO_PROYECTOS_CLIENTES.md](file:///c:/Users/aieta/Documents/Claude/Projects/Dashboard%20Horas%20del%20equipo/RAG_GLOSARIO_PROYECTOS_CLIENTES.md) v1.5 en el almacenamiento de conocimiento vectorial de los tres agentes activos del tenant en Senda QA.
