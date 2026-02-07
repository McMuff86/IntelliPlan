-- Migration: 034_extend_resources
-- Description: Extend resources table with department, employee type, and capacity fields for Wochenplan

ALTER TABLE resources ADD COLUMN IF NOT EXISTS department VARCHAR(50);
-- Values: 'zuschnitt', 'cnc', 'produktion', 'behandlung', 'beschlaege', 'transport', 'montage'

ALTER TABLE resources ADD COLUMN IF NOT EXISTS employee_type VARCHAR(30) DEFAULT 'internal';
-- Values: 'internal', 'temporary', 'external_firm', 'pensioner'

ALTER TABLE resources ADD COLUMN IF NOT EXISTS default_location VARCHAR(200);

ALTER TABLE resources ADD COLUMN IF NOT EXISTS weekly_hours NUMERIC(4,1) DEFAULT 42.5;

ALTER TABLE resources ADD COLUMN IF NOT EXISTS skills TEXT[];
