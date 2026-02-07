-- Migration: 033_task_assignments
-- Description: Create task_assignments table for daily worker-to-task assignments (Wochenplan core)

CREATE TABLE IF NOT EXISTS task_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  assignment_date DATE NOT NULL,
  half_day VARCHAR(10) NOT NULL CHECK (half_day IN ('morning', 'afternoon', 'full_day')),
  notes TEXT,
  is_fixed BOOLEAN DEFAULT false,
  start_time TIME,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(task_id, resource_id, assignment_date, half_day)
);

CREATE INDEX IF NOT EXISTS idx_task_assignments_date ON task_assignments(assignment_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_task_assignments_resource ON task_assignments(resource_id, assignment_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_task_assignments_task ON task_assignments(task_id) WHERE deleted_at IS NULL;

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_task_assignments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_task_assignments_updated_at ON task_assignments;
CREATE TRIGGER trg_task_assignments_updated_at
  BEFORE UPDATE ON task_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_task_assignments_updated_at();
