-- Cloudflare D1 Database Schema
-- Panel de Operaciones Mooving v1.0.0
-- Multi-tenant SQLite Database

-- ============================================================================
-- Time Records Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS time_records (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
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
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_time_records_tenant ON time_records(tenant_id);
CREATE INDEX idx_time_records_tenant_created ON time_records(tenant_id, created_at);
CREATE INDEX idx_time_records_employee ON time_records(tenant_id, employee_id);
CREATE INDEX idx_time_records_client ON time_records(tenant_id, client_id);
CREATE INDEX idx_time_records_date ON time_records(tenant_id, date);

-- ============================================================================
-- Employees Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  department TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_employees_tenant ON employees(tenant_id);
CREATE INDEX idx_employees_email ON employees(tenant_id, email);

-- ============================================================================
-- Clients Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  industry TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_clients_tenant ON clients(tenant_id);
CREATE INDEX idx_clients_name ON clients(tenant_id, name);

-- ============================================================================
-- Projects Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT CHECK(status IN ('active', 'paused', 'completed', 'archived')) DEFAULT 'active',
  is_active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id)
);

CREATE INDEX idx_projects_tenant ON projects(tenant_id);
CREATE INDEX idx_projects_client ON projects(tenant_id, client_id);

-- ============================================================================
-- Audit Logs Table (Compliance & Security)
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  changes TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_tenant ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(tenant_id, user_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(tenant_id, created_at);

-- ============================================================================
-- Feature Flags Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS feature_flags (
  id TEXT PRIMARY KEY,
  tenant_id TEXT,
  feature_code TEXT NOT NULL,
  status TEXT CHECK(status IN ('off', 'preview', 'on')) DEFAULT 'off',
  description TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tenant_id, feature_code)
);

CREATE INDEX idx_feature_flags_tenant ON feature_flags(tenant_id);

-- ============================================================================
-- Tenant Feature Overrides Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS tenant_feature_overrides (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  feature_code TEXT NOT NULL,
  override_status TEXT CHECK(override_status IN ('on', 'off')) NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tenant_id, feature_code)
);

CREATE INDEX idx_overrides_tenant ON tenant_feature_overrides(tenant_id);
