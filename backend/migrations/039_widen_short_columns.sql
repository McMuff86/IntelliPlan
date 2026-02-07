-- Migration: 039_widen_short_columns
-- Description: Widen varchar(20) columns that are too short for real Excel import data

-- resources.short_code: codes like "Fremdmonteur_Name" can exceed 20 chars
ALTER TABLE resources ALTER COLUMN short_code TYPE VARCHAR(50);

-- projects.sachbearbeiter: full names can exceed 20 chars
ALTER TABLE projects ALTER COLUMN sachbearbeiter TYPE VARCHAR(100);

-- tasks.phase_code: increase for safety (currently short like "ZUS", "PROD")
ALTER TABLE tasks ALTER COLUMN phase_code TYPE VARCHAR(50);
