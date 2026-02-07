-- Add work_role column to resources (functional role on the shop floor)
ALTER TABLE resources ADD COLUMN IF NOT EXISTS work_role VARCHAR(30) DEFAULT 'arbeiter';

-- CHECK constraint for valid work roles
DO $$ BEGIN
  ALTER TABLE resources ADD CONSTRAINT chk_work_role
    CHECK (work_role IN ('arbeiter', 'hilfskraft', 'lehrling', 'allrounder', 'buero'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Set default for existing office resources
UPDATE resources SET work_role = 'buero' WHERE department = 'buero' AND work_role = 'arbeiter';

-- Set default for apprentices
UPDATE resources SET work_role = 'lehrling' WHERE employee_type = 'apprentice' AND work_role = 'arbeiter';
