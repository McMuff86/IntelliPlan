-- Migration: 035_extend_projects
-- Description: Extend projects table with carpentry-specific fields for Wochenplan

ALTER TABLE projects ADD COLUMN IF NOT EXISTS order_number VARCHAR(50);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS customer_name VARCHAR(200);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS installation_location VARCHAR(200);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS color VARCHAR(100);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS contact_name VARCHAR(200);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(50);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS needs_callback BOOLEAN DEFAULT false;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS sachbearbeiter VARCHAR(20);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS worker_count NUMERIC(4,1);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS helper_count NUMERIC(4,1);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS remarks TEXT;
