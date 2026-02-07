# IntelliPlan – Datenbank-Verbesserungsplan

> **Erstellt:** 2026-02-06  
> **Basierend auf:** Migrationen 000–026  
> **DB-Engine:** PostgreSQL (via pgcrypto)  
> **Aktueller Auth-Stack:** Express + JWT (Supabase geplant)

---

## Inhaltsverzeichnis

1. [Audit der aktuellen Struktur](#1-audit-der-aktuellen-struktur)
2. [Verbesserungsvorschläge (priorisiert)](#2-verbesserungsvorschläge-priorisiert)
3. [Migrations-Plan (Top-5)](#3-migrations-plan-top-5)
4. [Supabase-Migration Roadmap](#4-supabase-migration-roadmap)

---

## 1. Audit der aktuellen Struktur

### 1.1 Tabellen-Übersicht (rekonstruiert aus Migrationen)

| Tabelle | PK | Soft-Delete | updated_at Trigger | Sprache |
|---|---|---|---|---|
| teams | UUID | ❌ | ❌ | EN |
| users | UUID | ❌ | ❌ | EN |
| appointments | UUID | ✅ (deleted_at) | ❌ | EN |
| projects | UUID | ✅ (deleted_at, Mig. 017) | ❌ | EN |
| tasks | UUID | ✅ (deleted_at, Mig. 017) | ❌ | EN |
| task_dependencies | UUID | ❌ | ❌ | EN |
| task_work_slots | UUID | ❌ | ❌ | EN |
| project_activity | UUID | ❌ | ❌ | EN |
| resources | UUID | ❌ (aber `is_active`) | ❌ | EN |
| reminders | UUID | ❌ | ❌ | EN |
| working_time_templates | UUID | ❌ | ❌ | EN |
| working_time_slots | UUID | ❌ | ❌ | EN |
| audit_logs | UUID | ❌ | ❌ | EN |
| industries | UUID | ❌ | ❌ | EN |
| product_types | UUID | ❌ | ❌ | EN |
| task_templates | UUID | ❌ | ❌ | EN |
| pendenzen | UUID | ❌ (aber `archived_at`) | ✅ | **DE** |
| pendenzen_historie | UUID | ❌ | ❌ | **DE** |

### 1.2 Inkonsistenzen

#### Sprache / Naming

| Problem | Beispiel | Schwere |
|---|---|---|
| **Deutsch/Englisch Mix** | `pendenzen`, `beschreibung`, `verantwortlich_id`, `faellig_bis`, `erledigt_am`, `bemerkungen`, `auftragsnummer` vs. `appointments`, `description`, `due_date` | 🟡 |
| **Deutsche ENUMs** | `pendenz_bereich`, `pendenz_prioritaet` mit Werten wie `'avor'`, `'hoch'`, `'mittel'` vs. englische CHECK-Values `'planned'`, `'in_progress'` | 🟡 |
| **Inkonsistente Deaktivierung** | `deleted_at` (projects/tasks/appointments), `archived_at` (pendenzen), `is_active` (resources) – drei verschiedene Patterns | 🟡 |
| **Plural vs. Singular** | Alle Tabellen konsistent im Plural ✅ (kein Issue) | ✅ |

#### Soft-Delete / Archivierung – Inkonsistenz-Tabelle

```
Pattern 1: deleted_at TIMESTAMPTZ     → projects, tasks, appointments
Pattern 2: archived_at TIMESTAMPTZ    → pendenzen
Pattern 3: is_active BOOLEAN          → resources
Pattern 4: kein Soft-Delete           → teams, users, reminders, task_dependencies, ...
```

**Risiko:** Queries müssen je nach Tabelle andere Logik nutzen. Fehlerquelle bei JOINs.

#### `updated_at` – Kein automatischer Trigger

- `updated_at` existiert auf: users, appointments, projects, tasks, task_work_slots, resources, reminders, working_time_templates, product_types, task_templates, pendenzen
- **Nur `pendenzen` hat einen Trigger** (`trg_pendenzen_updated_at`)
- Alle anderen Tabellen verlassen sich darauf, dass die App `updated_at` setzt → **fragil**

#### `created_at` Defaults

- Meiste Tabellen: `DEFAULT NOW()` ✅
- Konsistenz bei `TIMESTAMPTZ` vs. `TIMESTAMP WITH TIME ZONE`: beides dasselbe in PostgreSQL, aber im Code mixed ✅ (kein echtes Problem)

### 1.3 Fehlende Indizes

| Tabelle | Fehlender Index | Begründung |
|---|---|---|
| **projects** | `idx_projects_deleted_at` WHERE deleted_at IS NULL existiert ✅ | — |
| **appointments** | Composite Index `(user_id, start_time)` | Kalender-Queries filtern fast immer nach User + Zeitraum |
| **tasks** | `idx_tasks_due_date` | Aufgaben nach Fälligkeit sortieren/filtern |
| **tasks** | `idx_tasks_project_id_status` (composite) | Dashboard: Tasks pro Projekt + Status |
| **reminders** | `idx_reminders_status` | Cron-Job zum Senden pending Reminders |
| **audit_logs** | `idx_audit_logs_entity_type` (einzeln) | Queries oft nur nach entity_type |
| **pendenzen_historie** | `idx_pendenzen_historie_created_at` | Chronologische Anzeige |
| **working_time_slots** | `idx_wt_slots_day_of_week` | Abfrage nach Wochentag |
| **industries** | `idx_industries_name` (UNIQUE?) | Duplikat-Vermeidung |
| **product_types** | `idx_product_types_name_industry` UNIQUE | Duplikat-Vermeidung pro Branche |

### 1.4 Fehlende Foreign Keys / Constraints

| Tabelle | Problem | Schwere |
|---|---|---|
| **reminders** | `user_id` hat kein `ON DELETE CASCADE` – nur `REFERENCES users(id)` | 🔴 |
| **working_time_templates** | `user_id` hat kein `ON DELETE CASCADE` | 🔴 |
| **projects** | `work_template VARCHAR(50)` – kein FK, kein CHECK – freier Text | 🟡 |
| **tasks** | `resource_label VARCHAR(255)` – Altlast, obsolet seit `resource_id` (Mig. 012) | 🟡 |
| **industries** | Kein UNIQUE auf `name` – Duplikate möglich | 🟡 |
| **product_types** | Kein UNIQUE auf `(industry_id, name)` | 🟡 |
| **task_templates** | Kein UNIQUE auf `(product_type_id, name)` | 🟡 |
| **users** | `password_hash` kann NULL sein – kein CHECK dass entweder password_hash oder Supabase-Auth existiert | 🟢 |
| **appointments** | `deleted_at` existiert von Anfang an, aber nicht über Mig. 017 wie bei projects/tasks – leichte Divergenz | 🟢 |

### 1.5 Normalisierungs-Probleme

| Problem | Details | Schwere |
|---|---|---|
| **task_templates.tasks als JSONB** | Task-Definitions sind als JSON-Array gespeichert statt in einer eigenen Tabelle. Keine Referential Integrity, kein Querying nach einzelnen Task-Definitions möglich. | 🟡 |
| **projects: workday_start/workday_end + work_template** | Redundante Arbeitszeitdefinition: `workday_start`/`workday_end` (Mig. 004) UND `work_template` (Mig. 016) – sollte eines sein | 🟡 |
| **industries.settings als JSONB** | Offenes Schema – OK für Flexibilität, aber braucht Validierung | 🟢 |
| **tasks.resource_label (deprecated)** | Freies Textfeld, ersetzt durch `resource_id` FK – sollte entfernt werden | 🟢 |

### 1.6 Sicherheits-Probleme

| Problem | Details | Schwere |
|---|---|---|
| **Tokens im Klartext** | `email_verification_token` und `password_reset_token` in `users` – sollten gehasht gespeichert werden | 🔴 |
| **Keine Team-Isolation** | Kein Multi-Tenant-Constraint: User aus Team A kann theoretisch Projekte von Team B sehen (abhängig von App-Logic) | 🟡 |
| **audit_logs: kein Retention** | Keine automatische Bereinigung alter Logs – DSGVO: "so kurz wie möglich" | 🟡 |

---

## 2. Verbesserungsvorschläge (priorisiert)

### 🔴 Kritisch (Datenverlust-Risiko, Performance, Sicherheit)

| # | Verbesserung | Aufwand |
|---|---|---|
| K1 | **ON DELETE Verhalten bei reminders/working_time_templates** – Beim Löschen eines Users bleiben verwaiste Records | Klein |
| K2 | **Tokens hashen** – Reset/Verification Tokens im Klartext = Sicherheitsrisiko bei DB-Leak | Mittel |
| K3 | **updated_at Trigger für alle Tabellen** – Inkonsistente Timestamps = fehlerhafte Sync/Caching | Klein |
| K4 | **Composite Index appointments(user_id, start_time)** – Kalender-Queries ohne Index = Full-Table-Scan bei Wachstum | Klein |
| K5 | **Team-Isolation** – `team_id` FK auf projects/resources für Multi-Tenant-Safety | Mittel |

### 🟡 Wichtig (Konsistenz, Best Practices)

| # | Verbesserung | Aufwand |
|---|---|---|
| W1 | **Einheitliches Soft-Delete Pattern** – Entweder `deleted_at` überall oder differenziert mit klarer Strategie | Mittel |
| W2 | **UNIQUE Constraints auf industries, product_types, task_templates** | Klein |
| W3 | **work_template CHECK Constraint** statt freiem VARCHAR | Klein |
| W4 | **Naming-Strategie festlegen** – Neue Tabellen auf Englisch, Migration-Plan für bestehende deutsche Spalten | Mittel |
| W5 | **Fehlende Indizes ergänzen** (tasks.due_date, composite indizes) | Klein |
| W6 | **resource_label deprecation** – Spalte als deprecated markieren, perspektivisch entfernen | Klein |
| W7 | **Pendenzen: ON DELETE RESTRICT auf erfasst_von_id** prüfen – verhindert User-Löschung | Mittel |

### 🟢 Nice-to-have (Optimierung)

| # | Verbesserung | Aufwand |
|---|---|---|
| N1 | **task_templates.tasks normalisieren** – Eigene `task_template_items` Tabelle | Gross |
| N2 | **projects: workday_start/end entfernen** zugunsten von working_time_templates | Gross |
| N3 | **audit_logs Partitionierung** nach created_at (monatlich) | Mittel |
| N4 | **Retention Policy für audit_logs** | Klein |
| N5 | **created_at/updated_at in alle Tabellen** die es noch nicht haben (task_dependencies?) | Klein |

---

## 3. Migrations-Plan (Top-5)

### Migration 027: ON DELETE CASCADE für reminders und working_time_templates

```sql
-- Migration: 027_fix_foreign_key_delete_behavior
-- Description: Fix ON DELETE behavior for reminders and working_time_templates
-- Risk: LOW – adds safer cascade, no data change
-- Rollback: Revert to original FK constraints

-- reminders.user_id: add ON DELETE CASCADE
ALTER TABLE reminders DROP CONSTRAINT IF EXISTS reminders_user_id_fkey;
ALTER TABLE reminders
  ADD CONSTRAINT reminders_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- working_time_templates.user_id: add ON DELETE CASCADE
ALTER TABLE working_time_templates DROP CONSTRAINT IF EXISTS working_time_templates_user_id_fkey;
ALTER TABLE working_time_templates
  ADD CONSTRAINT working_time_templates_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
```

### Migration 028: updated_at Trigger für alle relevanten Tabellen

```sql
-- Migration: 028_add_updated_at_triggers
-- Description: Consistent updated_at triggers for all tables that have the column
-- Risk: LOW – only auto-sets updated_at on UPDATE, no data change

-- Generic trigger function (reusable)
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop old pendenzen-specific function (replaced by generic)
-- Keep backward compatibility: pendenzen trigger remains functional

DO $$ 
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN 
    SELECT unnest(ARRAY[
      'users', 'appointments', 'projects', 'tasks', 
      'task_work_slots', 'resources', 'reminders',
      'working_time_templates', 'product_types', 'task_templates'
    ])
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_%s_updated_at ON %I; 
       CREATE TRIGGER trg_%s_updated_at
         BEFORE UPDATE ON %I
         FOR EACH ROW
         EXECUTE FUNCTION set_updated_at();',
      tbl, tbl, tbl, tbl
    );
  END LOOP;
END $$;
```

### Migration 029: Fehlende Indizes & UNIQUE Constraints

```sql
-- Migration: 029_add_missing_indexes_and_constraints
-- Description: Performance indexes and uniqueness constraints
-- Risk: LOW – additive only, no data change

-- Performance: Composite index für Kalender-Queries
CREATE INDEX IF NOT EXISTS idx_appointments_user_time
  ON appointments(user_id, start_time)
  WHERE deleted_at IS NULL;

-- Performance: Tasks nach Fälligkeit
CREATE INDEX IF NOT EXISTS idx_tasks_due_date
  ON tasks(due_date)
  WHERE deleted_at IS NULL AND due_date IS NOT NULL;

-- Performance: Tasks Projekt + Status (Dashboard)
CREATE INDEX IF NOT EXISTS idx_tasks_project_status
  ON tasks(project_id, status)
  WHERE deleted_at IS NULL;

-- Performance: Pendenzen-Historie chronologisch
CREATE INDEX IF NOT EXISTS idx_pendenzen_historie_created_at
  ON pendenzen_historie(created_at);

-- Performance: Working time slots nach Wochentag
CREATE INDEX IF NOT EXISTS idx_wt_slots_day_of_week
  ON working_time_slots(day_of_week);

-- Uniqueness: Branche
CREATE UNIQUE INDEX IF NOT EXISTS idx_industries_name_unique
  ON industries(name);

-- Uniqueness: Produkttyp pro Branche
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_types_industry_name_unique
  ON product_types(industry_id, name);

-- Uniqueness: Task-Template pro Produkttyp
CREATE UNIQUE INDEX IF NOT EXISTS idx_task_templates_product_name_unique
  ON task_templates(product_type_id, name);

-- Constraint: work_template auf gültige Werte
ALTER TABLE projects
  DROP CONSTRAINT IF EXISTS chk_projects_work_template;
ALTER TABLE projects
  ADD CONSTRAINT chk_projects_work_template
  CHECK (work_template IN ('weekday_8_17', 'weekday_7_16', 'weekday_9_18', 'custom'));
```

### Migration 030: Soft-Delete Konsistenz

```sql
-- Migration: 030_consistent_soft_delete
-- Description: Add deleted_at to key tables for consistent soft-delete pattern
-- Risk: LOW – adds nullable column, no data change
-- NOTE: Does NOT rename pendenzen.archived_at (semantisch korrekt: Archivierung ≠ Löschung)

-- Resources: replace is_active with deleted_at pattern
-- Keep is_active for backward compat, add deleted_at
ALTER TABLE resources
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_resources_deleted_at
  ON resources(deleted_at) WHERE deleted_at IS NULL;

-- Reminders: soft delete
ALTER TABLE reminders
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Teams: soft delete (wichtig für Multi-Tenant)
ALTER TABLE teams
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Users: soft delete (DSGVO: User-Daten "löschen" ohne harte Löschung)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_users_deleted_at
  ON users(deleted_at) WHERE deleted_at IS NULL;

-- HINWEIS: App-Code muss WHERE deleted_at IS NULL überall ergänzen!
-- Empfehlung: Erstelle Views wie v_active_users, v_active_projects, etc.
```

### Migration 031: Team-Isolation (Multi-Tenant Foundation)

```sql
-- Migration: 031_team_isolation
-- Description: Add team_id to key tables for multi-tenant data isolation
-- Risk: MEDIUM – neue Spalte, App muss team_id setzen bei neuen Records
-- Rollback: DROP COLUMN team_id von den betroffenen Tabellen

-- Projects brauchen team_id für Isolation
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE CASCADE;

-- Backfill: Setze team_id von projects basierend auf owner_id
UPDATE projects p
SET team_id = u.team_id
FROM users u
WHERE p.owner_id = u.id
  AND p.team_id IS NULL
  AND u.team_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_projects_team_id
  ON projects(team_id);

-- Resources brauchen team_id
ALTER TABLE resources
  ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE CASCADE;

UPDATE resources r
SET team_id = u.team_id
FROM users u
WHERE r.owner_id = u.id
  AND r.team_id IS NULL
  AND u.team_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_resources_team_id
  ON resources(team_id);

-- HINWEIS: team_id bleibt vorerst NULLABLE (für single-user accounts)
-- Supabase RLS wird darauf aufbauen (siehe Abschnitt 4)
```

---

## 4. Supabase-Migration Roadmap

### 4.1 Was ändert sich bei Supabase?

| Bereich | Aktuell (Express+JWT) | Supabase | Migration-Aufwand |
|---|---|---|---|
| **Auth** | Eigene JWT-Generierung, `password_hash` in users, eigene Reset/Verify Tokens | Supabase Auth (GoTrue), `auth.users` Tabelle | Gross |
| **User-Tabelle** | `users` mit allen Feldern inkl. Auth | `auth.users` (Supabase) + `public.profiles` (Custom-Felder) | Mittel |
| **API** | Express REST Endpoints | Supabase PostgREST (auto-generated) + Edge Functions für Custom-Logic | Gross |
| **Realtime** | Nicht vorhanden | Supabase Realtime (Websockets, gratis) | Klein (neues Feature) |
| **Storage** | Lokal / S3 (falls vorhanden) | Supabase Storage (S3-kompatibel) | Klein |
| **RLS** | App-Level Authorization | Row Level Security (DB-Level) | Gross |
| **Connection** | Direct PG Connection | Connection Pooling via Supavisor | Klein |

### 4.2 Auth-Migration: JWT → Supabase Auth

#### Phase 1: Vorbereitung (JETZT machbar)

```
1. User-Tabelle splitten: profiles vs. auth-Daten
   - public.users → public.profiles (name, role, team_id, timezone, industry_id)
   - Auth-Spalten entfernen: password_hash, email_verification_token, etc.
   - email bleibt in profiles als Referenz (sync mit auth.users)

2. user_id UUID beibehalten
   - Supabase auth.users nutzt auch UUID → mapping möglich
   - WICHTIG: Supabase generiert eigene UUIDs für auth.users
   - Lösung: profiles.id = auth.users.id (1:1 mapping)

3. FK-Referenzen vorbereiten
   - Alle REFERENCES users(id) müssen auf profiles(id) zeigen
   - Oder: View erstellen die profiles + auth.users joined
```

#### Phase 2: Migration (beim Supabase-Switch)

```sql
-- 1. Profiles-Tabelle erstellen (neben bestehender users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'single', 'team')),
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  timezone VARCHAR(100) DEFAULT 'UTC',
  industry_id UUID REFERENCES industries(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Daten migrieren
INSERT INTO profiles (id, name, role, team_id, timezone, industry_id, created_at, updated_at)
SELECT id, name, role, team_id, timezone, industry_id, created_at, updated_at
FROM users;

-- 3. FK-Referenzen umbiegen (für jede Tabelle)
-- Beispiel: projects
ALTER TABLE projects DROP CONSTRAINT projects_owner_id_fkey;
ALTER TABLE projects ADD CONSTRAINT projects_owner_id_fkey
  FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- 4. Alte users-Tabelle behalten als Fallback, später droppen
```

#### Phase 3: Cleanup

```
- users-Tabelle droppen (nach Verifizierung)
- Auth-Token Spalten sind weg (Supabase managed das)
- password_hash ist weg (Supabase managed das)
- email_verified_at → auth.users.email_confirmed_at
```

### 4.3 RLS (Row Level Security) Strategie

#### Grundprinzip

```
Jeder User sieht nur Daten die:
1. Ihm gehören (owner_id = auth.uid())
2. Seinem Team gehören (team_id = user's team_id)
3. Öffentlich sind (z.B. industries, product_types)
```

#### RLS Policies (Entwurf)

```sql
-- Aktiviere RLS auf allen Tabellen
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE pendenzen ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

-- Helper-Funktion: Team-ID des aktuellen Users
CREATE OR REPLACE FUNCTION auth.user_team_id()
RETURNS UUID AS $$
  SELECT team_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- === PROFILES ===
-- User sieht sich selbst + Teammitglieder
CREATE POLICY profiles_select ON profiles FOR SELECT USING (
  id = auth.uid()
  OR team_id = auth.user_team_id()
);
CREATE POLICY profiles_update ON profiles FOR UPDATE USING (
  id = auth.uid()
);

-- === PROJECTS ===
-- Owner + Teammitglieder sehen Projekte
CREATE POLICY projects_select ON projects FOR SELECT USING (
  owner_id = auth.uid()
  OR team_id = auth.user_team_id()
);
CREATE POLICY projects_insert ON projects FOR INSERT WITH CHECK (
  owner_id = auth.uid()
);
CREATE POLICY projects_update ON projects FOR UPDATE USING (
  owner_id = auth.uid()
  OR team_id = auth.user_team_id()
);
CREATE POLICY projects_delete ON projects FOR DELETE USING (
  owner_id = auth.uid()
);

-- === TASKS ===
-- Sichtbar wenn Projekt sichtbar
CREATE POLICY tasks_select ON tasks FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = tasks.project_id
    AND (p.owner_id = auth.uid() OR p.team_id = auth.user_team_id())
  )
);

-- === APPOINTMENTS ===
-- Nur eigene Termine
CREATE POLICY appointments_select ON appointments FOR SELECT USING (
  user_id = auth.uid()
);
CREATE POLICY appointments_all ON appointments FOR ALL USING (
  user_id = auth.uid()
);

-- === PENDENZEN ===
-- Projekt-basiert: Pendenz sichtbar wenn Projekt sichtbar
CREATE POLICY pendenzen_select ON pendenzen FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = pendenzen.project_id
    AND (p.owner_id = auth.uid() OR p.team_id = auth.user_team_id())
  )
);

-- === LOOKUP-TABELLEN (öffentlich) ===
-- industries, product_types, task_templates: lesbar für alle authentifizierten User
CREATE POLICY industries_select ON industries FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY product_types_select ON product_types FOR SELECT USING (auth.uid() IS NOT NULL);

-- === AUDIT LOGS ===
-- Nur Admins sehen Audit Logs
CREATE POLICY audit_logs_select ON audit_logs FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  )
);
```

### 4.4 Was können wir JETZT schon vorbereiten?

#### ✅ Sofort umsetzbar (ohne Supabase)

| # | Aktion | Warum jetzt? |
|---|---|---|
| 1 | **Migration 031 (Team-Isolation)** ausführen | `team_id` auf projects/resources ist die Grundlage für spätere RLS |
| 2 | **UUID-Strategie beibehalten** | Supabase auth.users nutzt UUIDs – 1:1 kompatibel |
| 3 | **Auth-Spalten isolieren** | Mentally separieren: welche Spalten in `users` sind Auth (→ weg) vs. Profile (→ bleiben) |
| 4 | **WHERE-Clauses standardisieren** | Alle Queries auf `deleted_at IS NULL` Pattern umstellen |
| 5 | **Owner-ID konsistent nutzen** | Jede Tabelle die User-Daten enthält braucht eine `owner_id` oder `user_id` |
| 6 | **API-Responses von DB trennen** | DTOs / Response-Mapper, damit DB-Schema-Änderungen die API nicht brechen |

#### ⏳ Bei Supabase-Start

| # | Aktion |
|---|---|
| 1 | Supabase-Projekt erstellen, DB verbinden |
| 2 | `auth.users` mit bestehenden Users befüllen (Supabase Admin API) |
| 3 | `profiles`-Tabelle erstellen, Daten migrieren |
| 4 | RLS aktivieren und Policies erstellen |
| 5 | Express-Auth-Middleware durch Supabase-Auth ersetzen |
| 6 | PostgREST für simple CRUD, Edge Functions für Business-Logic |
| 7 | Alte `users`-Tabelle + Auth-Columns droppen |

#### ⚠️ Risiken bei der Supabase-Migration

| Risiko | Mitigation |
|---|---|
| **User-ID Mapping** | `profiles.id` MUSS mit `auth.users.id` übereinstimmen → Supabase Admin API zum Erstellen mit fester UUID nutzen |
| **Downtime** | Blue/Green Deployment: alte API + neue API parallel laufen lassen |
| **RLS Performance** | RLS-Policies mit JOINs (z.B. tasks→projects) können langsam sein → Denormalisierung mit `team_id` auf Tasks erwägen |
| **Edge Cases** | Single-User (kein Team) → RLS muss auch ohne team_id funktionieren |
| **Bestehende Tokens** | Alle aktiven Sessions invalidieren beim Switch |

---

## Anhang A: Vollständiges Schema-Diagramm (Text)

```
teams
  ├── users (team_id → teams.id)
  │     ├── appointments (user_id → users.id)
  │     ├── projects (owner_id → users.id)
  │     │     ├── tasks (project_id → projects.id, owner_id → users.id)
  │     │     │     ├── task_dependencies (task_id, depends_on_task_id → tasks.id)
  │     │     │     ├── task_work_slots (task_id → tasks.id)
  │     │     │     └── [resource_id → resources.id]
  │     │     ├── project_activity (project_id → projects.id, actor_user_id → users.id)
  │     │     └── pendenzen (project_id → projects.id, verantwortlich_id/erfasst_von_id → users.id)
  │     │           └── pendenzen_historie (pendenz_id → pendenzen.id)
  │     ├── resources (owner_id → users.id)
  │     ├── reminders (user_id → users.id, appointment_id → appointments.id)
  │     ├── working_time_templates (user_id → users.id)
  │     │     └── working_time_slots (template_id → working_time_templates.id)
  │     └── audit_logs (user_id → users.id)
  │
  industries
    └── product_types (industry_id → industries.id)
          └── task_templates (product_type_id → product_types.id, owner_id → users.id)
```

## Anhang B: Empfohlene Migrations-Reihenfolge

```
Phase 1 (sofort, Migrationen 027-029):
  → FK-Fixes, Triggers, Indizes
  → Kein App-Code-Änderung nötig

Phase 2 (kurzfristig, Migration 030):
  → Soft-Delete Konsistenz
  → App-Code: WHERE deleted_at IS NULL Queries

Phase 3 (mittelfristig, Migration 031):
  → Team-Isolation
  → App-Code: team_id bei INSERT setzen

Phase 4 (Supabase-Switch):
  → Auth-Migration
  → RLS aktivieren
  → API umstellen
```

## Anhang C: Naming-Konvention (Empfehlung)

Für zukünftige Tabellen/Spalten:

| Regel | Beispiel |
|---|---|
| **Sprache:** Englisch | `pending_items` statt `pendenzen` |
| **Tabellen:** Plural, snake_case | `task_dependencies` ✅ |
| **Spalten:** snake_case | `created_at` ✅ |
| **FK-Spalten:** `{entity}_id` | `project_id`, `user_id` ✅ |
| **Timestamps:** `created_at`, `updated_at`, `deleted_at` | TIMESTAMPTZ ✅ |
| **Booleans:** `is_` Prefix | `is_active`, `is_default` ✅ |
| **Enums:** Englisch, snake_case | `'in_progress'` statt `'in_arbeit'` |

> **Bestehende deutsche Tabellen (pendenzen, pendenzen_historie):** Nicht umbenennen – zu viel Aufwand, zu viele App-Code-Referenzen. Stattdessen: Views mit englischen Namen erstellen falls nötig (`CREATE VIEW pending_items AS SELECT ... FROM pendenzen`).
