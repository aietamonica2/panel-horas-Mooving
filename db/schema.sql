-- Cloudflare D1 Database Schema
-- Panel de Operaciones Mooving v1.0.0
-- Multi-tenant SQLite Database

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
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_time_records_company ON time_records(company_id);
CREATE INDEX idx_time_records_company_created ON time_records(company_id, created_at);
CREATE INDEX idx_time_records_employee ON time_records(company_id, employee_id);
CREATE INDEX idx_time_records_client ON time_records(company_id, client_id);
CREATE INDEX idx_time_records_date ON time_records(company_id, date);

-- ============================================================================
-- Employees Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  password_hash TEXT,
  role_id TEXT DEFAULT 'employee',
  department TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_employees_company ON employees(company_id);
CREATE INDEX idx_employees_email ON employees(company_id, email);

-- ============================================================================
-- Role Permissions Table (RBAC)
-- ============================================================================

CREATE TABLE IF NOT EXISTS role_permissions (
  id TEXT PRIMARY KEY,
  role_id TEXT NOT NULL,
  permission_key TEXT NOT NULL,
  is_allowed INTEGER DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(role_id, permission_key)
);

CREATE INDEX idx_role_permissions_role ON role_permissions(role_id);

-- ============================================================================
-- Clients Table
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

CREATE INDEX idx_clients_company ON clients(company_id);
CREATE INDEX idx_clients_name ON clients(company_id, name);

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

CREATE INDEX idx_projects_company ON projects(company_id);
CREATE INDEX idx_projects_client ON projects(company_id, client_id);

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

CREATE INDEX idx_categories_company ON categories(company_id);

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

CREATE INDEX idx_audit_logs_company ON audit_logs(company_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(company_id, user_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(company_id, created_at);

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

CREATE INDEX idx_feature_flags_company ON feature_flags(company_id);

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

CREATE INDEX idx_overrides_company ON tenant_feature_overrides(company_id);

-- ============================================================================
-- MCP Tool Catalog Table
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

CREATE INDEX idx_mcp_perms_company ON mcp_user_permissions(company_id);

