-- Migration: 043_project_readiness_checks
-- Description: Readiness gate checks per project to block planning before prerequisites are fulfilled

CREATE TABLE IF NOT EXISTS project_readiness_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  check_code VARCHAR(40) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  checked_by UUID REFERENCES users(id) ON DELETE SET NULL,
  checked_at TIMESTAMPTZ,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

DO $$ BEGIN
  ALTER TABLE project_readiness_checks ADD CONSTRAINT chk_project_readiness_check_code
    CHECK (check_code IN (
      'AVOR_DONE',
      'MATERIAL_READY',
      'FITTINGS_READY',
      'PLANS_READY',
      'SITE_READY'
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE project_readiness_checks ADD CONSTRAINT chk_project_readiness_status
    CHECK (status IN ('pending', 'ok', 'blocked', 'n_a'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_project_readiness_unique_active
  ON project_readiness_checks(project_id, check_code)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_project_readiness_owner_project
  ON project_readiness_checks(owner_id, project_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_project_readiness_status
  ON project_readiness_checks(status)
  WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_project_readiness_checks_updated_at ON project_readiness_checks;
CREATE TRIGGER trg_project_readiness_checks_updated_at
  BEFORE UPDATE ON project_readiness_checks
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
