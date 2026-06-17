-- 0010_add_create_time_record_mcp.sql
-- Inserción de la nueva herramienta en el catálogo
INSERT OR IGNORE INTO mcp_tool_catalog (id, name, access_type, domain, description_es, description_en)
VALUES ('create_time_record', 'create_time_record', 'write', 'time', 'Crear directamente un nuevo registro de horas para un empleado.', 'Directly create a new time log record for an employee.');

-- Asignación de permisos a todos los usuarios MCP existentes
INSERT OR IGNORE INTO mcp_user_permissions (mcp_user_id, tool_id, company_id)
SELECT DISTINCT mcp_user_id, 'create_time_record', company_id FROM mcp_user_permissions;
