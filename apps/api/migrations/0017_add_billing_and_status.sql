-- Migration 0017: Persist monetary billing data + approval status on time_records (DATA-06)
--
-- ⚠️  NOT IDEMPOTENT: this migration uses `ALTER TABLE ... ADD COLUMN`, which
-- SQLite/D1 rejects with "duplicate column name" if the column already exists.
-- There is no `ADD COLUMN IF NOT EXISTS` in SQLite. The D1 migrations runner
-- applies each file exactly once (tracked in the d1_migrations table), so this
-- is safe as a forward-only migration. Do NOT re-run it by hand against a
-- database that already has these columns.
--
--   rate_usd   : rate in USD applied to this record (default 0).
--   amount_usd : total billed amount in USD for this record (default 0).
--   status     : approval status; foundation for a future approval workflow.
--                Existing rows default to 'approved' so historical data stays
--                visible/approved until the approval flow is introduced.

ALTER TABLE time_records ADD COLUMN rate_usd REAL DEFAULT 0;
ALTER TABLE time_records ADD COLUMN amount_usd REAL DEFAULT 0;
ALTER TABLE time_records ADD COLUMN status TEXT DEFAULT 'approved';
