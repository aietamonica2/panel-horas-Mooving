-- Migration 0015: Add daily_hours_expected to employees table
-- Default capacity is 8.0 hours per day per employee (supports 0 to 8)
ALTER TABLE employees ADD COLUMN daily_hours_expected REAL DEFAULT 8.0;
