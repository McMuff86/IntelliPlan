-- Migration: 038_add_resources_deleted_at
-- Add soft delete support for resources table (referenced by services but was missing)

ALTER TABLE resources ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_resources_deleted_at ON resources (deleted_at) WHERE deleted_at IS NULL;

-- Recreate the short_code unique index to include deleted_at filter
DROP INDEX IF EXISTS idx_resources_short_code;
CREATE UNIQUE INDEX IF NOT EXISTS idx_resources_short_code
  ON resources(short_code) WHERE short_code IS NOT NULL AND deleted_at IS NULL;
