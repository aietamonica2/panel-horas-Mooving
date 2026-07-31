-- Migration 0020: Editable Email Templates ("mensajes estándar") per case + MCP Tools
-- Created: 2026-07-31
--
-- Adds a per-tenant, per-case editable email template store. Each tenant may
-- override the subject/body of the three standard messages (reminder_hours,
-- reminder_zero, inactivity). When no override row exists the code falls back to
-- the DEFAULT_TEMPLATES defined in src/mcp/email_templates.ts.
--
-- Multi-tenant: company_id always comes from the authenticated principal, never
-- from the request body. UNIQUE(company_id, template_key) enforces one override
-- per case per tenant (upsert target of set_email_template).

-- 1. Editable email templates table
CREATE TABLE IF NOT EXISTS email_templates (
  id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  company_id   TEXT NOT NULL,
  template_key TEXT NOT NULL,
  subject      TEXT NOT NULL,
  body         TEXT NOT NULL,
  updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (company_id, template_key)
);

CREATE INDEX IF NOT EXISTS idx_email_templates_company ON email_templates(company_id);

-- 2. Register the two new MCP tools in the catalog (mirrors 0013).
INSERT OR IGNORE INTO mcp_tool_catalog (
  name, description_es, description_en, access_type, domain
) VALUES
(
  'get_email_templates',
  'Devuelve los mensajes estandar editables (asunto y cuerpo) por caso para la empresa del usuario: recordatorio con horas, recordatorio sin horas y alerta de inactividad, indicando si cada uno usa el texto por defecto o un texto personalizado.',
  'Returns the editable standard email templates (subject and body) per case for the caller company: hours reminder, zero-hours reminder and inactivity alert, flagging whether each one uses the default or a custom text.',
  'read',
  'settings'
),
(
  'set_email_template',
  'Guarda (crea o actualiza) el texto personalizado de un mensaje estandar (asunto y cuerpo) para la empresa del usuario. Solo administradores.',
  'Saves (creates or updates) the custom text of a standard email template (subject and body) for the caller company. Admins only.',
  'write',
  'settings'
);
