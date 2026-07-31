-- Cloudflare D1 Database Schema (CONSOLIDATED BASELINE)
-- Panel de Operaciones Mooving
-- Multi-tenant SQLite Database
--
-- This file is the SINGLE SOURCE OF TRUTH for a fresh D1 bootstrap. It reflects
-- the EXACT accumulated structure after applying every migration in
-- apps/api/migrations/0002..0019 on top of the original base tables.
--
-- production database that was bootstrapped from the original schema.sql and then
-- migrated. See db/MIGRATIONS_NOTES.md for the drift history and bootstrap steps.
--
-- Reflects migrations 0002..0019.
--
-- Conventions:
--   * All tables use CREATE TABLE IF NOT EXISTS and all indexes CREATE INDEX
--     IF NOT EXISTS, so this whole file is idempotent / re-runnable.
--   * Every operational table carries company_id for multi-tenant isolation.
--
-- Structural deltas folded in from migrations (vs. the older schema.sql):
--   * time_records.source            (0003 / 0004)  + idx_time_records_project (0004)
--   * time_records.rate_usd/amount_usd/status (0017)
--   * employees.daily_hours_expected (0015)
--   * employees.hourly_rate_usd      (0019)
--   * bulk_load_schedules table      (0012)
--   * email_reminder_settings table  (0013)
--   * employee_aliases table         (0014)
--   * client_contracts table         (0016)
--   * coordinator_assignments table  (0018)

-- ============================================================================
-- Time Records Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS time_records (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  client_id TEXT NOT NULL,
  client_name TEXT NOT NULL,
  project_id TEXT NOT NULL,
  project_name TEXT NOT NULL,
  duration_decimal REAL NOT NULL,
  duration_hours INTEGER NOT NULL,
  duration_minutes INTEGER NOT NULL,
  date TEXT NOT NULL,
  work_type TEXT CHECK(work_type IN ('project', 'internal', 'meeting', 'training', 'other')) NOT NULL,
  description TEXT,
  is_billable INTEGER DEFAULT 0,
  -- Added by 0003_add_source_to_time_records; column order matches the
  -- 0004 table rebuild (source sits before created_at). Values: 'manual',
  -- 'clockify', 'zendesk', 'bulk', etc.
  source TEXT DEFAULT 'manual',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- Monetary billing data + approval status. Added by
  -- 0017_add_billing_and_status; appended after updated_at to mirror the
  -- ALTER TABLE ADD COLUMN ordering of a migrated database.
  rate_usd REAL DEFAULT 0,
  amount_usd REAL DEFAULT 0,
  status TEXT DEFAULT 'approved'
);
CREATE INDEX IF NOT EXISTS idx_time_records_company ON time_records(company_id);
CREATE INDEX IF NOT EXISTS idx_time_records_company_created ON time_records(company_id, created_at);
CREATE INDEX IF NOT EXISTS idx_time_records_employee ON time_records(company_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_time_records_client ON time_records(company_id, client_id);
CREATE INDEX IF NOT EXISTS idx_time_records_project ON time_records(company_id, project_id);
CREATE INDEX IF NOT EXISTS idx_time_records_date ON time_records(company_id, date);

-- ============================================================================
-- Employees Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  password_hash TEXT,                       -- added by 0002_add_auth_and_rbac
  role_id TEXT DEFAULT 'employee',          -- added by 0002_add_auth_and_rbac
  department TEXT,
  is_active INTEGER DEFAULT 1,
  -- Expected daily capacity in hours (0..8). Added by 0015_add_daily_hours_expected.
  daily_hours_expected REAL DEFAULT 8.0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- Per-employee hourly cost/bill rate in USD. Added by
  -- 0019_add_employee_hourly_rate; appended after updated_at to mirror the
  -- ALTER TABLE ADD COLUMN ordering of a migrated database. Existing rows
  -- default to 45.
  hourly_rate_usd REAL DEFAULT 45
);

CREATE INDEX IF NOT EXISTS idx_employees_company ON employees(company_id);
CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(company_id, email);

-- ============================================================================
-- Employee Aliases Table (Zendesk / Clockify identity mapping)
--   Source: 0014_employee_aliases
-- ============================================================================

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

-- ============================================================================
-- Role Permissions Table (RBAC)
--   Source: base + 0002_add_auth_and_rbac
-- ============================================================================

CREATE TABLE IF NOT EXISTS role_permissions (
  id TEXT PRIMARY KEY,
  role_id TEXT NOT NULL,
  permission_key TEXT NOT NULL,
  is_allowed INTEGER DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(role_id, permission_key)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);

