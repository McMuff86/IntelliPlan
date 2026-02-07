# IntelliPlan – Vereinigung Projects ↔ Wochenplan (v2)

> Überarbeiteter Plan nach Feedback. Änderungen gegenüber v1:
> - Kein Umbenennen von "Projects" → bleibt universell
> - Gantt als primäre Ansicht (nicht Phasen-Timeline)
> - Phasen flexibel pro Projekt (nicht jedes Projekt braucht alle)
> - Ressourcen-Modell gründlich überarbeitet
> - Datenbereinigung als Phase 0

---

## Status Quo

### Datenbestand (nach Excel-Import)
| Tabelle | Einträge | Zustand |
|---------|----------|---------|
| projects | 247 | ✅ OK – order_number, customer_name, description vorhanden |
| tasks | 828 | ⚠️ 756 haben planned_week aber kein start_date/due_date |
| resources | 94 | ❌ Nur 29 echte MA-Codes, 65 sind Zeitnotizen ("07:30 Uhr", "1h vorher anrufen") |
| task_assignments | 1023 | ⚠️ 96 Zuweisungen zeigen auf Junk-Resources |
| task_phase_schedules | 702 | ✅ OK |

### Kernproblem
- **Projects-View** und **Wochenplan-View** nutzen dieselben Tabellen, aber verschiedene Felder
- **Resources** sind verschmutzt – Zeitnotizen wurden als Mitarbeiter importiert
- **Phasen** sind fest verdrahtet statt flexibel pro Projekt
- **Kein Department/Skills** auf den echten Mitarbeitern

---

## Phase 0: Datenbereinigung

### 0.1 Junk-Resources aufräumen

Die 65 Nicht-Mitarbeiter-Einträge sind Zeitnotizen aus Excel-Zellen. Sie enthalten aber potenziell wertvolle Info (Uhrzeiten, Hinweise). Plan:

```sql
-- 1. Zeitnotizen aus Junk-Assignments als notes auf die echten Assignments übertragen
-- Beispiel: "07:30 Uhr" bei Auftrag X = Startzeit-Hinweis für den zugewiesenen MA

-- 2. Junk-Assignments löschen (96 Einträge)
DELETE FROM task_assignments 
WHERE resource_id IN (
  SELECT id FROM resources WHERE short_code !~ '^MA_' AND deleted_at IS NULL
);

-- 3. Junk-Resources soft-deleten
UPDATE resources SET deleted_at = NOW() 
WHERE short_code !~ '^MA_' AND deleted_at IS NULL;
```

**Ergebnis:** 29 echte Mitarbeiter, 927 valide Zuweisungen.

### 0.2 Import-Parser fixen

`isResourceAssignment()` in importService.ts muss strenger filtern:

```typescript
function isResourceAssignment(value: string): boolean {
  if (!value) return false;
  const trimmed = value.trim();
  
  // Muss wie ein MA-Code aussehen: MA_xx, Lehrling_xx, etc.
  if (/^MA_\d+$/i.test(trimmed)) return true;
  if (/^lehrling/i.test(trimmed)) return true;
  if (/^fremdmonteur/i.test(trimmed)) return true;
  if (/^hilf/i.test(trimmed)) return true;
  
  // Alles andere (Zeiten, Notizen) → kein Assignment
  return false;
}
```

Zeitnotizen wie "07:30 Uhr" stattdessen als `timeNote` auf dem Assignment speichern (Feld existiert bereits).

**Aufwand:** ~2h

---

## Phase 1: Datenmodell vervollständigen

### 1.1 Tasks: start_date/due_date aus planned_week berechnen

```sql
-- Migration: Backfill start_date/due_date
UPDATE tasks SET
  start_date = (
    make_date(planned_year, 1, 4)  -- 4. Januar ist immer in KW1
    - (EXTRACT(ISODOW FROM make_date(planned_year, 1, 4))::int - 1)  -- Zurück zum Montag
    + ((planned_week - 1) * 7)  -- Zur richtigen KW
  )::date,
  due_date = (
    make_date(planned_year, 1, 4) 
    - (EXTRACT(ISODOW FROM make_date(planned_year, 1, 4))::int - 1)
    + ((planned_week - 1) * 7 + 4)  -- Freitag
  )::date
WHERE planned_week IS NOT NULL 
  AND planned_year IS NOT NULL 
  AND start_date IS NULL
  AND deleted_at IS NULL;
```

