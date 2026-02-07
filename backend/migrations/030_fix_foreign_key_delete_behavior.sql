-- Migration: 030_fix_foreign_key_delete_behavior
-- Description: Fix ON DELETE behavior for reminders and working_time_templates.
--              Without CASCADE, deleting a user leaves orphaned records.
-- Risk: LOW – adds safer cascade, no data change
-- Rollback: Revert to original FK constraints (no ON DELETE clause)

-- reminders.user_id: add ON DELETE CASCADE
-- When a user is deleted, their reminders should be deleted too.
ALTER TABLE reminders DROP CONSTRAINT IF EXISTS reminders_user_id_fkey;
ALTER TABLE reminders
  ADD CONSTRAINT reminders_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- working_time_templates.user_id: add ON DELETE CASCADE
-- When a user is deleted, their working time templates should be deleted too.
ALTER TABLE working_time_templates DROP CONSTRAINT IF EXISTS working_time_templates_user_id_fkey;
ALTER TABLE working_time_templates
  ADD CONSTRAINT working_time_templates_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
