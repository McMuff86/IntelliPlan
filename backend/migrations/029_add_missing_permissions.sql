-- Migration: 029_add_missing_permissions
-- Description: Add reminders permissions that were missing from the initial RBAC seed.
--              Routes now require reminders:read/write/delete permissions.

-- Add missing permissions
INSERT INTO permissions (name, description) VALUES
  ('reminders:read',   'Erinnerungen anzeigen'),
  ('reminders:write',  'Erinnerungen erstellen und bearbeiten'),
  ('reminders:delete', 'Erinnerungen löschen')
ON CONFLICT (name) DO NOTHING;

-- admin: gets all new permissions
INSERT INTO role_permissions (role, permission_id)
SELECT 'admin', id FROM permissions
WHERE name IN ('reminders:read', 'reminders:write', 'reminders:delete')
ON CONFLICT DO NOTHING;

-- projektleiter: full reminders access
INSERT INTO role_permissions (role, permission_id)
SELECT 'projektleiter', id FROM permissions
WHERE name IN ('reminders:read', 'reminders:write', 'reminders:delete')
ON CONFLICT DO NOTHING;

-- monteur: read + write reminders (own)
INSERT INTO role_permissions (role, permission_id)
SELECT 'monteur', id FROM permissions
WHERE name IN ('reminders:read', 'reminders:write')
ON CONFLICT DO NOTHING;

-- lehrling: read only
INSERT INTO role_permissions (role, permission_id)
SELECT 'lehrling', id FROM permissions
WHERE name IN ('reminders:read')
ON CONFLICT DO NOTHING;

-- single: full access (same as projektleiter)
INSERT INTO role_permissions (role, permission_id)
SELECT 'single', id FROM permissions
WHERE name IN ('reminders:read', 'reminders:write', 'reminders:delete')
ON CONFLICT DO NOTHING;

-- team: full access
INSERT INTO role_permissions (role, permission_id)
SELECT 'team', id FROM permissions
WHERE name IN ('reminders:read', 'reminders:write', 'reminders:delete')
ON CONFLICT DO NOTHING;
