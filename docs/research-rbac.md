# RBAC Research – IntelliPlan

> **Erstellt:** 2026-02-06  
> **Kontext:** IntelliPlan SaaS für Schweizer Schreinereien (Terminplanung + Projektmanagement)  
> **Stack:** Express.js + PostgreSQL + JWT Auth  
> **Status:** Research / Entscheidungsgrundlage

---

## Inhaltsverzeichnis

1. [Empfehlung: Flaches Rollenmodell vs. Permission-basiert (ABAC)](#1-empfehlung-flaches-rollenmodell-vs-permission-basiert)
2. [DB-Schema-Vorschlag (Migration SQL)](#2-db-schema-vorschlag)
3. [Best Practices Express.js RBAC Middleware](#3-best-practices-expressjs-rbac-middleware)
4. [Rollen-Matrix: Wer darf was](#4-rollen-matrix)
5. [Analyse ähnlicher Tools](#5-analyse-ähnlicher-tools)
6. [Implementierungs-Roadmap](#6-implementierungs-roadmap)

---

## 1. Empfehlung: Flaches Rollenmodell vs. Permission-basiert

### IST-Zustand

Aktuell gibt es 3 Rollen als `VARCHAR CHECK` in der `users`-Tabelle:

```sql
role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'single', 'team'))
```

- `admin` – Vollzugriff
- `single` – Einzelunternehmer (alles eigenes)
- `team` – Teammitglied

Die Rollen spiegeln **Pricing-Tiers** wider, nicht **Berechtigungslevel**. Für ein Schreinerei-Team braucht es granularere Abstufungen.

### Optionen im Vergleich

| Kriterium | Flaches Rollenmodell | Permission-basiert (RBAC+) | Vollständiges ABAC |
|---|---|---|---|
| **Komplexität** | ⭐ Einfach | ⭐⭐ Mittel | ⭐⭐⭐ Hoch |
| **Flexibilität** | Starr – neue Rolle = Code-Änderung | Gut – Rollen konfigurierbar | Maximal – beliebige Regeln |
| **Performance** | Kein DB-Lookup nötig (Role im JWT) | 1 Query für Permissions | Mehrere Queries / Policy-Engine |
| **Wartbarkeit** | Gut bei ≤5 Rollen | Gut bei ≤20 Permissions | Braucht Policy-Engine (Oso, Cerbos, Permify) |
| **SaaS-tauglich** | Nur mit Tier-Mapping | Ja, Rollen pro Team konfigurierbar | Ja, aber Overhead |
| **Passt für IntelliPlan** | ⚠️ Zu simpel | ✅ **Sweet Spot** | ❌ Overkill (aktuell) |

### Empfehlung: **Hybrid – Rollen mit festen Permissions**

Für IntelliPlan empfehle ich ein **hybrides Modell**:

1. **Feste Rollen** in der DB (nicht frei konfigurierbar durch User) – einfach, vorhersagbar
2. **Permissions als Code-Konstanten** (nicht in der DB) – schnell, kein zusätzlicher DB-Lookup
3. **Rollen-Permission-Mapping als TypeScript-Objekt** – zentral, testbar, versioniert
4. **Spätere Erweiterung möglich** auf DB-basierte Permissions wenn nötig (z.B. Enterprise-Plan)

**Begründung:**
- Eine Schreinerei mit 3-15 Mitarbeitern braucht keine frei konfigurierbaren Rollen
- Die Rollen sind branchen-spezifisch und vorhersagbar (Admin, Projektleiter, Monteur, Lehrling)
- Code-basierte Permissions sind schneller (kein DB-Roundtrip), einfacher zu testen und zu deployen
- Wenn später ein Enterprise-Kunde eigene Rollen will → Migration auf DB-Permissions ist straightforward

### Warum NICHT sofort volle DB-Permissions?

- **YAGNI** – 95% der Schreinereien kommen mit 4 festen Rollen aus
- **Performance** – Permission-Check auf jedem Request ohne DB-Query
- **Debugging** – Permissions im Code sind greifbar, nicht in einer DB-Tabelle versteckt
- **Testing** – Rollen-Matrix als Unit-Test abdeckbar

---

## 2. DB-Schema-Vorschlag

### Option A: Minimaler Ansatz (Empfohlen für Phase 1)

Nur die `users.role`-Spalte anpassen – Permissions leben im Code.

```sql
-- Migration: 027_update_user_roles
-- Description: Expand user roles for Schreinerei team structure
-- Separates billing tier (subscription_tier) from functional role

-- Step 1: Add subscription tier column (preserves pricing info)
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(20) 
  DEFAULT 'team' 
  CHECK (subscription_tier IN ('single', 'team', 'enterprise'));

-- Step 2: Migrate current role data to subscription_tier
-- 'single' users → subscription_tier = 'single'
-- 'admin' and 'team' users → subscription_tier = 'team'  
UPDATE users SET subscription_tier = CASE 
  WHEN role = 'single' THEN 'single'
  ELSE 'team'
END;

-- Step 3: Drop the old CHECK constraint and update role values
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- Migrate existing roles:
-- 'admin' → 'admin' (stays)
-- 'single' → 'admin' (single-user is admin of their own account)  
-- 'team' → 'monteur' (safest default, admin can upgrade)
UPDATE users SET role = CASE
  WHEN role = 'admin' THEN 'admin'
  WHEN role = 'single' THEN 'admin'
  WHEN role = 'team' THEN 'monteur'
  ELSE 'monteur'
END;

-- Step 4: Add new CHECK constraint with Schreinerei roles
ALTER TABLE users 
  ADD CONSTRAINT users_role_check 
  CHECK (role IN ('admin', 'projektleiter', 'monteur', 'lehrling'));

-- Step 5: Index for role-based queries
CREATE INDEX IF NOT EXISTS idx_users_subscription_tier ON users(subscription_tier);
```

### Option B: Volle DB-Permissions (für spätere Phase / Enterprise)

Falls in Zukunft konfigurierbare Rollen gewünscht:

```sql
-- Migration: 0XX_create_rbac_tables
-- Description: Full RBAC with DB-backed permissions

-- Rollen-Tabelle (erweiterbar, pro Team konfigurierbar)
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT FALSE,  -- Default-Rolle für neue Team-Mitglieder
  is_system BOOLEAN DEFAULT FALSE,   -- Vom System erstellt, nicht löschbar
  hierarchy_level INTEGER NOT NULL DEFAULT 0,  -- 0=höchste Berechtigung
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(team_id, name)
);

-- Permissions-Tabelle (System-definiert)
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,     -- z.B. 'projects:create'
  display_name VARCHAR(200) NOT NULL,     -- z.B. 'Projekte erstellen'
  category VARCHAR(50) NOT NULL,          -- z.B. 'projects', 'tasks', 'users'
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rollen-Permission-Zuordnung
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- User-Rolle-Zuordnung (ersetzt users.role)
CREATE TABLE IF NOT EXISTS user_roles (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
  PRIMARY KEY (user_id, role_id)
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_roles_team ON roles(team_id);
CREATE INDEX IF NOT EXISTS idx_permissions_category ON permissions(category);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role_id);

-- Seed default permissions
INSERT INTO permissions (name, display_name, category) VALUES
  -- Projects
  ('projects:read',    'Projekte ansehen',      'projects'),
  ('projects:create',  'Projekte erstellen',    'projects'),
  ('projects:update',  'Projekte bearbeiten',   'projects'),
  ('projects:delete',  'Projekte löschen',      'projects'),
  -- Tasks
  ('tasks:read',       'Aufgaben ansehen',       'tasks'),
  ('tasks:create',     'Aufgaben erstellen',     'tasks'),
  ('tasks:update',     'Aufgaben bearbeiten',    'tasks'),
  ('tasks:delete',     'Aufgaben löschen',       'tasks'),
  ('tasks:assign',     'Aufgaben zuweisen',      'tasks'),
  -- Appointments
  ('appointments:read',   'Termine ansehen',      'appointments'),
  ('appointments:create', 'Termine erstellen',    'appointments'),
  ('appointments:update', 'Termine bearbeiten',   'appointments'),
  ('appointments:delete', 'Termine löschen',      'appointments'),
  -- Pendenzen
  ('pendenzen:read',    'Pendenzen ansehen',     'pendenzen'),
  ('pendenzen:create',  'Pendenzen erstellen',   'pendenzen'),
  ('pendenzen:update',  'Pendenzen bearbeiten',  'pendenzen'),
  ('pendenzen:delete',  'Pendenzen löschen',     'pendenzen'),
  -- Resources
  ('resources:read',    'Ressourcen ansehen',    'resources'),
  ('resources:create',  'Ressourcen erstellen',  'resources'),
  ('resources:update',  'Ressourcen bearbeiten', 'resources'),
  ('resources:delete',  'Ressourcen löschen',    'resources'),
  -- Users / Team
  ('users:read',        'Benutzer ansehen',      'users'),
  ('users:invite',      'Benutzer einladen',     'users'),
  ('users:update',      'Benutzer bearbeiten',   'users'),
  ('users:delete',      'Benutzer entfernen',    'users'),
  ('users:manage_roles','Rollen verwalten',      'users'),
  -- Settings
  ('settings:read',     'Einstellungen ansehen', 'settings'),
  ('settings:update',   'Einstellungen ändern',  'settings')
ON CONFLICT (name) DO NOTHING;
```

> **Empfehlung:** Starte mit Option A. Die Migration zu Option B ist jederzeit möglich, weil die Permission-Logik im Code gekapselt ist (siehe Abschnitt 3).

---

## 3. Best Practices Express.js RBAC Middleware

### Architektur-Prinzip

```
Request → Auth (JWT) → Role Loader → Permission Check → Controller
```

Der Permission-Check sollte **deklarativ** auf Route-Ebene sein, nicht imperativ im Controller.

### 3.1 Permission-Konstanten (zentral definiert)

```typescript
// src/auth/permissions.ts

export const Permission = {
  // Projects
  PROJECTS_READ:    'projects:read',
  PROJECTS_CREATE:  'projects:create',
  PROJECTS_UPDATE:  'projects:update',
  PROJECTS_DELETE:  'projects:delete',
  
  // Tasks
  TASKS_READ:       'tasks:read',
  TASKS_CREATE:     'tasks:create',
  TASKS_UPDATE:     'tasks:update',
  TASKS_DELETE:     'tasks:delete',
  TASKS_ASSIGN:     'tasks:assign',
  
  // Appointments
  APPOINTMENTS_READ:    'appointments:read',
  APPOINTMENTS_CREATE:  'appointments:create',
  APPOINTMENTS_UPDATE:  'appointments:update',
  APPOINTMENTS_DELETE:  'appointments:delete',
  
  // Pendenzen
  PENDENZEN_READ:    'pendenzen:read',
  PENDENZEN_CREATE:  'pendenzen:create',
  PENDENZEN_UPDATE:  'pendenzen:update',
  PENDENZEN_DELETE:  'pendenzen:delete',
  
  // Resources
  RESOURCES_READ:    'resources:read',
  RESOURCES_CREATE:  'resources:create',
  RESOURCES_UPDATE:  'resources:update',
  RESOURCES_DELETE:  'resources:delete',
  
  // Users / Team Management
  USERS_READ:         'users:read',
  USERS_INVITE:       'users:invite',
  USERS_UPDATE:       'users:update',
  USERS_DELETE:       'users:delete',
  USERS_MANAGE_ROLES: 'users:manage_roles',
  
  // Settings
  SETTINGS_READ:    'settings:read',
  SETTINGS_UPDATE:  'settings:update',
} as const;

export type PermissionKey = typeof Permission[keyof typeof Permission];
```

### 3.2 Rollen-Permission-Mapping (die eigentliche Matrix)

```typescript
// src/auth/role-permissions.ts

import { Permission, type PermissionKey } from './permissions';

export type UserRole = 'admin' | 'projektleiter' | 'monteur' | 'lehrling';

/**
 * Zentrale Rollen-Permission-Matrix.
 * 
 * Hierarchie: admin > projektleiter > monteur > lehrling
 * Jede Rolle erbt NICHT automatisch von der darunterliegenden –
 * alle Permissions sind explizit, um Überraschungen zu vermeiden.
 */
export const ROLE_PERMISSIONS: Record<UserRole, ReadonlySet<PermissionKey>> = {
  admin: new Set([
    // Alles
    ...Object.values(Permission),
  ]),

  projektleiter: new Set([
    // Projects: Vollzugriff
    Permission.PROJECTS_READ,
    Permission.PROJECTS_CREATE,
    Permission.PROJECTS_UPDATE,
    Permission.PROJECTS_DELETE,
    // Tasks: Vollzugriff
    Permission.TASKS_READ,
    Permission.TASKS_CREATE,
    Permission.TASKS_UPDATE,
    Permission.TASKS_DELETE,
    Permission.TASKS_ASSIGN,
    // Appointments: Vollzugriff
    Permission.APPOINTMENTS_READ,
    Permission.APPOINTMENTS_CREATE,
    Permission.APPOINTMENTS_UPDATE,
    Permission.APPOINTMENTS_DELETE,
    // Pendenzen: Vollzugriff
    Permission.PENDENZEN_READ,
    Permission.PENDENZEN_CREATE,
    Permission.PENDENZEN_UPDATE,
    Permission.PENDENZEN_DELETE,
    // Resources: Lesen + Bearbeiten
    Permission.RESOURCES_READ,
    Permission.RESOURCES_UPDATE,
    // Users: Nur lesen
    Permission.USERS_READ,
    // Settings: Lesen
    Permission.SETTINGS_READ,
  ]),

  monteur: new Set([
    // Projects: Nur lesen
    Permission.PROJECTS_READ,
    // Tasks: Lesen + eigene bearbeiten
    Permission.TASKS_READ,
    Permission.TASKS_UPDATE,  // Nur eigene – wird im Service geprüft
    // Appointments: Lesen + eigene bearbeiten
    Permission.APPOINTMENTS_READ,
    Permission.APPOINTMENTS_UPDATE,  // Nur eigene
    // Pendenzen: Lesen + Erstellen + eigene bearbeiten
    Permission.PENDENZEN_READ,
    Permission.PENDENZEN_CREATE,
    Permission.PENDENZEN_UPDATE,  // Nur eigene
    // Resources: Lesen
    Permission.RESOURCES_READ,
    // Users: Eigenes Profil (implizit)
    Permission.USERS_READ,
  ]),

  lehrling: new Set([
    // Weitgehend Read-Only
    Permission.PROJECTS_READ,
    Permission.TASKS_READ,
    Permission.APPOINTMENTS_READ,
    Permission.PENDENZEN_READ,
    Permission.RESOURCES_READ,
    // Pendenzen erstellen (z.B. "Material fehlt")
    Permission.PENDENZEN_CREATE,
  ]),
};

/**
 * Prüft ob eine Rolle eine bestimmte Permission hat
 */
export function roleHasPermission(role: UserRole, permission: PermissionKey): boolean {
  return ROLE_PERMISSIONS[role]?.has(permission) ?? false;
}

/**
 * Gibt alle Permissions einer Rolle zurück
 */
export function getPermissionsForRole(role: UserRole): ReadonlySet<PermissionKey> {
  return ROLE_PERMISSIONS[role] ?? new Set();
}
```

### 3.3 Middleware (erweitert bestehende `roleMiddleware.ts`)

```typescript
// src/middleware/roleMiddleware.ts (erweitert)

import type { Request, Response, NextFunction } from 'express';
import { type PermissionKey } from '../auth/permissions';
import { roleHasPermission, type UserRole } from '../auth/role-permissions';

/**
 * Prüft ob der eingeloggte User die benötigte Permission hat.
 * 
 * Verwendung in Routes:
 *   router.post('/', requirePermission('projects:create'), controller.create);
 *   router.delete('/:id', requirePermission('projects:delete'), controller.remove);
 */
export function requirePermission(...requiredPermissions: PermissionKey[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // User muss bereits geladen sein (durch requireUserId + loadUser)
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const userRole = req.user.role as UserRole;
      
      // Alle angegebenen Permissions müssen vorhanden sein (AND-Logik)
      const hasAll = requiredPermissions.every(perm => 
        roleHasPermission(userRole, perm)
      );

      if (!hasAll) {
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions',
          required: requiredPermissions,
        });
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Prüft ob der User MINDESTENS EINE der Permissions hat (OR-Logik).
 * 
 * Nützlich für: "Darf entweder Tasks bearbeiten ODER ist Admin"
 */
export function requireAnyPermission(...permissions: PermissionKey[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const userRole = req.user.role as UserRole;
    const hasAny = permissions.some(perm => roleHasPermission(userRole, perm));

    if (!hasAny) {
      res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
      });
      return;
    }

    next();
  };
}

/**
 * Helper: Prüft im Service-Layer ob User "Eigentümer" ist.
 * Für Monteur/Lehrling die nur eigene Einträge bearbeiten dürfen.
 */
export function isOwnerOrRole(
  userId: string, 
  resourceOwnerId: string | null, 
  userRole: UserRole, 
  ...allowedRoles: UserRole[]
): boolean {
  if (allowedRoles.includes(userRole)) return true;
  return userId === resourceOwnerId;
}
```

### 3.4 Verwendung in Routes

```typescript
// src/routes/projects.ts (Beispiel)

import { Router } from 'express';
import { Permission } from '../auth/permissions';
import { requireUserId, loadUser, requirePermission } from '../middleware/roleMiddleware';
import * as projectController from '../controllers/projectController';

const router = Router();

// Auth-Basis für alle Project-Routes
router.use(requireUserId);
router.use(loadUser);

// Lesen – alle Rollen mit projects:read
router.get('/',    requirePermission(Permission.PROJECTS_READ), projectController.list);
router.get('/:id', requirePermission(Permission.PROJECTS_READ), projectController.getById);

// Schreiben – nur mit entsprechender Permission
router.post('/',       requirePermission(Permission.PROJECTS_CREATE), projectController.create);
router.put('/:id',     requirePermission(Permission.PROJECTS_UPDATE), projectController.update);
router.delete('/:id',  requirePermission(Permission.PROJECTS_DELETE), projectController.remove);

export default router;
```

### 3.5 Best Practices Zusammenfassung

| Practice | Erklärung |
|---|---|
| **Permissions im Code, nicht in DB** | Schneller, testbarer, versioniert mit Git |
| **Deklarativ auf Route-Ebene** | `requirePermission('projects:create')` statt if/else im Controller |
| **Ownership-Check im Service** | Monteur darf nur eigene Tasks bearbeiten → Service-Layer prüft `task.assignee_id === userId` |
| **Permission-Naming: `entity:action`** | Konsistent, greppbar, erweiterbar |
| **Keine Role-Checks in Controllers** | Controller kennt keine Rollen, nur die Middleware |
| **Audit-Log bei sensiblen Aktionen** | Delete, Rollenänderung → `audit_logs` Tabelle (existiert bereits!) |
| **JWT enthält nur `userId` + `role`** | Permissions NICHT im JWT (sonst Token-Refresh-Problem bei Rollenänderung) |
| **Tests für die Permission-Matrix** | Unit-Test der sicherstellt dass Lehrling kein `projects:delete` hat |

---

## 4. Rollen-Matrix

### Rollen-Beschreibung für Schreinereien

| Rolle | Typische Person | Beschreibung |
|---|---|---|
| **Admin** | Geschäftsinhaber, IT-Verantwortlicher | Vollzugriff, Benutzerverwaltung, Einstellungen |
| **Projektleiter** | Werkstattleiter, Senior-Schreiner | Projekte managen, Tasks zuweisen, Termine planen |
| **Monteur** | Schreiner, Monteur | Eigene Aufgaben bearbeiten, Pendenzen erfassen |
| **Lehrling** | Lehrling, Praktikant | Read-only + Pendenzen erstellen |

### Detaillierte CRUD-Matrix

#### Legende
- ✅ = Vollzugriff
- 🔵 = Nur eigene Einträge
- 👁️ = Nur lesen
- ❌ = Kein Zugriff

#### Projects

| Aktion | Admin | Projektleiter | Monteur | Lehrling |
|---|:---:|:---:|:---:|:---:|
| List / Read | ✅ | ✅ | 👁️ | 👁️ |
| Create | ✅ | ✅ | ❌ | ❌ |
| Update | ✅ | ✅ | ❌ | ❌ |
| Delete | ✅ | ✅ | ❌ | ❌ |
| Apply Template | ✅ | ✅ | ❌ | ❌ |
| Auto-Schedule | ✅ | ✅ | ❌ | ❌ |

#### Tasks

| Aktion | Admin | Projektleiter | Monteur | Lehrling |
|---|:---:|:---:|:---:|:---:|
| List / Read | ✅ | ✅ | ✅ (Team-Tasks) | 👁️ |
| Create | ✅ | ✅ | ❌ | ❌ |
| Update | ✅ | ✅ | 🔵 (zugewiesene) | ❌ |
| Delete | ✅ | ✅ | ❌ | ❌ |
| Assign | ✅ | ✅ | ❌ | ❌ |
| Status ändern | ✅ | ✅ | 🔵 (zugewiesene) | ❌ |

#### Appointments (Termine)

| Aktion | Admin | Projektleiter | Monteur | Lehrling |
|---|:---:|:---:|:---:|:---:|
| List / Read | ✅ | ✅ | ✅ (eigene + Team) | 👁️ |
| Create | ✅ | ✅ | ❌ | ❌ |
| Update | ✅ | ✅ | 🔵 (eigene) | ❌ |
| Delete | ✅ | ✅ | ❌ | ❌ |

#### Pendenzen

| Aktion | Admin | Projektleiter | Monteur | Lehrling |
|---|:---:|:---:|:---:|:---:|
| List / Read | ✅ | ✅ | ✅ | 👁️ |
| Create | ✅ | ✅ | ✅ | ✅ |
| Update | ✅ | ✅ | 🔵 (eigene) | ❌ |
| Delete | ✅ | ✅ | ❌ | ❌ |
| Status ändern | ✅ | ✅ | 🔵 (zugewiesene) | ❌ |

> **Pendenzen sind die Ausnahme:** Auch Lehrlinge können Pendenzen erstellen (z.B. "Material fehlt", "Werkzeug defekt"). Das ist bewusst – Pendenzen sind ein niederschwelliges Erfassungstool.

#### Resources (Mitarbeiter, Maschinen)

| Aktion | Admin | Projektleiter | Monteur | Lehrling |
|---|:---:|:---:|:---:|:---:|
| List / Read | ✅ | ✅ | 👁️ | 👁️ |
| Create | ✅ | ❌ | ❌ | ❌ |
| Update | ✅ | ✅ | ❌ | ❌ |
| Delete | ✅ | ❌ | ❌ | ❌ |

#### Users (Benutzerverwaltung)

| Aktion | Admin | Projektleiter | Monteur | Lehrling |
|---|:---:|:---:|:---:|:---:|
| List / Read | ✅ | 👁️ | 👁️ (Basis-Info) | ❌ |
| Invite | ✅ | ❌ | ❌ | ❌ |
| Update | ✅ | ❌ | 🔵 (eigenes Profil) | 🔵 (eigenes Profil) |
| Delete / Deactivate | ✅ | ❌ | ❌ | ❌ |
| Rollen verwalten | ✅ | ❌ | ❌ | ❌ |

#### Settings (Team-Einstellungen)

| Aktion | Admin | Projektleiter | Monteur | Lehrling |
|---|:---:|:---:|:---:|:---:|
| Read | ✅ | ✅ | ❌ | ❌ |
| Update | ✅ | ❌ | ❌ | ❌ |

### Ownership-Regeln (Service-Layer)

Die Permission-Middleware prüft nur "darf der User grundsätzlich Tasks updaten?". Die **Ownership-Logik** lebt im Service:

```typescript
// Beispiel: taskService.ts
async function updateTask(taskId: string, userId: string, userRole: UserRole, data: TaskUpdate) {
  const task = await getTaskById(taskId);
  
  // Admin und Projektleiter dürfen alle Tasks bearbeiten
  if (userRole === 'admin' || userRole === 'projektleiter') {
    return doUpdate(task, data);
  }
  
  // Monteur darf nur zugewiesene Tasks bearbeiten
  if (userRole === 'monteur') {
    if (task.resource_id !== userId && task.assignee_id !== userId) {
      throw new ForbiddenError('Can only update assigned tasks');
    }
    // Monteur darf nur bestimmte Felder ändern (Status, Notizen)
    return doUpdate(task, pick(data, ['status', 'notes', 'actual_hours']));
  }
  
  throw new ForbiddenError('Insufficient permissions');
}
```

---

## 5. Analyse ähnlicher Tools

### 5.1 Asana

**Modell:** Zweiebenen-RBAC (Org-Level + Projekt-Level)

**Org-Level Rollen:**
- **Super Admin** – Vollzugriff, Billing, SSO, Compliance
- **Admin** – User-Verwaltung, Org-Einstellungen
- **Member** – Standard-Benutzer, kann Projekte erstellen
- **Guest** – Eingeschränkt, nur eingeladene Projekte

**Projekt-Level Rollen:**
- **Admin** – Projekt verwalten, Einstellungen, löschen
- **Editor** – Tasks erstellen/bearbeiten
- **Commenter** – Kommentieren, aber nicht bearbeiten
- **Viewer** – Nur lesen

**Takeaway für IntelliPlan:**
- Asana trennt Org-Rollen von Projekt-Rollen → für IntelliPlan (kleine Teams) zu komplex
- Die Idee von "Commenter" ist interessant – könnte für Lehrlinge relevant sein (Pendenzen = Kommentare?)
- Asanas Gast-Konzept ist für Subunternehmer relevant (spätere Phase)

### 5.2 Monday.com

**Modell:** Flache Account-Rollen + Board-Level Permissions

**Account-Rollen (Basis):**
- **Admin** – Account-Verwaltung, Billing, alle Boards
- **Member** – Standard-Zugriff, kann Boards erstellen
- **Viewer** – Read-only auf allen geteilten Boards
- **Guest** – Nur explizit geteilte Boards

**Custom Roles (Enterprise):**
- Basierend auf Basis-Rollen, aber mit granularen Overrides
- z.B. "Member der keine Boards löschen darf"

**Board-Level:**
- **Owner** – Board-Einstellungen, Permissions
- **Subscriber** – View-Only oder Edit (konfigurierbar)

**Takeaway für IntelliPlan:**
- Monday.com zeigt: 4 Basis-Rollen reichen für 90% der Kunden
- Custom Roles nur im Enterprise-Plan → bestätigt unseren Phasen-Ansatz
- Board-Level Permissions ≈ Projekt-Level Permissions (interessant für Phase 2)

### 5.3 Borm (BormBusiness ERP)

**Modell:** Rollenbasierte Regeln + individuelle Oberflächen

**Aus der Recherche:**
- Borm nutzt "durch Rollen gesteuerte Regelerstellung"
- Frei definierbare Datenfelder + individuelle Benutzeroberflächen pro Rolle
- Mandantenfähig (Multi-Tenant, wie IntelliPlan's Team-Konzept)
- Fokus auf Schreinerei/Innenausbau-Workflow

**Typische Rollen in Borm-Umgebungen:**
- Geschäftsleitung (= Admin)
- Projektleiter / AVOR
- Werkstatt / Produktion (= Monteur)
- Büro / Sachbearbeitung
- Lehrling (eingeschränkt)

**Takeaway für IntelliPlan:**
- Borm bestätigt die Schreinerei-Rollenstruktur: Geschäftsleitung → Projektleiter → Werkstatt → Lehrling
- Borm hat fein-granulare Feld-Level Berechtigungen (z.B. Lehrling sieht keine Preise) → für IntelliPlan Phase 2
- Die AVOR-Rolle (Arbeitsvorbereitung) könnte für IntelliPlan relevant werden

### 5.4 Zusammenfassung der Analyse

| Feature | Asana | Monday.com | Borm | **IntelliPlan (Empfohlen)** |
|---|---|---|---|---|
| Basis-Rollen | 4 (Org) | 4 (Account) | ~5 | **4** |
| Projekt-Level Rollen | Ja (4) | Ja (Owner/Sub) | Ja | **Phase 2** |
| Custom Roles | Enterprise | Enterprise | Ja (komplex) | **Phase 3 / Enterprise** |
| Feld-Level Permissions | Nein | Teilweise | Ja | **Phase 2** |
| Gast-Zugang | Ja | Ja | Nein | **Phase 2** (Subunternehmer) |

---

## 6. Implementierungs-Roadmap

### Phase 1: Basis-RBAC (empfohlen – jetzt)

**Aufwand:** ~2-3 Tage

1. ✅ Migration `027_update_user_roles` ausführen (Role-Spalte erweitern)
2. ✅ `permissions.ts` + `role-permissions.ts` erstellen
3. ✅ `roleMiddleware.ts` um `requirePermission()` erweitern
4. ✅ Alle Routes mit Permission-Guards versehen
5. ✅ Ownership-Checks in kritische Services einbauen (Tasks, Pendenzen)
6. ✅ Frontend: Rolle im Auth-Context, UI-Elemente conditional rendern
7. ✅ Tests: Unit-Tests für Permission-Matrix + Integration-Tests für geschützte Routes

**Resultat:** 4 feste Rollen, Code-basierte Permissions, kein DB-Overhead.

### Phase 2: Erweiterte Features (bei Bedarf)

**Trigger:** Erste Kunden-Feedbacks, Subunternehmer-Anforderung

- Projekt-Level Permissions (z.B. Monteur sieht nur zugewiesene Projekte)
- Gast-Rolle für Subunternehmer (zeitlich limitiert)
- Feld-Level Permissions (z.B. Lehrling sieht keine Stundensätze)
- Audit-Log erweitern für Permission-Changes

### Phase 3: Enterprise / Custom Roles (langfristig)

**Trigger:** Enterprise-Plan, Kunden mit >20 Mitarbeitern

- Migration zu DB-basierten Permissions (Option B Schema)
- Custom Roles UI im Admin-Bereich
- Role-Templates (Vorlagen für typische Schreinerei-Setups)
- AVOR-Rolle, Büro-Rolle als Templates

---

## Quellen & weiterführende Links

- [Permify – RBAC in Node.js/Express](https://permify.co/post/role-based-access-control-rbac-nodejs-expressjs/)
- [Cerbos – Authorization in Express](https://www.cerbos.dev/blog/implement-authorization-in-express)
- [Oso – How to Build RBAC](https://www.osohq.com/learn/rbac-role-based-access-control)
- [Asana Permissions](https://asana.com/features/admin-security/permissions)
- [Monday.com Account Roles API](https://developer.monday.com/api-reference/reference/account-roles)
- [Monday.com User Types](https://support.monday.com/hc/en-us/articles/360002144900-User-types-explained)
- [Borm Informatik – ERP für Schreinereien](https://www.borm-informatik.de/erp-fuer-innenausbauer/)
