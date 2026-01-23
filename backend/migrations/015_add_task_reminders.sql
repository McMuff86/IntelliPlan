ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS reminder_enabled boolean NOT NULL DEFAULT false;

ALTER TABLE task_work_slots
  ADD COLUMN IF NOT EXISTS reminder_enabled boolean NOT NULL DEFAULT false;