→ Alle 756 Tasks bekommen start_date/due_date → Projects-View und Gantt funktionieren.

### 1.2 Phasen: Flexibel pro Projekt

Aktuell: Jeder Task hat einen `phase_code`. Projekte haben **implizit** die Phasen ihrer Tasks.

Das ist bereits flexibel genug. Wenn ein Beschichtetes-Platten-Projekt keine Behandlung braucht, hat es einfach keinen Task mit `VORBEH`/`NACHBEH`.

**Was fehlt:** Eine Referenz-Tabelle für die Standard-Phasenreihenfolge + optionale Customization.

```sql
-- Neue Tabelle: Phasen-Definitionen (konfigurierbar)
CREATE TABLE IF NOT EXISTS phase_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) UNIQUE NOT NULL,      -- ZUS, CNC, PROD, VORBEH, NACHBEH, BESCHL, TRANS, MONT
  name VARCHAR(100) NOT NULL,            -- Zuschnitt, CNC, Produktion, ...
  sort_order INTEGER NOT NULL,           -- 1, 2, 3, ...
  default_duration_days INTEGER DEFAULT 5,
  is_active BOOLEAN DEFAULT true,
  department VARCHAR(50),                -- Welche Abteilung ist zuständig
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed mit Standard-Phasen
INSERT INTO phase_definitions (code, name, sort_order, department) VALUES
  ('ZUS',     'Zuschnitt',       10, 'zuschnitt'),
  ('CNC',     'CNC',             20, 'cnc'),
  ('PROD',    'Produktion',      30, 'produktion'),
  ('VORBEH',  'Vorbehandlung',   40, 'behandlung'),
  ('NACHBEH', 'Nachbehandlung',  50, 'behandlung'),
  ('BESCHL',  'Beschläge',       60, 'beschlaege'),
  ('TRANS',   'Transport',       70, 'transport'),
  ('MONT',    'Montage',         80, 'montage')
ON CONFLICT (code) DO NOTHING;
```

Beim **Erstellen eines Projekts** wählt der User welche Phasen relevant sind (Checkboxen, alle an by default). Für jede gewählte Phase wird ein Task erstellt.

### 1.3 Projekte: Computed Zeitraum

Kein `start_date`/`due_date` auf Projects speichern – wird aus Tasks berechnet:

```sql
-- Service-Query für Projektliste
SELECT p.*, 
  MIN(t.start_date) AS project_start,
  MAX(t.due_date) AS project_end,
  array_agg(DISTINCT t.phase_code ORDER BY t.phase_code) AS phases,
  COUNT(DISTINCT t.id) AS task_count,
  COUNT(DISTINCT ta.resource_id) AS assigned_resources
FROM projects p
LEFT JOIN tasks t ON t.project_id = p.id AND t.deleted_at IS NULL
LEFT JOIN task_assignments ta ON ta.task_id = t.id AND ta.deleted_at IS NULL
WHERE p.deleted_at IS NULL
GROUP BY p.id;
```

**Aufwand:** ~2h, 2 Migrations + Service-Anpassungen

---

## Phase 2: Ressourcen-Modell überarbeiten

### 2.1 Aktuelles Problem

Die 29 echten Mitarbeiter haben:
- ✅ short_code (MA_01 bis MA_40)
- ✅ work_role (arbeiter/hilfskraft/lehrling/allrounder/buero)
- ❌ **Kein echtes Department** – alle leer
- ❌ **Keine Skills** – alle leer  
- ❌ **Anonymisierte Namen** – name = short_code (verständlich für das Test-Excel)
- ❌ **Keine Kapazitäts-Info** – weekly_hours alle 42.5 Default

### 2.2 Erweitertes Ressourcen-Modell

```
Resource (Mitarbeiter)
├── Stammdaten
│   ├── name: "Hans Müller"
│   ├── short_code: "MA_01" (für Wochenplan-Ansicht)
│   ├── department: "produktion" (Haupt-Abteilung)
│   ├── work_role: "arbeiter" | "hilfskraft" | "lehrling" | "allrounder" | "buero"
│   └── employee_type: "internal" | "apprentice" | "temporary" | "external_firm" | "pensioner"
│
├── Fähigkeiten
│   ├── primary_phases: ["PROD", "ZUS"]  -- Kann standardmässig in diesen Phasen eingesetzt werden
│   ├── secondary_phases: ["CNC"]        -- Kann bei Bedarf auch hier eingesetzt werden
│   └── qualifications: ["CNC Operator", "Staplerschein", "Lackierer"]
│
├── Kapazität
│   ├── weekly_hours: 42.5
│   ├── work_days: [1,2,3,4,5]  -- Mo-Fr (Teilzeit: z.B. [1,2,3])
│   └── is_active: true
│
└── Verfügbarkeit (separat, z.B. Ferien/Krankheit)
    └── resource_absences Tabelle (Zukunft)
```

