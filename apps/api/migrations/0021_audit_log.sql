-- Migration 0021: Audit log ("quién cambió qué y cuándo") + MCP tool get_audit_log
-- Created: 2026-08-01
--
-- Registra cada cambio relevante (create/update/delete) hecho por un usuario:
-- altas/ediciones/bajas de registros de horas (REST y MCP), aprobaciones y
-- rechazos, cambios de valor hora y de plantillas de email. Las filas las
-- escribe el helper logAudit() (src/lib/audit.ts), que es best-effort: un fallo
-- de auditoría nunca rompe la operación auditada.
--
-- Multi-tenant: company_id viene SIEMPRE del principal autenticado (MT-02).
-- Idempotente: CREATE TABLE/INDEX IF NOT EXISTS + INSERT OR IGNORE.

-- 1. Tabla de auditoría
CREATE TABLE IF NOT EXISTS audit_logs (
  id         TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  actor_id   TEXT,
  actor_name TEXT,
  actor_role TEXT,
  action     TEXT NOT NULL,             -- 'create' | 'update' | 'delete'
  entity     TEXT NOT NULL,             -- p.ej. 'time_record', 'employee', 'email_template'
  entity_id  TEXT,
  summary    TEXT,                      -- resumen corto legible del cambio
  created_at TEXT DEFAULT (datetime('now'))
);

-- Lectura típica: últimas N entradas del tenant ordenadas por fecha.
CREATE INDEX IF NOT EXISTS idx_audit_logs_company_created ON audit_logs(company_id, created_at);

-- 2. Registrar la nueva MCP tool en el catálogo (mismo patrón que 0020, con id
--    explícito como en 0010+ para no dejar id NULL).
INSERT OR IGNORE INTO mcp_tool_catalog (
  id, name, access_type, domain, description_es, description_en
) VALUES (
  'get_audit_log',
  'get_audit_log',
  'read',
  'audit',
  'Devuelve el historial de auditoria (quien cambio que y cuando) de la empresa del usuario, ordenado del mas reciente al mas antiguo, con filtros opcionales por entidad y accion. Solo administradores.',
  'Returns the audit trail (who changed what and when) for the caller company, newest first, with optional entity and action filters. Admins only.'
);
