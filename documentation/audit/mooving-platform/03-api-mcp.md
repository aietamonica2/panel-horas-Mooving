# Referencia de API y Servidor MCP

Senda AI es el corazón analítico y transaccional autónomo del Panel de Horas Mooving. La plataforma expone un **Servidor MCP** (Model Context Protocol) que permite a la IA interactuar con la base de datos D1 de forma segura y estructurada.

## 1. Integración con Senda AI
Senda consume los endpoints de la API a través del puente habilitado en `apps/api/src/mcp/server.ts`. 
Todas las llamadas realizadas por la IA ocurren bajo el endpoint protegido `/api/mcp/call`.
Para evitar bloqueos por expiración de sesión (JWT) de humanos, el middleware aplica un *bypass explícito* para las rutas `/api/mcp`, validando en su lugar la **API Key** otorgada al servicio de Senda.

## 2. Gobernanza de Permisos (Default Deny)
Senda no tiene acceso omnipotente. El acceso a cada herramienta está gobernado por:
- `mcp_tool_catalog`: Registro de cada herramienta existente (`read` o `write`).
- `mcp_user_permissions`: Vínculo explícito que otorga acceso a un usuario MCP (Senda) hacia una herramienta. Si el permiso no existe, la petición se bloquea a nivel base de datos.

## 3. Catálogo de Herramientas MCP
Actualmente la API expone 16 herramientas diseñadas para la autonomía de Senda:

### 3.1. Procesamiento Natural
- `parse_natural_language_hours`: Analiza strings crudos (ej: "4 horas en YPF") y extrae la intención, buscando difusamente en la base de datos el `employee_id`, `project_id`, `client_id` y normalizando los datos para la inserción.

### 3.2. Gestión Transaccional (Time Records)
- `get_hours_status`: Retorna el estado total de horas registradas.
- `create_time_record`: Ingresa un registro formal de tiempo validado en D1.

### 3.3. Entidades Base (CRUD Senda)
Senda tiene permisos plenos para administrar el entorno maestro:
- **Clientes**: `list_clients`, `create_client`, `update_client`, `delete_client`.
- **Proyectos**: `list_projects`, `create_project`, `update_project`, `delete_project`.
- **Categorías**: `list_categories`, `create_category`, `update_category`, `delete_category`.
- **Empleados**: `list_employees`, `create_employee`, `update_employee`, `delete_employee`.

*Cualquier inserción por parte de Senda deja una traza auditable ("Registrado por Senda Core").*
