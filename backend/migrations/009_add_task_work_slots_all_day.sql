-- Migration: 009_add_task_work_slots_all_day
-- Description: Add all-day flag to task work slots

ALTER TABLE task_work_slots
ADD COLUMN IF NOT EXISTS is_all_day BOOLEAN NOT NULL DEFAULT FALSE;
