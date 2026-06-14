INSERT INTO mcp_tool_catalog (id, name, access_type, domain, description_es, description_en)
VALUES (
  'get_employee_insights',
  'get_employee_insights', 
  'read', 
  'time', 
  'Obtener analítica de un empleado (horas cargadas, faltantes y promedio)', 
  'Get employee analytics (logged hours, gap and average)'
);

-- Grant permission to known MCP users
INSERT OR IGNORE INTO mcp_user_permissions (mcp_user_id, tool_id, company_id) VALUES
  ('aieta', 'get_employee_insights', 'mooving-default'),
  ('operaciones-mooving', 'get_employee_insights', 'mooving-default');
