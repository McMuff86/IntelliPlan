# IntelliPlan – Multi-Tenant Strategie

> **Stand:** 2026-02-07 · **Status:** Planung  
> **Ziel:** Von Single-Tenant zu Multi-Tenant SaaS für Schreinereien

---

## Inhaltsverzeichnis

1. [Übersicht: RLS-Strategie](#1-übersicht-rls-strategie)
2. [Tenant-Modell](#2-tenant-modell)
3. [Migration: Single → Multi-Tenant](#3-migration-single--multi-tenant)
4. [Row-Level Security (RLS)](#4-row-level-security-rls)
5. [Supabase-Integration Roadmap](#5-supabase-integration-roadmap)
6. [Offene Fragen](#6-offene-fragen)

---

## 1. Übersicht: RLS-Strategie

### Warum RLS?

| Ansatz | Beschreibung | Bewertung |
|--------|-------------|-----------|
| **Separate Datenbanken** | Eine DB pro Tenant | ❌ Aufwändig, teuer, schwer zu warten |
| **Separate Schemas** | Ein Schema pro Tenant | ⚠️ Migrations-Aufwand, Supabase-inkompatibel |
| **Shared Tables + RLS** | Eine DB, `tenant_id` auf allen Tabellen | ✅ **Gewählt** – skalierbar, Supabase-kompatibel |

### Grundprinzip

```
┌─────────────────────────────────────────────────────────┐
│                    PostgreSQL / Supabase                  │
│                                                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │ projects                                           │  │
│  │ ┌──────────┬─────────────┬────────────────────┐   │  │
│  │ │ id       │ tenant_id   │ name               │   │  │
│  │ ├──────────┼─────────────┼────────────────────┤   │  │
│  │ │ uuid-1   │ tenant-abc  │ Küche Müller ← 🔒 │   │  │
│  │ │ uuid-2   │ tenant-xyz  │ Schrank Meier ← 🔒│   │  │
│  │ └──────────┴─────────────┴────────────────────┘   │  │
│  └───────────────────────────────────────────────────┘  │
│                                                          │
│  RLS Policy:                                             │
│  SELECT * FROM projects                                  │
│  WHERE tenant_id = current_setting('app.tenant_id')      │
│                                                          │
│  → Tenant ABC sieht NUR "Küche Müller"                   │
│  → Tenant XYZ sieht NUR "Schrank Meier"                  │
│  → Kein WHERE nötig im Applikationscode!                 │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Tenant-Modell

### 2.1 Tenants-Tabelle

```sql
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,            -- "Schreinerei Bucher AG"
  slug VARCHAR(100) UNIQUE NOT NULL,     -- "bucher-ag" (für URLs)
  plan VARCHAR(30) DEFAULT 'starter',    -- 'starter', 'professional', 'enterprise'
  status VARCHAR(20) DEFAULT 'active',   -- 'active', 'trial', 'suspended', 'cancelled'
  
  -- Konfiguration
  settings JSONB DEFAULT '{}',           -- Tenant-spezifische Settings
  max_users INTEGER DEFAULT 1,           -- Abhängig vom Plan
  
  -- Billing (Stripe)
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  trial_ends_at TIMESTAMPTZ,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Index für schnelle Slug-Lookups
CREATE UNIQUE INDEX idx_tenants_slug ON tenants(slug) WHERE deleted_at IS NULL;
```

### 2.2 User-Tenant-Beziehung

```sql
-- Ein User kann zu mehreren Tenants gehören (z.B. Berater)
CREATE TABLE tenant_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES users(id),
  role VARCHAR(30) NOT NULL DEFAULT 'member',  -- 'owner', 'admin', 'planner', 'viewer', 'monteur'
  invited_by UUID REFERENCES users(id),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(tenant_id, user_id)
);
```

### 2.3 Betroffene Tabellen

Alle Tabellen die Tenant-spezifische Daten enthalten, bekommen `tenant_id`:

| Tabelle | Priorität | Anmerkung |
|---------|-----------|-----------|
| `projects` | 🔴 Hoch | Kern-Entität |
| `tasks` | 🔴 Hoch | Redundant zu projects, aber für Performance |
| `resources` | 🔴 Hoch | Mitarbeiter sind Tenant-spezifisch |
| `task_assignments` | 🔴 Hoch | Zuordnungen |
| `task_phase_schedules` | 🔴 Hoch | Phasenplanung |
| `pendenzen` | 🟡 Mittel | Pendenzen-Modul |
| `appointments` | 🟡 Mittel | Termine |
| `reminders` | 🟡 Mittel | Erinnerungen |
| `task_templates` | 🟡 Mittel | Eigene + System-Templates |
| `working_time_templates` | 🟢 Niedrig | Arbeitszeitmodelle |
| `users` | ❌ Nein | Global (über tenant_memberships verknüpft) |
| `industries` | ❌ Nein | Global (System-Daten) |
| `product_types` | ❌ Nein | Global (System-Daten) |

---

## 3. Migration: Single → Multi-Tenant

### Phase 1: Vorbereitung (ohne Breaking Changes)

```sql
-- 1. Tenants-Tabelle erstellen
CREATE TABLE tenants ( ... );

-- 2. Default-Tenant für bestehende Daten erstellen
INSERT INTO tenants (id, name, slug, plan, status)
VALUES ('00000000-0000-0000-0000-000000000001', 'Default', 'default', 'enterprise', 'active');

-- 3. tenant_id Spalte hinzufügen (nullable zuerst!)
ALTER TABLE projects ADD COLUMN tenant_id UUID REFERENCES tenants(id);
ALTER TABLE tasks ADD COLUMN tenant_id UUID REFERENCES tenants(id);
ALTER TABLE resources ADD COLUMN tenant_id UUID REFERENCES tenants(id);
ALTER TABLE task_assignments ADD COLUMN tenant_id UUID REFERENCES tenants(id);
ALTER TABLE task_phase_schedules ADD COLUMN tenant_id UUID REFERENCES tenants(id);
ALTER TABLE pendenzen ADD COLUMN tenant_id UUID REFERENCES tenants(id);
-- ... weitere Tabellen

-- 4. Bestehende Daten dem Default-Tenant zuweisen
UPDATE projects SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE tasks SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
-- ... weitere Tabellen

-- 5. NOT NULL constraint setzen
ALTER TABLE projects ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE tasks ALTER COLUMN tenant_id SET NOT NULL;
-- ... weitere Tabellen
```

### Phase 2: Composite Indices

```sql
-- Performance-kritische Indices mit tenant_id als Leading Column
CREATE INDEX idx_projects_tenant ON projects(tenant_id, deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_tenant_project ON tasks(tenant_id, project_id, deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_resources_tenant ON resources(tenant_id, is_active) WHERE is_active = true;
CREATE INDEX idx_assignments_tenant_date ON task_assignments(tenant_id, assignment_date, deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_phases_tenant ON task_phase_schedules(tenant_id, planned_year, planned_kw);
```

### Phase 3: RLS Policies aktivieren

```sql
-- 1. RLS auf allen Tabellen aktivieren
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;
-- ...

-- 2. Policies definieren
CREATE POLICY tenant_isolation_select ON projects
  FOR SELECT USING (tenant_id = current_setting('app.tenant_id')::UUID);

CREATE POLICY tenant_isolation_insert ON projects
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.tenant_id')::UUID);

CREATE POLICY tenant_isolation_update ON projects
  FOR UPDATE USING (tenant_id = current_setting('app.tenant_id')::UUID);

CREATE POLICY tenant_isolation_delete ON projects
  FOR DELETE USING (tenant_id = current_setting('app.tenant_id')::UUID);

-- Gleiche Policies für alle anderen Tabellen
```

### Phase 4: Backend-Anpassung

```typescript
// Middleware: Setzt tenant_id aus JWT für jede DB-Verbindung
async function tenantMiddleware(req: Request, _res: Response, next: NextFunction) {
  const tenantId = req.user?.tenantId;
  if (!tenantId) {
    return res.status(403).json({ error: 'No tenant context' });
  }

  // Setzt den tenant_id für die aktuelle DB-Session
  // RLS-Policies nutzen diesen Wert automatisch
  const client = await pool.connect();
  try {
    await client.query(`SET LOCAL app.tenant_id = '${tenantId}'`);
    // ... Request verarbeiten
  } finally {
    client.release();
  }
  
  next();
}
```

### Phase 5: Frontend-Anpassung

- JWT enthält `tenantId` → wird bei jedem API-Call mitgesendet
- Tenant-Switcher für Users mit mehreren Tenants
- Kein `tenant_id` in URLs (kommt aus dem Auth-Context)

---

## 4. Row-Level Security (RLS) im Detail

### 4.1 Policy-Muster

```sql
-- Standard-Pattern für alle Tenant-Tabellen:
CREATE POLICY "tenant_isolation" ON [table_name]
  USING (tenant_id = current_setting('app.tenant_id', true)::UUID);

-- Für INSERT zusätzlich:
CREATE POLICY "tenant_insert" ON [table_name]
  FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::UUID);
```

### 4.2 Service-Account Bypass

Für System-Operationen (Migrations, Cronjobs, Admin):

```sql
-- Service-Role kann alle Tenants sehen
CREATE POLICY "service_bypass" ON projects
  FOR ALL
  TO service_role
  USING (true);
```

### 4.3 Cross-Tenant Queries (Admin)

```sql
-- Admin-Dashboard: Aggregierte Stats über alle Tenants
CREATE POLICY "admin_read_all" ON projects
  FOR SELECT
  TO admin_role
  USING (true);
```

### 4.4 Performance-Überlegungen

| Bedenken | Mitigation |
|----------|-----------|
| RLS auf jede Query | Index auf `tenant_id` (Leading Column) |
| `current_setting()` pro Query | Einmal pro Connection setzen, nicht pro Query |
| JOINs über Tenant-Tabellen | `tenant_id` redundant auf Kind-Tabellen (Denormalisierung) |
| Count-Queries langsam | Materialized Views für Dashboard-Stats |

---

## 5. Supabase-Integration Roadmap

### 5.1 Warum Supabase?

| Feature | Eigenentwicklung | Supabase |
|---------|-----------------|----------|
| Auth | JWT selbst verwaltet | Supabase Auth (Social Login, MFA) |
| RLS | Manuell implementieren | Native PostgreSQL RLS |
| Realtime | Socket.IO aufbauen | Supabase Realtime (DB Change Events) |
| Storage | Eigener Upload-Service | Supabase Storage (S3-kompatibel) |
| Edge Functions | Express Endpoints | Deno-basierte Edge Functions |

### 5.2 Migrations-Phasen

#### Phase 1: Database Migration (Q3)

```
Aktuell                          Ziel
┌──────────┐                   ┌──────────────────┐
│ Lokale   │  ──── Migrate ──→ │ Supabase         │
│ PG DB    │                   │ PostgreSQL       │
└──────────┘                   │ (gleiche Schemas) │
                               └──────────────────┘
```

- Bestehende Migrations direkt auf Supabase ausführen
- Connection-String in `.env` ändern
- Keine Code-Änderungen nötig (pg Pool bleibt)
- **Risiko:** Gering (nur DB-Host ändert sich)

#### Phase 2: Auth Migration (Q3-Q4)

```
Aktuell                          Ziel
┌──────────────┐              ┌──────────────────┐
│ Eigene JWT-  │  ── Replace →│ Supabase Auth    │
│ Implementierung│             │ + JWT mit        │
│ + bcrypt     │              │   tenant_id      │
└──────────────┘              └──────────────────┘
```

- Supabase Auth als Identity Provider
- Custom Claims für `tenant_id` und `role`
- Bestehende User migrieren (Passwort-Reset nötig)
- Social Login (Google) als Bonus
- **Risiko:** Mittel (User müssen Passwort zurücksetzen)

#### Phase 3: RLS aktivieren (Q4)

```
Aktuell                          Ziel
┌──────────────┐              ┌──────────────────┐
│ WHERE        │  ── Replace →│ RLS Policies     │
│ owner_id=X   │              │ (automatisch)    │
│ in Services  │              │                  │
└──────────────┘              └──────────────────┘
```

- RLS-Policies für alle Tabellen
- `owner_id`-Filter aus Services entfernen
- Supabase setzt `app.tenant_id` automatisch aus JWT
- **Risiko:** Hoch (Sicherheitskritisch – ausgiebig testen!)

#### Phase 4: Realtime (Q4+)

```
                              ┌──────────────────┐
                              │ Supabase         │
Browser ◄──── WebSocket ─────│ Realtime         │
                              │ (DB Changes)     │
                              └──────────────────┘
```

- Supabase Realtime für Live-Updates im Wochenplan
- Ergänzt (nicht ersetzt) das eigene Event-System
- Event-Bus → Supabase Realtime für Client-Notifications
- **Risiko:** Gering (additiv)

#### Phase 5: Storage (Q4+)

- Montage-Fotos, Dokumente, Pläne
- Supabase Storage mit Tenant-scoped Buckets
- Signed URLs für sicheren Zugriff

### 5.3 Supabase Client-Setup (Vorschau)

```typescript
// backend/src/config/supabase.ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!, // Service key für Backend
);

// Frontend: Anon key (RLS schützt automatisch)
// const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

---

## 6. Offene Fragen

### Entscheidungen die noch getroffen werden müssen

1. **Tenant-ID in JWT oder Session?**
   - JWT: Stateless, einfacher ↔ Tenant-Wechsel erfordert neuen Token
   - Session: Flexibler ↔ Server-Zustand nötig
   - **Tendenz:** JWT mit Refresh-Token bei Tenant-Wechsel

2. **Slug-Format für Tenants?**
   - `bucher-ag.intelliplan.ch` (Subdomain)
   - `intelliplan.ch/bucher-ag` (Path)
   - `intelliplan.ch` mit Tenant aus JWT (kein URL-Unterschied)
   - **Tendenz:** JWT-basiert (einfachster Start), Subdomains später

3. **Bestehende User-Migration?**
   - Alle User automatisch zum Default-Tenant zuweisen
   - Opt-in Migration (User muss sich neu registrieren)
   - **Tendenz:** Automatisch migrieren, Passwort-Reset anbieten

4. **Template-Sharing zwischen Tenants?**
   - System-Templates sind global (von uns gepflegt)
   - Tenant-Templates sind privat
   - Marketplace für Template-Sharing? (Zukunft)

5. **Daten-Export bei Kündigung?**
   - DSGVO/DSG-konform: Tenant kann alle Daten exportieren
   - Format: JSON + CSV (kein proprietäres Format)
   - Löschung nach 30 Tagen Karenzzeit

6. **Geo-Hosting?**
   - CH: Supabase Frankfurt/Zürich Region
   - DACH: Gleiche Region reicht
   - Andere Länder: Evaluieren bei Bedarf

---

## Zusammenfassung: Timeline

```
Q2 2026: Vorbereitung
├── tenant_id Spalte auf alle Tabellen
├── Default-Tenant für bestehende Daten
├── Composite Indices
└── Backend: tenantMiddleware Prototype

Q3 2026: Supabase Migration
├── DB auf Supabase hosten
├── Auth auf Supabase migrieren
└── RLS-Policies definieren (noch nicht aktiv)

Q4 2026: Multi-Tenant Launch
├── RLS aktivieren
├── Self-Service Registrierung
├── Tenant-Onboarding Flow
├── Billing (Stripe)
└── Beta mit 10 Schreinereien
```
