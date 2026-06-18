-- 0011_add_bulk_time_records_mcp.sql
-- Registrar herramienta create_bulk_time_records
INSERT OR IGNORE INTO mcp_tool_catalog (id, name, access_type, domain, description_es, description_en)
VALUES (
  'create_bulk_time_records',
  'create_bulk_time_records',
  'write',
  'time',
  'Permite insertar múltiples registros de horas (bulk) usando un rango de fechas o días de la semana, útil para cargas masivas, recurrentes o semanales. Usalo SIEMPRE que te pidan cargar muchas horas o todos los dias hasta una fecha.',
  'Allows inserting multiple time records (bulk) using a date range or days of the week, useful for mass, recurring or weekly logging.'
);

-- Asignar permiso a los usuarios MCP existentes
INSERT OR IGNORE INTO mcp_user_permissions (mcp_user_id, tool_id, company_id)
SELECT DISTINCT mcp_user_id, 'create_bulk_time_records', company_id FROM mcp_user_permissions;
