-- Migration: 010_add_tasks_resource_label
-- Description: Add resource label to tasks

ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS resource_label VARCHAR(255);
