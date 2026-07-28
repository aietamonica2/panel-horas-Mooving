-- Migration 0013: Email Reminder Settings and MCP Tools Registration
-- Created: 2026-07-27

-- 1. Email Reminder Settings Table
CREATE TABLE IF NOT EXISTS email_reminder_settings (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  company_id      TEXT NOT NULL UNIQUE,
  default_cc      TEXT NOT NULL DEFAULT 'Eddie Rodriguez Von der Becke <eddie.rodriguez@moovingtech.com>; Julieta Albina <julieta.albina@moovingtech.com>',
  is_automated    INTEGER NOT NULL DEFAULT 0,
  cron_schedule   TEXT DEFAULT '0 9 27 * *',
  last_sent_at    TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_email_reminder_settings_company
  ON email_reminder_settings (company_id);

-- 2. Register MCP Tools in Catalog
INSERT OR IGNORE INTO mcp_tool_catalog (
  name, description_es, description_en, access_type, domain
) VALUES
(
  'get_email_reminder_drafts',
  'Genera borradores de mails personalizados de recordatorio de horas para todos los empleados activos del tenant, indicando sus horas acumuladas o reclamando carga si están en cero.',
  'Generates personalized email reminder drafts for all active employees of the tenant, detailing accumulated hours or requesting logging if zero.',
  'read',
  'time_records'
),
(
  'send_email_reminders',
  'Ejecuta el envío de recordatorios de horas por mail a los destinatarios seleccionados.',
  'Sends time tracking email reminders to selected recipients.',
  'write',
  'time_records'
),
(
  'configure_email_reminder_schedule',
  'Configura la automatización y copias (CC) por defecto para el envío periódico de recordatorios de horas.',
  'Configures automated email reminder schedules and default CC settings.',
  'write',
  'settings'
);
