-- Fix NULL IDs from previous migration
UPDATE mcp_tool_catalog SET id = name WHERE id IS NULL;

-- Insert any missing legacy tools
INSERT OR IGNORE INTO mcp_tool_catalog (id, name, access_type, domain, description_es, description_en) VALUES
  ('write_time_records', 'write_time_records', 'write', 'time', 'Registrar horas trabajadas', 'Log worked hours'),
  ('get_time_records', 'get_time_records', 'read', 'time', 'Obtener registros de horas', 'Get time records'),
  ('parse_natural_language_hours', 'parse_natural_language_hours', 'write', 'time', 'Analizar y registrar horas desde texto', 'Parse and log hours from text'),
  ('sync_clockify_hours', 'sync_clockify_hours', 'write', 'integrations', 'Sincronizar Clockify', 'Sync Clockify'),
  ('sync_zendesk_tickets', 'sync_zendesk_tickets', 'write', 'integrations', 'Sincronizar Zendesk', 'Sync Zendesk'),
  ('audit_timesheet', 'audit_timesheet', 'read', 'audit', 'Auditar horas', 'Audit timesheet'),
  ('send_inactivity_alerts', 'send_inactivity_alerts', 'write', 'alerts', 'Enviar alertas de inactividad', 'Send inactivity alerts'),
  ('get_availability_metrics', 'get_availability_metrics', 'read', 'time', 'Métricas de disponibilidad', 'Availability metrics');
