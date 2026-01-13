-- Migration: 003_create_appointments
-- Description: Create appointments table

CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    timezone VARCHAR(100) NOT NULL DEFAULT 'UTC',
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_start_time ON appointments(start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_end_time ON appointments(end_time);
CREATE INDEX IF NOT EXISTS idx_appointments_deleted_at ON appointments(deleted_at);

-- Constraint: end_time must be after start_time
ALTER TABLE appointments ADD CONSTRAINT chk_appointments_time_order 
    CHECK (end_time > start_time);
