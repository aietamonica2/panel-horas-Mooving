-- Migration 0018: Coordinator → cartera assignments + RACI seed (FEAT-01)
--
-- Introduce el scoping por cartera del rol `coordinator`. Cada fila asigna a un
-- coordinador (por email) un client_id de su cartera, según la matriz RACI.
-- El filtrado server-side por scope se apoya en esta tabla.
--
-- Convenciones:
--   * company_id = 'mooving-default' (único tenant en producción).
--   * id de asignación = 'ca_' || coordinator_slug || '_' || client_id,
--     donde coordinator_slug es la parte local del email (antes de '@').
--   * Todos los seeds usan INSERT OR IGNORE para ser re-aplicables sin romper
--     por la restricción UNIQUE(company_id, coordinator_email, client_id).
--
-- Nota: esta migración es forward-only (la aplica el orquestador, una sola vez,
-- vía el runner de D1). No re-ejecutar a mano.

-- ============================================================================
-- 1. Tabla coordinator_assignments (Coordinador → cartera de clientes)
-- ============================================================================
CREATE TABLE IF NOT EXISTS coordinator_assignments (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  coordinator_email TEXT NOT NULL,
  client_id TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(company_id, coordinator_email, client_id)
);

-- Índice para resolver rápido la cartera de un coordinador dentro de un tenant.
CREATE INDEX IF NOT EXISTS idx_coordinator_assignments_coordinator
  ON coordinator_assignments(company_id, coordinator_email);

-- ============================================================================
-- 2. Seed de la matriz RACI (asignaciones Coordinador → client_id)
--    company_id = 'mooving-default'; id = 'ca_' || <email-local> || '_' || client_id
-- ============================================================================
INSERT OR IGNORE INTO coordinator_assignments (id, company_id, coordinator_email, client_id) VALUES
  -- Federico Cristofani → Decathlon (AR/UY), Camuzzi, Mooving
  ('ca_federico.cristofani_decathlon-argentina', 'mooving-default', 'federico.cristofani@moovingtech.com', 'decathlon-argentina'),
  ('ca_federico.cristofani_decathlon-uruguay',   'mooving-default', 'federico.cristofani@moovingtech.com', 'decathlon-uruguay'),
  ('ca_federico.cristofani_camuzzi',             'mooving-default', 'federico.cristofani@moovingtech.com', 'camuzzi'),
  ('ca_federico.cristofani_mooving',             'mooving-default', 'federico.cristofani@moovingtech.com', 'mooving'),
  -- Mónica Aieta (admin; se incluye por la RACI, NO se le cambia el rol) → Camuzzi Team Soporte, Disvol
  ('ca_monica.aieta_camuzzi-team-soporte',       'mooving-default', 'monica.aieta@moovingtech.com',       'camuzzi-team-soporte'),
  ('ca_monica.aieta_disvol',                     'mooving-default', 'monica.aieta@moovingtech.com',       'disvol'),
  -- Lucía Manera → El Galgo
  ('ca_lucia.manera_el-galgo',                   'mooving-default', 'lucia.manera@moovingtech.com',       'el-galgo'),
  -- Pedro Lizondo → Kiabi
  ('ca_pedro.lizondo_kiabi',                     'mooving-default', 'pedro.lizondo@moovingtech.com',       'kiabi'),
  -- Augusto Morelli → Pasarela de Pagos
  ('ca_augusto.morelli_pasarela-de-pagos',       'mooving-default', 'augusto.morelli@moovingtech.com',    'pasarela-de-pagos');

-- ============================================================================
-- 3. Marcar como coordinadores a los PMs que hoy son 'employee'
--    IMPORTANTE: NO se toca a monica.aieta@moovingtech.com (es admin y ve todo).
-- ============================================================================
UPDATE employees SET role_id = 'coordinator'
WHERE email IN (
  'federico.cristofani@moovingtech.com',
  'lucia.manera@moovingtech.com',
  'pedro.lizondo@moovingtech.com',
  'augusto.morelli@moovingtech.com'
);

-- ============================================================================
-- 4. Permisos del rol 'coordinator' (RBAC — tabla role_permissions)
-- ============================================================================
-- El patrón de role_permissions es (id, role_id, permission_key, is_allowed),
-- UNIQUE(role_id, permission_key). Hoy 'admin' tiene las permission_key de tipo
-- view_*: 'view_dashboard' y 'view_smarttrack' (ver 0002_add_auth_and_rbac.sql).
-- No existe un rol 'manager' ni claves para "aprobaciones"/"registros".
--
-- Se otorga a 'coordinator' visibilidad de dashboard / registros / aprobaciones:
--   * view_dashboard  → copiada de 'admin' (vista Dashboard).
--   * view_smarttrack → copiada de 'admin' (módulo de tracking / registros de horas).
--   * view_approvals  → NUEVA clave para la cola de "Aprobaciones"; no existía
--                       para 'admin' porque el front la habilita por rol
--                       (role === 'admin'). Se agrega explícitamente para que el
--                       coordinador vea las aprobaciones de su cartera (RACI).
INSERT OR IGNORE INTO role_permissions (id, role_id, permission_key, is_allowed) VALUES
  ('perm_coord_dashboard',  'coordinator', 'view_dashboard',  1),
  ('perm_coord_smarttrack', 'coordinator', 'view_smarttrack', 1),
  ('perm_coord_approvals',  'coordinator', 'view_approvals',  1);
