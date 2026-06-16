# Architecture Document v1.4.2 - Mooving Assistant

**Versión**: v1.4.2  
**Última Revisión**: 16 de Junio de 2026  

---

## 🏗️ Cambios Arquitectónicos y de Base de Datos

Esta versión no introduce nuevas tablas ni cambios en el DDL de la base de datos (por lo tanto, el archivo master [schema.sql](file:///C:/Users/aieta/Documents/panel-horas-Mooving/db/schema.sql) permanece sin cambios). Sin embargo, aplica una migración de datos (DML) para consolidar las relaciones de entidades históricas.

### 1. Migración D1: `0009_merge_interno_client.sql`
La migración ejecuta las siguientes consultas de forma transaccional en el motor SQLite/D1:

```sql
-- 1. Unificar registros de tiempo
UPDATE time_records 
SET client_id = 'mooving', 
    client_name = 'Mooving' 
WHERE client_id = 'interno' 
  AND company_id = 'mooving-default';

-- 2. Actualizar propiedad de proyectos
UPDATE projects 
SET client_id = 'mooving' 
WHERE client_id = 'interno' 
  AND company_id = 'mooving-default';

-- 3. Eliminar cliente obsoleto
DELETE FROM clients 
WHERE id = 'interno' 
  AND company_id = 'mooving-default';

-- 4. Registrar cliente de pruebas DESA
INSERT OR IGNORE INTO clients (id, company_id, name, industry, is_active)
VALUES ('desa', 'mooving-default', 'DESA', 'Desarrollo / Interno', 1);
```

### 2. Integración de Conocimiento RAG (Senda API)
El proceso de actualización RAG se realiza de forma directa mediante la REST API de Senda QA:
- **Endpoint**: `POST https://sendaqa.telar.ai/api/v1/knowledge/ingest`
- **Payload**:
  ```json
  {
    "agent_id": "string",
    "filename": "RAG_GLOSARIO_PROYECTOS_CLIENTES.md",
    "content": "string"
  }
  ```
- **Agentes Actualizados**:
  - `1781358000813` (Router)
  - `1781358147611` (Analista)
  - `1781358250595` (QA Datos)
