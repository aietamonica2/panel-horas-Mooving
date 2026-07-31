-- Migration 0019: Add hourly_rate_usd to employees table
--
-- ⚠️  NOT IDEMPOTENT: this migration uses `ALTER TABLE ... ADD COLUMN`, which
-- SQLite/D1 rejects with "duplicate column name" if the column already exists.
-- There is no `ADD COLUMN IF NOT EXISTS` in SQLite. The D1 migrations runner
-- applies each file exactly once (tracked in the d1_migrations table), so this
-- is safe as a forward-only migration. Do NOT re-run it by hand against a
-- database that already has this column.
--
--   hourly_rate_usd : employee's hourly cost/bill rate in USD (default 45).
--                     Existing employees default to 45 so historical rows keep
--                     a sensible rate until per-employee values are set.

ALTER TABLE employees ADD COLUMN hourly_rate_usd REAL DEFAULT 45;
