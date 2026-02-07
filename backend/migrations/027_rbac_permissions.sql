-- Migration: 027_rbac_permissions
-- Description: RBAC permission system with permissions table, role_permissions mapping,
--              and expanded user roles for Elektro/Sanitär project management.

-- 1. Expand the role CHECK constraint to include new roles
--    Old: ('admin', 'single', 'team')
--    New: ('admin', 'single', 'team', 'projektleiter', 'monteur', 'lehrling')
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'single', 'team', 'projektleiter', 'monteur', 'lehrling'));

-- 2. Permissions table
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Role-permission mapping
CREATE TABLE IF NOT EXISTS role_permissions (
  role VARCHAR(50) NOT NULL,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);

-- 4. Seed permissions
INSERT INTO permissions (name, description) VALUES
  -- Projects
  ('projects:read',         'Projekte anzeigen'),
  ('projects:write',        'Projekte erstellen und bearbeiten'),
  ('projects:delete',       'Projekte löschen'),
  -- Tasks
  ('tasks:read',            'Aufgaben anzeigen'),
  ('tasks:write',           'Aufgaben erstellen und bearbeiten'),
  ('tasks:delete',          'Aufgaben löschen'),
  ('tasks:assign',          'Aufgaben zuweisen'),
  -- Appointments
  ('appointments:read',     'Termine anzeigen'),
  ('appointments:write',    'Termine erstellen und bearbeiten'),
  ('appointments:delete',   'Termine löschen'),
  -- Resources
  ('resources:read',        'Ressourcen anzeigen'),
  ('resources:write',       'Ressourcen erstellen und bearbeiten'),
  ('resources:delete',      'Ressourcen löschen'),
  -- Pendenzen
  ('pendenzen:read',        'Pendenzen anzeigen'),
  ('pendenzen:write',       'Pendenzen erstellen und bearbeiten'),
  ('pendenzen:delete',      'Pendenzen löschen'),
  -- Users / Team management
  ('users:read',            'Benutzer anzeigen'),
  ('users:write',           'Benutzer verwalten'),
  ('users:delete',          'Benutzer löschen'),
  -- Reports
  ('reports:read',          'Berichte anzeigen'),
  ('reports:export',        'Berichte exportieren'),
  -- Settings
  ('settings:read',         'Einstellungen anzeigen'),
  ('settings:write',        'Einstellungen ändern'),
  -- Templates
  ('templates:read',        'Vorlagen anzeigen'),
  ('templates:write',       'Vorlagen erstellen und bearbeiten'),
  ('templates:delete',      'Vorlagen löschen')
ON CONFLICT (name) DO NOTHING;

-- 5. Seed role-permission mappings
-- admin: everything
INSERT INTO role_permissions (role, permission_id)
SELECT 'admin', id FROM permissions
ON CONFLICT DO NOTHING;

-- projektleiter: almost everything except user management and settings
INSERT INTO role_permissions (role, permission_id)
SELECT 'projektleiter', id FROM permissions
WHERE name IN (
  'projects:read', 'projects:write',
  'tasks:read', 'tasks:write', 'tasks:delete', 'tasks:assign',
  'appointments:read', 'appointments:write', 'appointments:delete',
  'resources:read', 'resources:write',
  'pendenzen:read', 'pendenzen:write', 'pendenzen:delete',
  'users:read',
  'reports:read', 'reports:export',
  'settings:read',
  'templates:read', 'templates:write', 'templates:delete'
)
ON CONFLICT DO NOTHING;

-- monteur: read most things, write tasks and pendenzen
INSERT INTO role_permissions (role, permission_id)
SELECT 'monteur', id FROM permissions
WHERE name IN (
  'projects:read',
  'tasks:read', 'tasks:write',
  'appointments:read',
  'resources:read',
  'pendenzen:read', 'pendenzen:write',
  'reports:read',
  'templates:read'
)
ON CONFLICT DO NOTHING;

-- lehrling: read-only with limited write on own tasks
INSERT INTO role_permissions (role, permission_id)
SELECT 'lehrling', id FROM permissions
WHERE name IN (
  'projects:read',
  'tasks:read',
  'appointments:read',
  'resources:read',
  'pendenzen:read',
  'templates:read'
)
ON CONFLICT DO NOTHING;

-- Legacy roles: map existing 'single' and 'team' roles
-- single: same as projektleiter
INSERT INTO role_permissions (role, permission_id)
SELECT 'single', id FROM permissions
WHERE name IN (
  'projects:read', 'projects:write', 'projects:delete',
  'tasks:read', 'tasks:write', 'tasks:delete', 'tasks:assign',
  'appointments:read', 'appointments:write', 'appointments:delete',
  'resources:read', 'resources:write', 'resources:delete',
  'pendenzen:read', 'pendenzen:write', 'pendenzen:delete',
  'reports:read', 'reports:export',
  'settings:read', 'settings:write',
  'templates:read', 'templates:write', 'templates:delete'
)
ON CONFLICT DO NOTHING;

-- team: same as single (team-level features handled by team_id)
INSERT INTO role_permissions (role, permission_id)
SELECT 'team', id FROM permissions
WHERE name IN (
  'projects:read', 'projects:write', 'projects:delete',
  'tasks:read', 'tasks:write', 'tasks:delete', 'tasks:assign',
  'appointments:read', 'appointments:write', 'appointments:delete',
  'resources:read', 'resources:write', 'resources:delete',
  'pendenzen:read', 'pendenzen:write', 'pendenzen:delete',
  'reports:read', 'reports:export',
  'settings:read', 'settings:write',
  'templates:read', 'templates:write', 'templates:delete'
)
ON CONFLICT DO NOTHING;
