-- Migration: 012_add_tasks_resource_id
-- Description: Add resource assignment to tasks

ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS resource_id UUID REFERENCES resources(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_resource_id ON tasks(resource_id);
