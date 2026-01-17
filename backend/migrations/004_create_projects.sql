-- Migration: 004_create_projects
-- Description: Create projects table

CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    owner_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    include_weekends BOOLEAN NOT NULL DEFAULT TRUE,
    workday_start TIME NOT NULL DEFAULT '08:00',
    workday_end TIME NOT NULL DEFAULT '17:00',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_projects_name ON projects(name);
