-- Panel de Operaciones Mooving - Database Schema
-- Cloudflare D1 (SQLite)

-- Time records table
CREATE TABLE IF NOT EXISTS time_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  proyecto TEXT NOT NULL,
  cliente TEXT NOT NULL,
  usuario TEXT NOT NULL,
  duracion_decimal REAL NOT NULL,
  fecha_inicio TEXT NOT NULL,
  grupo TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_time_records_usuario ON time_records(usuario);
CREATE INDEX IF NOT EXISTS idx_time_records_cliente ON time_records(cliente);
CREATE INDEX IF NOT EXISTS idx_time_records_fecha ON time_records(fecha_inicio);
CREATE INDEX IF NOT EXISTS idx_time_records_proyecto ON time_records(proyecto);

-- Audit log table
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL,
  action TEXT NOT NULL,
  user_id TEXT,
  changes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
