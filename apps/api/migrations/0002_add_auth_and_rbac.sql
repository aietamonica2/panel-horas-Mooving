-- Migration: Add Auth and RBAC
-- Description: Adds password_hash and role_id to employees, creates role_permissions table

-- 1. Añadir columnas a employees
-- SQLite en D1 no soporta múltiples ADD COLUMN en una sola sentencia ALTER TABLE,
-- así que lo hacemos uno por uno.
ALTER TABLE employees ADD COLUMN password_hash TEXT;
ALTER TABLE employees ADD COLUMN role_id TEXT DEFAULT 'employee';

-- 2. Crear tabla role_permissions
CREATE TABLE IF NOT EXISTS role_permissions (
  id TEXT PRIMARY KEY,
  role_id TEXT NOT NULL,
  permission_key TEXT NOT NULL,
  is_allowed INTEGER DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(role_id, permission_key)
);

CREATE INDEX idx_role_permissions_role ON role_permissions(role_id);

-- 3. Insertar permisos básicos
-- Roles soportados: 'admin', 'employee'
INSERT OR IGNORE INTO role_permissions (id, role_id, permission_key, is_allowed) VALUES
  ('perm_admin_dash', 'admin', 'view_dashboard', 1),
  ('perm_admin_smart', 'admin', 'view_smarttrack', 1),
  ('perm_emp_smart', 'employee', 'view_smarttrack', 1);

-- 4. Actualizar passwords iniciales para cuentas de prueba (Mooving2026!)
-- Hash SHA-256 pre-calculado para simplificar el MVP
UPDATE employees SET password_hash = '8b1f516a8...hash' WHERE password_hash IS NULL;

-- 5. Crear / Dar rol de admin a monica.aieta y monica@mooving.ai
INSERT OR IGNORE INTO employees (id, company_id, name, email, password_hash, role_id, is_active)
VALUES 
  ('emp_admin_1', 'mooving-default', 'Mónica Aieta', 'monica.aieta@moovingtech.com', 'moovingadm-hash', 'admin', 1),
  ('emp_admin_2', 'mooving-default', 'Mónica (Senda)', 'monica@mooving.ai', 'moovingadm-hash', 'admin', 1);

UPDATE employees SET role_id = 'admin', password_hash = 'moovingadm-hash' WHERE email IN ('monica.aieta@moovingtech.com', 'monica@mooving.ai');
