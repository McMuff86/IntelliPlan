-- Migration: 032_add_updated_at_triggers
-- Description: Add automatic updated_at triggers for all tables that have the column.
--              Currently only pendenzen has a trigger. All other tables rely on app code
--              to set updated_at, which is fragile and error-prone.
-- Risk: LOW – only auto-sets updated_at on UPDATE, no data change

-- ============================================================
-- Generic trigger function (reusable across all tables)
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- Apply trigger to all tables with updated_at column.
-- Uses DO block to loop over table names for DRY approach.
-- Pendenzen already has a trigger – it will be replaced with
-- the standardized one (same behavior, consistent naming).
-- ============================================================
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'users',
      'appointments',
      'projects',
      'tasks',
      'task_work_slots',
      'resources',
      'reminders',
      'working_time_templates',
      'product_types',
      'task_templates',
      'pendenzen'
    ])
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_%s_updated_at ON %I;
       CREATE TRIGGER trg_%s_updated_at
         BEFORE UPDATE ON %I
         FOR EACH ROW
         EXECUTE FUNCTION set_updated_at();',
      tbl, tbl, tbl, tbl
    );
  END LOOP;
END $$;

-- Drop the old pendenzen-specific trigger function if it exists
-- (the generic set_updated_at() replaces it)
DROP FUNCTION IF EXISTS update_pendenzen_updated_at() CASCADE;
