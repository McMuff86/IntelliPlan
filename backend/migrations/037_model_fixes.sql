-- Migration: 037_model_fixes
-- Description: Datenmodell-Fixes aus Review (Iteration 3a)
--   1. status_code auf task_assignments (FREI/FEI/KRANK etc.)
--   2. short_code auf resources (MA_14, MA_28)
--   3. lehrling/apprentice als employee_type
--   4. buero als department
--   5. phase_code + planned_week/year auf tasks
--   6. transport/vorbehandlung/nachbehandlung als production_phase ENUM

-- ═══════════════════════════════════════════════════════
-- 1. status_code auf task_assignments
-- ═══════════════════════════════════════════════════════
ALTER TABLE task_assignments ADD COLUMN IF NOT EXISTS status_code VARCHAR(20) DEFAULT 'assigned';

-- Add CHECK constraint (drop first in case we re-run)
DO $$ BEGIN
  ALTER TABLE task_assignments ADD CONSTRAINT chk_ta_status_code
    CHECK (status_code IN ('assigned', 'available', 'sick', 'vacation', 'training', 'other'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ═══════════════════════════════════════════════════════
-- 2. short_code auf resources
-- ═══════════════════════════════════════════════════════
ALTER TABLE resources ADD COLUMN IF NOT EXISTS short_code VARCHAR(20);

CREATE UNIQUE INDEX IF NOT EXISTS idx_resources_short_code
  ON resources(short_code) WHERE short_code IS NOT NULL AND deleted_at IS NULL;

-- ═══════════════════════════════════════════════════════
-- 3. employee_type CHECK constraint (mit apprentice/lehrling)
-- ═══════════════════════════════════════════════════════
ALTER TABLE resources DROP CONSTRAINT IF EXISTS resources_employee_type_check;
ALTER TABLE resources DROP CONSTRAINT IF EXISTS chk_resources_employee_type;

DO $$ BEGIN
  ALTER TABLE resources ADD CONSTRAINT chk_resources_employee_type
    CHECK (employee_type IS NULL OR employee_type IN (
      'internal', 'temporary', 'external_firm', 'pensioner', 'apprentice'
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ═══════════════════════════════════════════════════════
-- 4. department CHECK constraint (mit buero)
-- ═══════════════════════════════════════════════════════
ALTER TABLE resources DROP CONSTRAINT IF EXISTS resources_department_check;
ALTER TABLE resources DROP CONSTRAINT IF EXISTS chk_resources_department;

DO $$ BEGIN
  ALTER TABLE resources ADD CONSTRAINT chk_resources_department
    CHECK (department IS NULL OR department IN (
      'zuschnitt', 'cnc', 'produktion', 'behandlung', 'beschlaege', 'transport', 'montage', 'buero'
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ═══════════════════════════════════════════════════════
-- 5. phase_code + planned_week/year auf tasks
-- ═══════════════════════════════════════════════════════
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS phase_code VARCHAR(20);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS planned_week INTEGER;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS planned_year INTEGER;

DO $$ BEGIN
  ALTER TABLE tasks ADD CONSTRAINT chk_tasks_phase_code
    CHECK (phase_code IS NULL OR phase_code IN (
      'ZUS', 'CNC', 'PROD', 'VORBEH', 'NACHBEH', 'BESCHL', 'TRANS', 'MONT'
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE tasks ADD CONSTRAINT chk_tasks_planned_week
    CHECK (planned_week IS NULL OR (planned_week >= 1 AND planned_week <= 53));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_tasks_phase ON tasks(phase_code) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_week ON tasks(planned_year, planned_week) WHERE deleted_at IS NULL;

-- ═══════════════════════════════════════════════════════
-- 6. Extend production_phase ENUM
-- ═══════════════════════════════════════════════════════
ALTER TYPE production_phase ADD VALUE IF NOT EXISTS 'transport';
ALTER TYPE production_phase ADD VALUE IF NOT EXISTS 'vorbehandlung';
ALTER TYPE production_phase ADD VALUE IF NOT EXISTS 'nachbehandlung';
