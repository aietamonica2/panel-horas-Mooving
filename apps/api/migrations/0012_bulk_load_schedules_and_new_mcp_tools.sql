-- Migration 0012: Bulk load schedules table + new MCP tools registration
-- Created: 2026-06-18
-- Purpose:
--   1. Creates the bulk_load_schedules table for persisting recurring load entries per tenant.
--   2. Registers senda_widget_action and senda_bulk_load in the mcp_tool_catalog.

-- -----------------------------------------------------------------------
-- 1. bulk_load_schedules table
-- Stores per-tenant recurring bulk-load configurations.
-- The cron handler reads from this table every Tuesday at 08:00 UTC.
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bulk_load_schedules (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  company_id      TEXT NOT NULL,
  employee_id     TEXT NOT NULL,
  client_id       TEXT NOT NULL,
  project_id      TEXT NOT NULL,
  description     TEXT NOT NULL DEFAULT 'Carga masiva automática',
  hours_per_day   REAL NOT NULL DEFAULT 4.0,
  -- Repeating window: the cron will use these dates.
  -- Leave end_date NULL to auto-fill with end-of-current-month.
  start_date      TEXT,
  end_date        TEXT,
  -- JSON array of day numbers (0=Sun…6=Sat). NULL means Mon–Fri.
  days_of_week    TEXT,
  is_active       INTEGER NOT NULL DEFAULT 1,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_bulk_load_schedules_company
  ON bulk_load_schedules (company_id, is_active);

-- -----------------------------------------------------------------------
-- 2. Register new MCP tools in the catalog
-- -----------------------------------------------------------------------
INSERT OR IGNORE INTO mcp_tool_catalog (
  name, description_es, description_en, access_type, domain
) VALUES
(
  'senda_widget_action',
  'Reenvía un mensaje en lenguaje natural a la API de Senda AI y retorna la respuesta textual. Útil para consultas conversacionales que necesitan ser pre-procesadas o registradas en el backend.',
  'Forwards a natural-language message to the Senda AI API and returns the text response. Useful for conversational queries that need to be pre-processed or logged by the backend.',
  'read',
  'ai'
),
(
  'senda_bulk_load',
  'Carga masiva de registros de tiempo para un rango de fechas. Permite al widget de Senda o al cron semanal insertar horas de forma automática para un empleado, cliente y proyecto específicos.',
  'Bulk-loads time records for a date range. Allows the Senda widget or the weekly cron to automatically insert hours for a specific employee, client and project.',
  'write',
  'time_records'
);
