-- Migration 0014: Employee Aliases for Zendesk and Clockify Mapping
CREATE TABLE IF NOT EXISTS employee_aliases (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'mooving-default',
  alias_email TEXT NOT NULL,
  alias_name TEXT,
  employee_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id)
);

CREATE INDEX IF NOT EXISTS idx_employee_aliases_email ON employee_aliases(company_id, alias_email);

-- Register new MCP tools in mcp_tool_catalog
INSERT OR IGNORE INTO mcp_tool_catalog (name, description_es, description_en, access_type, domain) VALUES
  ('get_unlinked_external_users', 'Obtiene la lista de usuarios/emails externos de Zendesk o Clockify que no están vinculados a un empleado.', 'Get list of external users/emails from Zendesk or Clockify not linked to an employee.', 'read', 'admin'),
  ('link_external_user', 'Asocia un email/alias de Zendesk o Clockify a un empleado del sistema.', 'Associate a Zendesk or Clockify email/alias to a system employee.', 'write', 'admin');