### 2.3 Migration

```sql
-- Neue Spalten auf resources
ALTER TABLE resources ADD COLUMN IF NOT EXISTS primary_phases TEXT[] DEFAULT '{}';
ALTER TABLE resources ADD COLUMN IF NOT EXISTS secondary_phases TEXT[] DEFAULT '{}';
ALTER TABLE resources ADD COLUMN IF NOT EXISTS qualifications TEXT[] DEFAULT '{}';
ALTER TABLE resources ADD COLUMN IF NOT EXISTS work_days INTEGER[] DEFAULT '{1,2,3,4,5}';

-- Absenz-Tabelle (Ferien, Krankheit, Militär etc.)
CREATE TABLE IF NOT EXISTS resource_absences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  absence_type VARCHAR(30) NOT NULL CHECK (absence_type IN (
    'vacation', 'sick', 'military', 'training', 'other'
  )),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  half_day VARCHAR(10) CHECK (half_day IN ('morning', 'afternoon', NULL)),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(resource_id, start_date, half_day)
);
```

### 2.4 Department aus Assignments ableiten

Wir können das Department der 29 MA aus ihren existierenden Assignments rückschliessen:

```sql
-- In welchen Phasen arbeitet jeder MA hauptsächlich?
SELECT r.short_code,
  mode() WITHIN GROUP (ORDER BY t.phase_code) AS most_common_phase,
  array_agg(DISTINCT t.phase_code) AS all_phases,
  count(*) as assignment_count
FROM task_assignments ta
JOIN resources r ON ta.resource_id = r.id
JOIN tasks t ON ta.task_id = t.id
WHERE ta.deleted_at IS NULL AND r.short_code ~ '^MA_'
GROUP BY r.short_code
ORDER BY r.short_code;
```

→ MA_13 arbeitet hauptsächlich in ZUS → department = 'zuschnitt', primary_phases = ['ZUS']
→ MA_11 arbeitet hauptsächlich in MONT → department = 'montage', primary_phases = ['MONT']

Das automatisch backfillen, dann manuell verfeinern.

**Aufwand:** ~3h (Migration + Backfill-Script + API-Anpassung + Frontend ResourceEditDialog erweitern)

---

## Phase 3: Projects-View erweitern (Frontend)

### 3.1 Projektliste mit relevanten Feldern

| Spalte | Quelle | Sortierbar/Filterbar |
|--------|--------|---------------------|
| Auftragsnr. | order_number | ✅ |
| Kunde | customer_name | ✅ |
| Beschreibung | description | - |
| Phasen | Badges der vorhandenen Phasen | Filter |
| KW-Range | Computed aus Tasks | ✅ |
| Status | Computed: "In Produktion KW07" | Filter |
| Arb./Hilf. | worker_count / helper_count | - |
| SB | sachbearbeiter | Filter |

### 3.2 Projekt-Detail: Gantt mit Phasen

Gantt bleibt die primäre Ansicht. Anpassung: Tasks werden nach `phase_code` **gruppiert und nach Phasen-Reihenfolge sortiert** (aus phase_definitions.sort_order).

```
Auftrag 25.0591-201/005 – Einbauschrank
│
│  KW02    KW03    KW04    KW05    KW06    KW07
│  ├──────┤                                        ZUS (MA_13)
│          ├──────┤                                 CNC (MA_14)
│                  ├──────────────┤                 PROD (MA_03, MA_05)
│                                  ├────┤           BEH (MA_20)
│                                        ├────┤     BESCHL (MA_17)
│                                              ├──┤ MONT (MA_11)
```

Jeder Gantt-Balken zeigt:
- Phase-Name + Farbe
- Zugewiesene Mitarbeiter (Initialen/Kürzel)
- Klick → Assignment-Panel (Wer arbeitet wann?)

### 3.3 Verlinkung Wochenplan ↔ Projekte

