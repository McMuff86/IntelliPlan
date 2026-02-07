# IntelliPlan – Zukunftsvision

> **Stand:** 2026-02-07 · **Autor:** Sentinel  
> **Kontext:** Review Iteration 1 (nightly/07-02-wochenplan-core) + Strategische Planung

---

## Inhaltsverzeichnis

1. [Architektur-Vision: IntelliPlan in 1 Jahr](#1-architektur-vision)
2. [Datenmodell-Evolution](#2-datenmodell-evolution)
3. [Tech-Stack Evolution](#3-tech-stack-evolution)
4. [Differenzierungsstrategie](#4-differenzierungsstrategie)
5. [Roadmap (Quartale)](#5-roadmap)

---

## 1. Architektur-Vision

### 1.1 Wo stehen wir heute?

IntelliPlan ist eine Single-Tenant-Webanwendung (Express + React + PostgreSQL) mit solidem Fundament:
- RBAC-System, Soft-Delete, Audit-Logging
- Branchen-Templates, Auto-Scheduling, AI-Konflikterkennung
- Pendenzen-Modul, Projekt-Aktivitätslog
- **Neu (Iteration 1):** TaskAssignment-Kern, Resource-/Projekt-Erweiterungen, Produktionsphasen-Tracking

### 1.2 Wo wollen wir in 12 Monaten stehen?

```
                    ┌─────────────────────────────────────┐
                    │         IntelliPlan Cloud            │
                    │     Multi-Tenant SaaS Plattform      │
                    ├─────────────────────────────────────┤
                    │                                     │
  ┌──────────┐      │  ┌──────────┐    ┌──────────────┐   │
  │ Browser  │◄────►│  │ API GW   │◄──►│ WebSocket    │   │
  │ (React)  │      │  │ (NestJS) │    │ Server       │   │
  └──────────┘      │  └────┬─────┘    └──────┬───────┘   │
                    │       │                  │           │
  ┌──────────┐      │  ┌────┴──────────────────┴───────┐  │
  │ Mobile   │◄────►│  │      Supabase / PostgreSQL     │  │
  │ (PWA)    │      │  │   Row-Level Security (RLS)     │  │
  └──────────┘      │  └────┬──────────────────────────┘  │
                    │       │                              │
  ┌──────────┐      │  ┌────┴──────────┐                  │
  │ Rhino/   │◄────►│  │ AI Engine     │                  │
  │ CAD      │      │  │ (Planung +    │                  │
  │ Plugin   │      │  │  Optimierung) │                  │
  └──────────┘      │  └───────────────┘                  │
                    │                                     │
                    └─────────────────────────────────────┘
```

### 1.3 Die vier Säulen

#### Säule 1: Multi-Tenant SaaS für Schreinereien
- **Tenant-Isolation:** Jede Schreinerei hat ihre eigenen Daten, komplett isoliert
- **Self-Service Onboarding:** Schreinerei registriert sich → sofort einsatzbereit
- **Mandantenfähige Konfiguration:** Jeder Betrieb konfiguriert seine eigenen Abteilungen, Phasen, Templates
- **Shared Infrastructure:** Eine Codebasis, eine DB-Instanz mit RLS

#### Säule 2: Echtzeit-Kollaboration (WebSocket)
- **Live-Updates:** Wenn der Planer einen MA zuordnet, sieht der Werkstattleiter es sofort
- **Presence:** "Peter bearbeitet gerade KW12" – keine Überschreibungskonflikte
- **Cursor-Sharing:** Sichtbar wer welche KW anschaut
- **Notifications:** Push bei Planänderungen, die den eigenen Bereich betreffen

#### Säule 3: Mobile App für Monteure
- **Tagesplan:** Monteur sieht morgens seinen Tag – Aufträge, Orte, Kontakte, Zeitangaben
- **Navigation:** Direkter Link zu Google Maps / Apple Maps zum Montageort
- **Rückmeldung:** "Fertig" / "Verzögerung" / "Problem" – sofort im Wochenplan sichtbar
- **Offline-fähig:** PWA mit Service Worker – funktioniert auch auf Baustelle ohne Empfang
- **Fotos:** Montage-Dokumentation mit Kamera direkt am Auftrag

#### Säule 4: AI-gestützte Planung
- **Auto-Scheduling 2.0:** Neuer Auftrag → IntelliPlan schlägt optimale KW-Belegung vor
- **Kapazitäts-Optimierung:** "KW12 ist überlastet, soll ich Auftrag X auf KW13 verschieben?"
- **Vorlaufzeit-Lernen:** AI lernt aus historischen Daten, wie lange Zuschnitt/CNC/Prod tatsächlich dauern
- **Konflikt-Prävention:** Warnung bevor ein Problem entsteht, nicht erst wenn es knallt
- **Materialbedarfs-Prognose:** Basierend auf Auftragsvolumen der nächsten Wochen → automatische Bestellvorschläge

---

## 2. Datenmodell-Evolution

### 2.1 Review: Aktueller Stand nach Iteration 1

**Was gebaut wurde (nightly/07-02-wochenplan-core):**

| Migration | Inhalt | Bewertung |
|-----------|--------|-----------|
| 033_task_assignments | Kern-Tabelle für MA-Zuordnungen | ✅ Solide Basis |
| 034_extend_resources | Department, EmployeeType, Skills | ⚠️ Teilweise abweichend vom Sprint-Plan |
| 035_extend_projects | Order-Nr, Kunde, Farbe, etc. | ⚠️ Naming-Divergenz zum Sprint |
| 036_production_phases | Separate Phase-Schedule-Tabelle | 🟡 Designentscheidung – diskutabel |

**Detaillierte Abweichungen:**

| Sprint-Plan (Soll) | Implementiert (Ist) | Bewertung |
|---------------------|---------------------|-----------|
| `slot: 'morning' \| 'afternoon' \| 'full'` | `half_day: 'morning' \| 'afternoon' \| 'full_day'` | ⚠️ Naming-Abweichung. `half_day` funktioniert, aber `slot` war kürzer. `full_day` statt `full` ist klarer → **OK, beibehalten** |
| `time_note VARCHAR(100)` | `notes TEXT` + `start_time TIME` | ✅ **Besser als geplant.** Separates TIME-Feld ermöglicht Sortierung/Filterung nach Startzeit. `notes` für Freitext. |
| `status_code VARCHAR(20)` für FREI/FEI/KRANK | Fehlt in 033 | ❌ **Lücke.** Status-Codes wie FREI, FEI, KRANK, SCHULE etc. nicht abgebildet. Muss nachgetragen werden. |
| `phase_code` direkt auf tasks-Tabelle | Separate Tabelle `task_phase_schedules` | 🟡 **Komplexer als nötig für MVP.** Die separate Tabelle erlaubt multi-phase tracking pro Task, was richtig ist wenn ein Task mehrere Phasen durchläuft. Für den Wochenplan-MVP reicht aber ein einfaches `phase_code`-Feld auf `tasks`. Empfehlung: **Beides haben** – `phase_code` auf Task für den typischen Fall, `task_phase_schedules` für das detaillierte Tracking. |
| Resource `short_code VARCHAR(20)` | Fehlt in 034 | ❌ **Fehlt.** `short_code` (MA_14, MA_28) ist essenziell für die Wochenplan-Anzeige und den Excel-Import. |
| Resource `employee_type` Werte | `'internal', 'temporary', 'external_firm', 'pensioner'` | ⚠️ Sprint plante: `'intern', 'lehrling', 'fremdmonteur', 'fremdfirma', 'pensionaer'`. Die implementierten Werte sind generischer (englisch), aber es fehlt `lehrling`. **Lehrling ist für die Schreinerei kritisch** (eigene Sektion im Excel). |
| Resource `department` Werte | Keine CHECK constraints | ⚠️ Sprint plante explizite CHECK constraints für die Departments. Ohne Constraints kann jeder beliebige String rein. **Sollte nachgeholt werden.** |
| Project `reference VARCHAR(50)` | `order_number VARCHAR(50)` | ⚠️ Semantisch gleich, anderer Name. **OK – `order_number` ist für Schreinereien sogar verständlicher.** |
| Project `estimated_worker_days` | `worker_count NUMERIC(4,1)` | ⚠️ Anderer Name, gleiche Funktion. `worker_count` könnte als "Anzahl Arbeiter" missverstanden werden statt "Arbeiter-Tage". **Sollte klarifiziert werden.** |
| Project `client_name` (Sprint-Plan) | `customer_name` (implementiert) | ⚠️ **Naming-Inkonsistenz.** Sprint sagt `client_name`, Code sagt `customer_name`. Sollte vereinheitlicht werden. |
| Migrations 029-032 (Sprint-Nummern) | 033-036 (implementiert) | ✅ Korrekt hochgezählt wegen bereits existierender Migrationen (026-028). |

### 2.2 Fehlende Entitäten (heute komplett fehlend)

#### A) Kunden-Modul (`customers`)
```sql
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,                    -- Multi-Tenant
  name VARCHAR(255) NOT NULL,
  company VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  address_street VARCHAR(255),
  address_city VARCHAR(255),
  address_zip VARCHAR(20),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Projekt-Verknüpfung (statt customer_name String auf Project)
ALTER TABLE projects ADD COLUMN customer_id UUID REFERENCES customers(id);
```

**Warum:** Aktuell ist der Kundenname ein String-Feld am Projekt. Das bedeutet:
- Gleicher Kunde, 10 Aufträge = 10× denselben Namen tippen
- Keine zentrale Kundenübersicht
- Kein Kundenverlauf ("Welche Aufträge hatte Herr Müller?")
- Keine Kontakt-Deduplizierung

**Wann:** Q2 – Nicht MVP, aber bald danach.

#### B) Materialplanung (`materials`, `project_materials`)
```sql
CREATE TABLE materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100),            -- 'holz', 'platte', 'beschlag', 'farbe', 'leim'
  unit VARCHAR(20),                 -- 'stk', 'lfm', 'qm', 'kg', 'liter'
  unit_price DECIMAL(10,2),
  supplier VARCHAR(255),
  supplier_article_nr VARCHAR(100),
  min_stock_quantity DECIMAL(10,2),
  current_stock DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE project_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id),
  material_id UUID NOT NULL REFERENCES materials(id),
  quantity DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'planned',  -- 'planned', 'ordered', 'delivered', 'used'
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Warum:** Schreinereien brauchen Materialplanung für:
- Plattenbestellung (Vorlauf 1-2 Wochen)
- Beschläge-Bestellung (Vorlauf variabel)
- Farb-/Lack-Bestellung (Spezialfarben haben langen Vorlauf)
- Kosten-Tracking pro Auftrag

**Wann:** Q3 – Eigenständiges Modul, parallel zu AI Features.

#### C) Zeiterfassung (`time_entries`)
```sql
CREATE TABLE time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  resource_id UUID NOT NULL REFERENCES resources(id),
  task_assignment_id UUID REFERENCES task_assignments(id),  -- Optional
  project_id UUID REFERENCES projects(id),                  -- Optional
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME,
  duration_minutes INTEGER,
  activity_type VARCHAR(30),    -- 'productive', 'travel', 'setup', 'cleanup', 'break'
  notes TEXT,
  approved_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Warum:** 
- Soll vs. Ist-Vergleich (geplant 6 Tage, tatsächlich 8 → Feedback für zukünftige Planung)
- Nachkalkulation (was hat der Auftrag wirklich gekostet?)
- Im Excel gibt es "Anwesenheit / Sollzeit / Unproduktiv" – das ist im Kern Zeiterfassung
- Pflicht für korrekte Lohnabrechnung bei Stundenlohn-MA

**Wann:** Q3 – Kann mit der Mobile-App kombiniert werden (Monteur stempelt auf Baustelle).

#### D) Abwesenheitsplanung (`absences`)
```sql
CREATE TABLE absences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  resource_id UUID NOT NULL REFERENCES resources(id),
  absence_type VARCHAR(20) NOT NULL,
    -- 'ferien', 'feiertag', 'krank', 'unfall', 'schule', 'militaer', 'homeoffice'
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  half_day_start VARCHAR(10),    -- NULL = ganzer Tag, 'morning', 'afternoon'
  half_day_end VARCHAR(10),
  approved BOOLEAN DEFAULT false,
  approved_by UUID REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Warum:** Aktuell wird Abwesenheit über `status_code` auf TaskAssignment abgebildet (geplant, aber noch nicht implementiert). Das ist suboptimal weil:
- Ferien über 3 Wochen = 15 TaskAssignment-Einträge mit status_code='FREI'
- Keine zentrale Abwesenheitsübersicht
- Keine Genehmigungs-Workflow
- Kapazitätsplanung muss jede Zelle einzeln prüfen

**Wann:** Q2 – Direkt nach MVP, weil es die Kapazitätsberechnung massiv verbessert.

### 2.3 Erforderliche Änderungen am jetzigen Modell

#### Sofort (Sprint 5, nächste Iteration):

1. **`status_code` auf task_assignments nachträgen:**
   ```sql
   ALTER TABLE task_assignments ADD COLUMN status_code VARCHAR(20);
   -- CHECK: 'FREI','FEI','KRANK','SCHULE','MILITAER','UNFALL','HO'
   ```

2. **`short_code` auf resources nachträgen:**
   ```sql
   ALTER TABLE resources ADD COLUMN IF NOT EXISTS short_code VARCHAR(20);
   CREATE UNIQUE INDEX idx_resources_short_code ON resources(short_code) WHERE deleted_at IS NULL AND short_code IS NOT NULL;
   ```

3. **`phase_code` direkt auf tasks hinzufügen (zusätzlich zu task_phase_schedules):**
   ```sql
   ALTER TABLE tasks ADD COLUMN IF NOT EXISTS phase_code VARCHAR(10);
   ALTER TABLE tasks ADD COLUMN IF NOT EXISTS planned_week INTEGER;
   ALTER TABLE tasks ADD COLUMN IF NOT EXISTS planned_year INTEGER;
   ```

4. **Department CHECK constraint auf resources:**
   ```sql
   ALTER TABLE resources ADD CONSTRAINT chk_resources_department
     CHECK (department IS NULL OR department IN (
       'zuschnitt','cnc','produktion','behandlung','beschlaege','montage','transport','buero'
     ));
   ```

5. **Employee Type `lehrling` ergänzen:**
   - Entweder erweitern um `'apprentice'` (englisch-konsistent) oder auf deutsche Werte wechseln
   - Empfehlung: Deutsche Werte, da die Domain deutsch ist: `'intern','lehrling','fremdmonteur','fremdfirma','pensionaer'`

#### Kurzfristig (Sprint 6-7):

6. **`buero` als Department ergänzen** – fehlt in Migration 034, wird aber im Excel genutzt
7. **Bulk-Assignment-Endpoint** – fehlt im Service, geplant im Sprint
8. **Wochenplan-View-Service** – der aggregierende Endpoint für die KW-Ansicht
9. **Capacity-Service** – Auslastungsberechnung pro Abteilung

### 2.4 Multi-Tenant Skalierung

```
AKTUELL (Single-Tenant):
┌─────────────────────┐
│ projects             │ ← user_id für Ownership
│ tasks                │ ← project_id
│ resources            │ ← team_id (rudimentär)
│ task_assignments     │ ← task_id + resource_id
└─────────────────────┘

ZIEL (Multi-Tenant mit RLS):
┌─────────────────────┐
│ tenants              │ ← Schreinerei-Betrieb
│ projects             │ ← tenant_id + user_id
│ tasks                │ ← tenant_id (redundant für Performance)
│ resources            │ ← tenant_id
│ task_assignments     │ ← tenant_id
│ customers            │ ← tenant_id
└─────────────────────┘

+ Supabase Row-Level Security:
  CREATE POLICY tenant_isolation ON projects
    USING (tenant_id = current_setting('app.tenant_id')::UUID);
```

**Migrations-Strategie für Multi-Tenant:**
1. `tenant_id UUID NOT NULL` auf alle relevanten Tabellen
2. Supabase RLS-Policies pro Tabelle
3. JWT enthält `tenant_id` → wird bei jedem Request als `app.tenant_id` gesetzt
4. Performance: `tenant_id` in alle Indizes einbauen (Composite Keys)

---

## 3. Tech-Stack Evolution

### 3.1 Backend: Express → NestJS?

| Aspekt | Express (aktuell) | NestJS (Option) | Empfehlung |
|--------|-------------------|------------------|------------|
| Codebasis | ~15 Controllers, ~15 Services | Gleiche Menge, striktere Struktur | — |
| Lernkurve | Team kennt Express | NestJS ist neu, Decorator-heavy | ⚠️ |
| Dependency Injection | Manual / adhoc | Built-in, testbar | ✅ NestJS |
| Modularität | Konvention-basiert | Modul-System erzwingt Struktur | ✅ NestJS |
| WebSocket | socket.io manuell | @nestjs/websockets integriert | ✅ NestJS |
| Validation | express-validator (manuell) | class-validator + DTOs | ✅ NestJS |
| OpenAPI/Swagger | Manuell | @nestjs/swagger automatisch | ✅ NestJS |
| Migrations-Aufwand | — | ~2-3 Wochen Rewrite | ⚠️ Hoch |

**Empfehlung: Express beibehalten, schrittweise NestJS-Patterns adoptieren.**

Begründung:
- Die aktuelle Codebasis ist konsistent und funktioniert
- Ein Rewrite kostet 2-3 Wochen ohne neuen Mehrwert für den User
- Stattdessen: Express-Code mit NestJS-Patterns verbessern:
  - DTOs mit `class-validator` statt `express-validator`
  - Service-Injection Pattern (Factory Functions)
  - Modul-artige Ordnerstruktur (siehe 3.2)
- **Wenn** IntelliPlan in Q4 zum SaaS wird, kann der NestJS-Rewrite als Teil des "SaaS-Launch" geplant werden

### 3.2 Frontend: Feature-basierte Ordnerstruktur

```
AKTUELL:
src/
├── components/       ← Alles in einem Topf
├── pages/            ← Seiten
├── services/         ← API-Calls
└── types/            ← Typen

VORSCHLAG:
src/
├── features/
│   ├── wochenplan/
│   │   ├── components/
│   │   │   ├── WochenplanHeader.tsx
│   │   │   ├── WochenplanSection.tsx
│   │   │   ├── WochenplanTable.tsx
│   │   │   ├── AssignmentCell.tsx
│   │   │   ├── CapacityBar.tsx
│   │   │   └── PhaseWeekBadge.tsx
│   │   ├── hooks/
│   │   │   ├── useWochenplan.ts
│   │   │   └── useCapacity.ts
│   │   ├── services/
│   │   │   └── wochenplanService.ts
│   │   ├── types/
│   │   │   └── wochenplan.types.ts
│   │   └── WochenplanPage.tsx
│   │
│   ├── projects/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── ProjectsPage.tsx
│   │
│   ├── resources/
│   ├── pendenzen/
│   ├── import/
│   └── settings/
│
├── shared/
│   ├── components/     ← Layout, Navigation, generische UI
│   ├── hooks/          ← useAuth, useTheme, etc.
│   ├── services/       ← authService, apiClient
│   ├── types/          ← Globale Typen
│   └── utils/          ← Formatierung, KW-Berechnung
│
└── App.tsx
```

**Wann umstellen:** Schrittweise. Neue Features (Wochenplan) direkt in der neuen Struktur bauen. Bestehende Features bei Bedarf migrieren.

### 3.3 DB: Supabase Integration + Row-Level Security

**Aktuell:** Direkte PostgreSQL-Verbindung via `pg` Pool.

**Supabase würde bieten:**
- **RLS (Row-Level Security):** Multi-Tenant-Isolation auf DB-Ebene – kein `WHERE tenant_id = ?` in jedem Query
- **Realtime:** Supabase Realtime subscriptions für Live-Updates (WebSocket out of the box)
- **Auth:** Supabase Auth statt eigener JWT-Implementierung
- **Storage:** Datei-Uploads (Montage-Fotos, Dokumente)
- **Edge Functions:** Serverless für bestimmte Workflows (Email-Notifications, etc.)

**Migrations-Plan:**
1. **Phase 1 (Q2):** Supabase als Datenbank (PostgreSQL bleibt, nur gehostet bei Supabase)
2. **Phase 2 (Q3):** RLS-Policies aktivieren, Auth migrieren
3. **Phase 3 (Q4):** Realtime + Storage nutzen

**Risiken:**
- Vendor Lock-in (mitigiert: Supabase ist Open Source, PostgreSQL bleibt Standard)
- Performance bei komplexen RLS-Policies (mitigiert: Benchmarking vor Go-Live)

### 3.4 Realtime: WebSocket/SSE für Live-Updates

```
Option A: Socket.IO (Express-kompatibel)
  + Einfach, bekannt, Fallback auf Polling
  + Rooms für Tenant-Isolation
  - Eigene Server-Infrastruktur nötig

Option B: Supabase Realtime
  + Zero-Config, DB-Change-Events automatisch
  + RLS automatisch angewendet
  - Nur DB-Changes, keine Custom-Events
  - Abhängig von Supabase-Migration

Option C: Server-Sent Events (SSE)
  + Einfachste Implementierung
  + HTTP-basiert, kein WebSocket-Overhead
  - Nur Server→Client, kein bidirektional
  - Kein nativer Reconnect in allen Browsern
```

**Empfehlung: Socket.IO kurzfristig (Q2-Q3), Supabase Realtime langfristig (Q4).**

Socket.IO ermöglicht Custom Events (z.B. "Assignment erstellt", "Kapazitätswarnung") die über reine DB-Changes hinausgehen. Bei der Supabase-Migration kann dann der Realtime-Layer schrittweise auf Supabase Realtime umgestellt werden.

### 3.5 Mobile: PWA vs. React Native

| Aspekt | PWA | React Native |
|--------|-----|-------------|
| Entwicklungsaufwand | Gering (gleiche Codebasis) | Hoch (neue App) |
| Offline-Support | Service Worker (gut) | AsyncStorage (gut) |
| Push-Notifications | Limitiert auf iOS | Voll unterstützt |
| Kamera-Zugriff | Ja (MediaDevices API) | Ja (nativ, besser) |
| GPS/Navigation | Ja | Ja |
| App Store Präsenz | Nein | Ja |
| Update-Zyklus | Sofort (wie Web) | App Store Review (1-3 Tage) |
| Performance | Gut für simple UI | Besser für komplexe UI |

**Empfehlung: PWA für Q3-MVP, React Native evaluieren für Q4.**

Begründung:
- Die Monteur-App ist primär Tagesplan-Ansicht + Rückmeldung – keine komplexe UI
- PWA kann sofort mit dem bestehenden Tech-Stack gebaut werden
- Kein App-Store-Prozess = schnellere Iterationen
- Wenn die PWA-Limitierungen (v.a. Push auf iOS) zum Problem werden → React Native

---

## 4. Differenzierungsstrategie

### 4.1 Wettbewerbslandschaft

| Lösung | Stärke | Schwäche | Zielgruppe |
|--------|--------|----------|------------|
| **TopSolid** | CAD/CAM + ERP integriert | Komplex, teuer, nicht flexibel | Grosse Schreinereien |
| **SWOOD** | SolidWorks-Integration | Nur CAD, keine Planung | CAD-Anwender |
| **IMOS iX** | Vollintegriert (CAD→Produktion) | Sehr teuer, langer Onboarding | Enterprise |
| **Orgaplan** | Schreinerei-ERP | Veraltete UI, kein Echtzeit | Traditionelle Betriebe |
| **Monday.com / Asana** | Flexibel, modern | Nicht schreinerei-spezifisch | Generisch |
| **Excel** | Bekannt, flexibel | Keine Kollaboration, fehleranfällig | Alle (Ist-Zustand) |
| **IntelliPlan** | Schreinerei-nativ, AI, modern | Noch jung, kleiner Markt | KMU Schreinereien |

### 4.2 USP: Dreifach-Differenzierung

```
┌─────────────────────────────────────────────────────────┐
│                    INTELLIPLAN USP                       │
│                                                         │
│  1. SCHREINEREI-NATIV                                   │
│     - Spricht die Sprache der Branche                   │
│     - Wochenplan wie im Excel (aber besser)              │
│     - Produktionsphasen ZUS→CNC→PROD→BEH→MONT          │
│     - KW-basierte Planung (nicht Stunden/Tage)           │
│     - Templates für Einbauschränke, Küchen, Türen, ...  │
│                                                         │
│  2. AI-GESTÜTZT                                         │
│     - Automatische Kapazitätsoptimierung                │
│     - Konflikterkennung VOR dem Problem                  │
│     - Rückwärtsplanung mit Lern-Effekt                   │
│     - Vorhersage: "KW15 wird eng in der Produktion"      │
│                                                         │
│  3. RHINO/CAD-INTEGRATION (Zukunft)                     │
│     - Stückliste aus Rhino → automatisch Material+Tasks  │
│     - Änderung im CAD → Planung passt sich an            │
│     - BIM-Daten für Montageplanung                       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 4.3 Pricing-Modell

```
┌──────────────────────────────────────────────────────────┐
│                   PRICING TIERS                          │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  🟢 STARTER              CHF 49/Monat                   │
│  ─────────────────────────────────────                   │
│  - 1 Benutzer                                            │
│  - Wochenplan READ + WRITE                               │
│  - Bis 10 Mitarbeiter im Plan                            │
│  - Excel-Import (einmalig)                               │
│  - E-Mail-Support                                        │
│                                                          │
│  🟡 PROFESSIONAL         CHF 149/Monat                  │
│  ─────────────────────────────────────                   │
│  - Bis 5 Benutzer                                        │
│  - Alles aus Starter                                     │
│  - Unbegrenzte Mitarbeiter                               │
│  - Kapazitätsplanung                                     │
│  - Echtzeit-Kollaboration                                │
│  - Monteur-App (PWA)                                     │
│  - AI-Planungsvorschläge                                 │
│  - Excel-Export + Druckansicht                            │
│  - Prioritäts-Support                                    │
│                                                          │
│  🔴 ENTERPRISE           CHF 349/Monat                  │
│  ─────────────────────────────────────                   │
│  - Unbegrenzte Benutzer                                  │
│  - Alles aus Professional                                │
│  - Kunden-Modul                                          │
│  - Materialplanung                                       │
│  - Zeiterfassung                                         │
│  - CAD/Rhino-Integration                                 │
│  - API-Zugang                                            │
│  - Custom-Branding                                       │
│  - Dedizierter Ansprechpartner                           │
│                                                          │
│  💼 CUSTOM               Auf Anfrage                    │
│  ─────────────────────────────────────                   │
│  - On-Premise Option                                     │
│  - Custom-Integrationen                                  │
│  - SLA-Garantie                                          │
│                                                          │
└──────────────────────────────────────────────────────────┘

Zusätzlich:
- Jährliche Zahlung: 20% Rabatt
- Einführungs-Angebot: 3 Monate Starter gratis
- Migration-Service: CHF 500 einmalig (Excel → IntelliPlan Import + Schulung)
```

### 4.4 Marktgrösse & Go-to-Market

**Schweizer Markt:**
- ~5'000 Schreinereien in der Schweiz
- Davon ~2'000 mit >5 Mitarbeitern (relevant für IntelliPlan)
- Durchschnittlich CHF 149/Monat → **TAM: CHF 3.6M ARR**
- Realistisch 5% Marktanteil in 3 Jahren → **CHF 180K ARR**

**DACH-Markt (Expansion):**
- ~40'000 Schreinereien in DACH
- 10× grösserer Markt → **TAM: CHF 36M ARR**

**Go-to-Market:**
- **Phase 1:** Direktvertrieb an 1-3 Betriebe (Piloten)
- **Phase 2:** Content-Marketing (Blog, YouTube: "Excel-Ablösung in der Schreinerei")
- **Phase 3:** Branchen-Events (Holz-Messen, Schreinertage)
- **Phase 4:** Partnerschaften mit Branchenverbänden (VSSM, etc.)

---

## 5. Roadmap (Quartale)

### Q1 2026 (KW08-KW20): MVP Wochenplan

**Ziel:** Excel-Ablösung für 1 Betrieb (Bucher AG)

```
KW08-09: ████ Datenmodell fertigstellen (Iteration 2 Fixes + Tests)
KW10-11: ████ Wochenplan-API (aggregierender Endpoint)
KW12-14: ██████ Wochenplan-Frontend (READ-ONLY, KW-Navigation)
KW15-16: ████ Click-to-Assign + Kapazitätsanzeige
KW17-18: ████ Excel-Import (Bestandsdaten)
KW19-20: ████ Bugfixes, Polish, Pilotbetrieb-Start
```

**Deliverables:**
- Wochenplan in IntelliPlan lesbar (alle Sektionen, alle Tage)
- MA-Zuordnung per Click
- Kapazitäts-Ampel pro Abteilung
- Bestandsdaten aus Excel importiert
- 1 Betrieb nutzt IntelliPlan parallel zum Excel

### Q2 2026 (KW21-KW33): Multi-User + Kapazität + Import

**Ziel:** Mehrere User gleichzeitig, volle Kapazitätsplanung

```
KW21-22: ████ Abwesenheitsplanung (Ferien, Krank, etc.)
KW23-25: ██████ Echtzeit-Kollaboration (Socket.IO)
KW26-27: ████ Kapazitäts-Dashboard (Auslastung über KWs)
KW28-29: ████ Drag & Drop Zuordnung
KW30-31: ████ Excel-Export + Druckansicht
KW32-33: ████ Kunden-Modul (Grundversion)
```

**Deliverables:**
- 3-5 gleichzeitige User
- Live-Updates (Änderungen sofort sichtbar)
- Abwesenheitsplanung integriert
- Kapazitäts-Dashboard über alle Wochen
- Excel-Export für die Werkstatt-Wand
- Zentrales Kundenverzeichnis

### Q3 2026 (KW34-KW46): AI Features + Mobile + Kunden-Modul

**Ziel:** Differenzierung durch AI + Mobile-Zugang

```
KW34-36: ██████ AI Auto-Scheduling 2.0 (ML-basierte Vorlaufzeiten)
KW37-39: ██████ PWA Monteur-App (Tagesplan, Navigation, Rückmeldung)
KW40-41: ████ Zeiterfassung (Grundversion)
KW42-43: ████ Materialplanung (Grundversion)
KW44-46: ██████ Supabase-Migration (Phase 1: DB + Auth)
```

**Deliverables:**
- AI schlägt optimale Wochenplan-Belegung vor
- Monteure haben eigene App
- Zeiterfassung für Soll/Ist-Vergleich
- Material-Tracking pro Auftrag
- Supabase als DB-Backend

### Q4 2026 (KW47-KW06/2027): Multi-Tenant + SaaS Launch

**Ziel:** IntelliPlan als SaaS für beliebige Schreinereien

```
KW47-49: ██████ Multi-Tenant (RLS, Tenant-Onboarding)
KW50-51: ████ Pricing + Billing (Stripe)
KW52-01: ████ Landing Page + Marketing-Site
KW02-04: ██████ Beta-Launch (10 Betriebe)
KW05-06: ████ Feedback-Runde + Fixes
```

**Deliverables:**
- Self-Service Registrierung
- Automatische Abrechnung
- 10 zahlende Kunden
- Marketing-Präsenz

### Langfristig (2027+):

| Feature | Priorität | Abhängigkeit |
|---------|-----------|-------------|
| Rhino/CAD-Plugin | Hoch | Stabile API |
| BIM-Integration | Mittel | Rhino-Plugin |
| Nachkalkulation | Hoch | Zeiterfassung + Material |
| Lieferanten-Portal | Mittel | Materialplanung |
| White-Label | Niedrig | Multi-Tenant |
| Native Mobile App | Niedrig | PWA-Feedback |

---

## Anhang: Technologie-Entscheidungsmatrix

| Entscheidung | Kurzfristig (Q1-Q2) | Langfristig (Q3-Q4) | Begründung |
|---|---|---|---|
| Backend-Framework | Express (beibehalten) | NestJS (evaluieren) | Migration-Aufwand vs. Feature-Velocity |
| Datenbank | PostgreSQL (pg Pool) | Supabase PostgreSQL | RLS + Realtime out of the box |
| Auth | Eigene JWT-Lösung | Supabase Auth | Zentralisiert, Social Login möglich |
| Realtime | Socket.IO | Supabase Realtime | Schrittweise Migration |
| Mobile | — | PWA | Geringster Aufwand, schnellste Iteration |
| State Management | React useState/useEffect | Zustand oder TanStack Query | Bei wachsender Komplexität |
| Testing | Vitest (Unit) | + Playwright (E2E) | E2E für kritische Workflows |
| CI/CD | GitHub Actions (vorhanden) | + Preview Deployments | Feature-Branches direkt testbar |
| Hosting | Lokal/VPS | Vercel (Frontend) + Railway (Backend) | Skalierbar, günstig für Start |
| Monitoring | Console.log / Pino | Sentry + Posthog | Error Tracking + Analytics |
