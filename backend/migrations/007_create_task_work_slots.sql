-- Migration: 007_create_task_work_slots
-- Description: Create task work slots table

CREATE TABLE IF NOT EXISTS task_work_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    is_fixed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_task_work_slots_task_id ON task_work_slots(task_id);
CREATE INDEX IF NOT EXISTS idx_task_work_slots_start_time ON task_work_slots(start_time);
