-- Migration: Merge Interno Client into Mooving and Add DESA
-- Description: Merges the 'interno' client and its projects/time records into 'mooving', and adds the 'desa' testing client.

-- 1. Update time records for the merged client
UPDATE time_records 
SET client_id = 'mooving', 
    client_name = 'Mooving' 
WHERE client_id = 'interno' 
  AND company_id = 'mooving-default';

-- 2. Update projects to point to the unified Mooving client
UPDATE projects 
SET client_id = 'mooving' 
WHERE client_id = 'interno' 
  AND company_id = 'mooving-default';

-- 3. Remove the obsolete 'interno' client from the clients table
DELETE FROM clients 
WHERE id = 'interno' 
  AND company_id = 'mooving-default';

-- 4. Add the DESA client if it doesn't already exist
INSERT OR IGNORE INTO clients (id, company_id, name, industry, is_active)
VALUES ('desa', 'mooving-default', 'DESA', 'Desarrollo / Interno', 1);
