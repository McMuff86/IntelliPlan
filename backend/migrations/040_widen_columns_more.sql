-- Migration: 040_widen_columns_more
-- Description: Widen all short varchar columns to VARCHAR(255) to handle any Excel data

ALTER TABLE resources ALTER COLUMN short_code TYPE VARCHAR(255);
ALTER TABLE resources ALTER COLUMN department TYPE VARCHAR(255);
ALTER TABLE resources ALTER COLUMN employee_type TYPE VARCHAR(255);
ALTER TABLE projects ALTER COLUMN sachbearbeiter TYPE VARCHAR(255);
ALTER TABLE projects ALTER COLUMN order_number TYPE VARCHAR(255);
ALTER TABLE tasks ALTER COLUMN phase_code TYPE VARCHAR(255);
ALTER TABLE task_assignments ALTER COLUMN status_code TYPE VARCHAR(255);