-- ============================================================================
-- Coordinator Assignments Table (rol `coordinator` → cartera de clientes)
--   Source: 0018_coordinator_assignments
--   Scoping por cartera (matriz RACI). Una fila por (coordinador, client_id).
-- ============================================================================

CREATE TABLE IF NOT EXISTS coordinator_assignments (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  coordinator_email TEXT NOT NULL,
  client_id TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(company_id, coordinator_email, client_id)
);

CREATE INDEX IF NOT EXISTS idx_coordinator_assignments_coordinator
  ON coordinator_assignments(company_id, coordinator_email);

-- ============================================================================
-- Clients Table
--   Base table (industry / is_active are used by 0009_merge_interno_client).
-- ============================================================================

CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  name TEXT NOT NULL,
  industry TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_clients_company ON clients(company_id);
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(company_id, name);

-- ============================================================================
-- Client Contracts Table (retainers / bag-of-hours per month)
--   Source: 0016_client_contracts
-- ============================================================================

CREATE TABLE IF NOT EXISTS client_contracts (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'mooving-default',
  client_id TEXT NOT NULL,
  month TEXT NOT NULL,                       -- 'YYYY-MM'
  contracted_hours REAL NOT NULL DEFAULT 0.0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(company_id, client_id, month)
);

CREATE INDEX IF NOT EXISTS idx_client_contracts_company ON client_contracts(company_id);

-- ============================================================================
-- Projects Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT CHECK(status IN ('active', 'paused', 'completed', 'archived')) DEFAULT 'active',
  is_active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id)
);

CREATE INDEX IF NOT EXISTS idx_projects_company ON projects(company_id);
CREATE INDEX IF NOT EXISTS idx_projects_client ON projects(company_id, client_id);

-- ============================================================================
-- Categories Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_categories_company ON categories(company_id);

-- ============================================================================
-- Audit Logs Table (Compliance & Security)
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  changes TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_company ON audit_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(company_id, user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(company_id, created_at);

-- ============================================================================
-- Feature Flags Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS feature_flags (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  feature_code TEXT NOT NULL,
  status TEXT CHECK(status IN ('off', 'preview', 'on')) DEFAULT 'off',
  description TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(company_id, feature_code)
);

CREATE INDEX IF NOT EXISTS idx_feature_flags_company ON feature_flags(company_id);

-- ============================================================================
-- Tenant Feature Overrides Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS tenant_feature_overrides (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  feature_code TEXT NOT NULL,
  override_status TEXT CHECK(override_status IN ('on', 'off')) NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(company_id, feature_code)
);

CREATE INDEX IF NOT EXISTS idx_overrides_company ON tenant_feature_overrides(company_id);

-- ============================================================================
-- Bulk Load Schedules Table (per-tenant recurring bulk-load config)
--   Source: 0012_bulk_load_schedules_and_new_mcp_tools
--   The cron handler reads from this table on its schedule.
-- ============================================================================

CREATE TABLE IF NOT EXISTS bulk_load_schedules (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  company_id      TEXT NOT NULL,
  employee_id     TEXT NOT NULL,
  client_id       TEXT NOT NULL,
  project_id      TEXT NOT NULL,
  description     TEXT NOT NULL DEFAULT 'Carga masiva automática',
  hours_per_day   REAL NOT NULL DEFAULT 4.0,
  -- Repeating window used by the cron. Leave end_date NULL to auto-fill with
  -- end-of-current-month.
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

-- ============================================================================
-- Email Reminder Settings Table (per-tenant hours-reminder automation)
--   Source: 0013_email_reminder_settings
-- ============================================================================

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

-- ============================================================================
-- MCP Tool Catalog Table
--   Populated incrementally by 0006/0007/0008/0010/0011/0012/0013/0014.
-- ============================================================================

CREATE TABLE IF NOT EXISTS mcp_tool_catalog (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  access_type TEXT CHECK(access_type IN ('read', 'write')) NOT NULL,
  domain TEXT,
  description_es TEXT,
  description_en TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- MCP User Permissions Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS mcp_user_permissions (
  mcp_user_id TEXT NOT NULL,
  tool_id TEXT NOT NULL,
  company_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (mcp_user_id, tool_id),
  FOREIGN KEY (tool_id) REFERENCES mcp_tool_catalog(id)
);

CREATE INDEX IF NOT EXISTS idx_mcp_perms_company ON mcp_user_permissions(company_id);
