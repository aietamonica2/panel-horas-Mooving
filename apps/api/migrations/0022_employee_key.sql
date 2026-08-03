-- Migration 0022: B5 — identidad canónica en time_records (employee_key)
--                 + B6 parcial — dedupe y UNIQUE en employee_aliases.
--
-- employee_key: referencia al employees.id CANÓNICO del registro, resuelta al
-- insertar (Clockify/Zendesk/manual/CSV) con el resolvedor compartido de
-- src/lib/identity.ts. NULL cuando la identidad cruda no se pudo resolver
-- (nunca se inventa). Los registros históricos se completan con el script
-- scripts/backfill_employee_key.mjs.
--
-- NOTA D1/SQLite: ALTER TABLE ... ADD COLUMN NO soporta IF NOT EXISTS. Las
-- migraciones D1 se aplican exactamente UNA vez (wrangler las registra en
-- d1_migrations), así que el ALTER directo es seguro. Si este archivo se
-- re-ejecutara a mano, el ALTER fallaría con "duplicate column name" sin
-- corromper datos; el resto de la migración es idempotente (IF NOT EXISTS /
-- DELETE estable).
ALTER TABLE time_records ADD COLUMN employee_key TEXT;

CREATE INDEX IF NOT EXISTS idx_time_records_employee_key ON time_records(company_id, employee_key);

-- ---------------------------------------------------------------------------
-- B6 (parcial): employee_aliases acumulaba filas duplicadas porque su PK es un
-- id aleatorio y no había restricción sobre la identidad real del alias.
-- 1) Se borran los duplicados exactos por (company_id, alias_email, alias_name),
--    conservando la fila más antigua (menor rowid). GROUP BY agrupa también los
--    alias_name NULL entre sí, así que esos duplicados también se limpian.
-- 2) Se crea el índice UNIQUE para que no vuelvan a acumularse.
--    (Nota SQLite: UNIQUE trata los NULL como distintos, por eso el paso 1 es
--    necesario y el índice protege los casos con alias_name NOT NULL.)
-- ---------------------------------------------------------------------------
DELETE FROM employee_aliases
WHERE rowid NOT IN (
  SELECT MIN(rowid)
  FROM employee_aliases
  GROUP BY company_id, alias_email, alias_name
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_employee_aliases ON employee_aliases(company_id, alias_email, alias_name);
