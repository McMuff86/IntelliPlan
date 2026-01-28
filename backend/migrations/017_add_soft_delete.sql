-- Add soft delete support for projects and tasks
ALTER TABLE projects ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Index for efficient filtering of non-deleted records
CREATE INDEX IF NOT EXISTS idx_projects_deleted_at ON projects (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_deleted_at ON tasks (deleted_at) WHERE deleted_at IS NULL;