- **Wochenplan:** Auftragsnummer wird klickbarer Link → `/projects/:id`
- **Projekt-Detail:** Button "Im Wochenplan anzeigen" → `/wochenplan?kw=X&highlight=orderNr`
- **Mitarbeiter-Detail:** Zeigt zugewiesene Projekte mit Phasen

### 3.4 Neues Projekt erstellen

Dialog/Page:
1. **Stammdaten:** Auftragsnummer*, Kunde*, Beschreibung*, Sachbearbeiter, Farbe
2. **Phasen auswählen:** Checkboxen aus phase_definitions (alle aktiven angezeigt, Default: alle an)
3. **Grob-Planung:** Start-KW angeben → Phasen werden sequentiell verteilt (je 1 KW Default)
4. **Optional:** Mitarbeiter-Count pro Phase, Bemerkungen

Beim Speichern: 1 Task pro gewählter Phase erstellt, start_date/due_date automatisch berechnet.

**Aufwand:** ~6h

---

## Phase 4: Import-Pipeline verbessern

### 4.1 Smarter Excel-Parser

Der aktuelle Parser importiert "blind" – alles was in einer Zelle steht wird zum Assignment. Verbesserungen:

- **Zeitnotizen erkennen** (Regex für Uhrzeiten) → als `time_note` auf dem Assignment speichern, nicht als Resource
- **Farb-Codes** aus Excel-Zellen auslesen (ExcelJS kann das) → Projekte korrekt einfärben
- **Sections** (Zuschnitt, Montage etc.) → Department-Zuweisung auf den erstellten Tasks

### 4.2 Import-Vorschau

Statt direkt zu importieren:
1. **Parse** → Zeige Vorschau (wie jetzt)
2. **Resource-Matching** → Zeige unbekannte MA-Codes, biete Mapping an
3. **Projekt-Matching** → Zeige welche Projekte neu/update sind
4. **Validieren** → Konflikte, doppelte Zuweisungen
5. **Importieren** mit Summary

**Aufwand:** ~4h

---

## Zusammenfassung: Reihenfolge

| Prio | Phase | Was | Aufwand | Abhängigkeit |
|------|-------|-----|---------|-------------|
| **1** | **0.1** | **Junk-Resources bereinigen** | 1h | – |
| **2** | **0.2** | **Import-Parser fixen** | 1h | – |
| **3** | **1.1** | **Tasks: start_date backfill** | 1h | – |
| **4** | **1.2** | **Phase-Definitions Tabelle** | 1h | – |
| **5** | **2.3-2.4** | **Resources erweitern + Department backfill** | 3h | 0.1 |
| **6** | **3.3** | **Verlinkung Wochenplan ↔ Projekte** | 2h | 1.1 |
| **7** | **3.1** | **Projektliste mit neuen Feldern** | 2h | 1.3 |
| **8** | **3.2** | **Gantt mit Phasen-Sortierung** | 3h | 1.2 |
| **9** | **3.4** | **Neues Projekt erstellen** | 3h | 1.2, 2.3 |
| **10** | **4.1-4.2** | **Import-Pipeline verbessern** | 4h | 0.2, 2.3 |

**Total: ~21h** → 3-4 Nacht-Sessions

### Quick Wins (sofort spürbar)
- Phase 0 + 1.1 + 3.3: **4h** → Saubere Daten, Verlinkung, Projekte im Gantt sichtbar
- Das allein macht die App schon deutlich brauchbarer

---

## Offene Entscheidungen

1. **Phase-Definitions: User-konfigurierbar oder Admin-only?**
   → Empfehlung: Admin-only für v1 (Settings-Page), User-konfigurierbar in v2

2. **Resource-Absences: Jetzt oder später?**
   → Empfehlung: Tabelle jetzt erstellen, Frontend später. Kapazitätsberechnung braucht es.

3. **Sollen Assignments zwischen Phasen Dependencies erzeugen?**
   → Empfehlung: Nein für v1. Phasen-Reihenfolge (sort_order) ist implizit genug. Dependencies nur wenn ein Kunde es wirklich braucht.

4. **Anonymisierte Daten: Soll der Import echte Namen können?**
   → Das Test-Excel hat `MA_01` etc. Im Echtbetrieb stünden dort echte Kürzel oder Namen. Der ResourceEditDialog existiert bereits zum Nachpflegen. Kein Handlungsbedarf.
