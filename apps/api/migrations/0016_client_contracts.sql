-- Migration 0016: Client contracts for retainers / bag of hours tracking
CREATE TABLE IF NOT EXISTS client_contracts (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'mooving-default',
  client_id TEXT NOT NULL,
  month TEXT NOT NULL,
  contracted_hours REAL NOT NULL DEFAULT 0.0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(company_id, client_id, month)
);
