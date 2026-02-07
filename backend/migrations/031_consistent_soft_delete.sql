-- Migration: 031_consistent_soft_delete
-- Description: Standardize soft-delete pattern across all major tables.
--              Currently: projects/tasks/appointments use deleted_at,
--              pendenzen uses archived_at (kept – semantically correct),
--              resources uses is_active boolean (adding deleted_at alongside).
-- Risk: LOW – adds nullable columns, no data change
-- App code: Queries should use WHERE deleted_at IS NULL for active records.

-- ============================================================
-- Resources: add deleted_at pattern alongside existing is_active
-- Migrate existing deactivated resources: is_active=false → deleted_at=NOW()
-- ============================================================
ALTER TABLE resources
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Backfill: deactivated resources get deleted_at set
UPDATE resources SET deleted_at = NOW() WHERE is_active = false AND deleted_at IS NULL;

-- Partial index for active resource queries
CREATE INDEX IF NOT EXISTS idx_resources_active
  ON resources(id) WHERE deleted_at IS NULL;

-- ============================================================
-- Reminders: add soft delete
-- ============================================================
ALTER TABLE reminders
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_reminders_active
  ON reminders(id) WHERE deleted_at IS NULL;

-- ============================================================
-- Users: add soft delete (GDPR: "delete" without hard-deleting)
-- ============================================================
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_users_active
  ON users(id) WHERE deleted_at IS NULL;

-- ============================================================
-- Teams: add soft delete
-- ============================================================
ALTER TABLE teams
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- ============================================================
-- NOTE: pendenzen.archived_at is NOT renamed to deleted_at.
-- "Archiviert" is a distinct semantic concept (completed/filed away)
-- vs. "gelöscht" (removed/trashed). Both can coexist.
-- ============================================================
