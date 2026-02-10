-- Migration: 042_project_phase_plans
-- Description: Add project-level deadline/risk metadata and customizable project phase plans

-- Project metadata for project-first planning
ALTER TABLE projects ADD COLUMN IF NOT EXISTS target_end_date DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'normal';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS risk_level VARCHAR(20) DEFAULT 'medium';

UPDATE projects SET priority = 'normal' WHERE priority IS NULL;
UPDATE projects SET risk_level = 'medium' WHERE risk_level IS NULL;

ALTER TABLE projects ALTER COLUMN priority SET DEFAULT 'normal';
ALTER TABLE projects ALTER COLUMN risk_level SET DEFAULT 'medium';

DO $$ BEGIN
  ALTER TABLE projects ADD CONSTRAINT chk_projects_priority
    CHECK (priority IN ('low', 'normal', 'high', 'urgent'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE projects ADD CONSTRAINT chk_projects_risk_level
    CHECK (risk_level IN ('low', 'medium', 'high', 'critical'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Project-specific phase plan (flexible manufacturing workflow definition)
CREATE TABLE IF NOT EXISTS project_phase_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  phase_code VARCHAR(255) NOT NULL,
  phase_label VARCHAR(255) NOT NULL,
  sequence_order INTEGER NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT true,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  estimated_hours_min NUMERIC(6,1),
  estimated_hours_max NUMERIC(6,1),
  dependency_phase_codes VARCHAR(255)[] NOT NULL DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

DO $$ BEGIN
  ALTER TABLE project_phase_plans ADD CONSTRAINT chk_project_phase_plan_phase_code
    CHECK (phase_code IN ('ZUS', 'CNC', 'PROD', 'VORBEH', 'NACHBEH', 'BESCHL', 'TRANS', 'MONT'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE project_phase_plans ADD CONSTRAINT chk_project_phase_plan_sequence
    CHECK (sequence_order >= 1);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE project_phase_plans ADD CONSTRAINT chk_project_phase_plan_estimate_range
    CHECK (
      estimated_hours_min IS NULL
      OR estimated_hours_max IS NULL
      OR estimated_hours_min <= estimated_hours_max
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_project_phase_plans_unique_active_phase
  ON project_phase_plans(project_id, phase_code)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_project_phase_plans_owner_project
  ON project_phase_plans(owner_id, project_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_project_phase_plans_phase
  ON project_phase_plans(phase_code)
  WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_project_phase_plans_updated_at ON project_phase_plans;
CREATE TRIGGER trg_project_phase_plans_updated_at
  BEFORE UPDATE ON project_phase_plans
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
