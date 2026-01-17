-- Migration: 006_create_task_dependencies
-- Description: Create task dependencies table

CREATE TABLE IF NOT EXISTS task_dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
    depends_on_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
    dependency_type VARCHAR(20) NOT NULL CHECK (dependency_type IN ('finish_start', 'start_start', 'finish_finish')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CHECK (task_id <> depends_on_task_id),
    UNIQUE (task_id, depends_on_task_id, dependency_type)
);

CREATE INDEX IF NOT EXISTS idx_task_dependencies_task_id ON task_dependencies(task_id);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_depends_on_task_id ON task_dependencies(depends_on_task_id);
