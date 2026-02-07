-- Migration: 036_production_phases
-- Description: Production phase workflow tracking for carpentry orders

DO $$ BEGIN
  CREATE TYPE production_phase AS ENUM (
    'zuschnitt', 'cnc', 'produktion', 'behandlung', 'beschlaege', 'montage'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS task_phase_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  phase production_phase NOT NULL,
  planned_kw INTEGER,
  planned_year INTEGER,
  actual_start DATE,
  actual_end DATE,
  status VARCHAR(20) DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'skipped')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(task_id, phase)
);

CREATE INDEX IF NOT EXISTS idx_phase_schedules_kw ON task_phase_schedules(planned_year, planned_kw);
CREATE INDEX IF NOT EXISTS idx_phase_schedules_task ON task_phase_schedules(task_id);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_task_phase_schedules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_task_phase_schedules_updated_at ON task_phase_schedules;
CREATE TRIGGER trg_task_phase_schedules_updated_at
  BEFORE UPDATE ON task_phase_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_task_phase_schedules_updated_at();
