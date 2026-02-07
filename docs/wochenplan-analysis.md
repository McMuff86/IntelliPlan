# Wochenplan Excel → IntelliPlan: Analyse & Mapping

> **Stand:** 2026-02-07 · **Autor:** Sentinel (Analyse-Session)
> **Quellen:** `Wochenplan_2026_anonymisiert.xlsx`, IntelliPlan Codebase, `technical-overview.md`

---

## Inhaltsverzeichnis

1. [Ist-Prozess: Wie funktioniert die Planung im Excel?](#1-ist-prozess)
2. [Datenmodell-Mapping: Excel → IntelliPlan](#2-datenmodell-mapping)
3. [Gap-Analyse: Was kann IntelliPlan heute – was fehlt?](#3-gap-analyse)
4. [Feature-Roadmap: Priorisiert nach Mehrwert](#4-feature-roadmap)
5. [Migrations-Strategie: Excel-Daten importieren](#5-migrations-strategie)

---

## 1. Ist-Prozess

### 1.1 Übersicht: Der Wochenplan als Produktions-Cockpit

Der Wochenplan ist ein Excel-Workbook mit **53 KW-Sheets** (KW01–KW53) plus 3 Hilfs-Sheets. Er ist das **zentrale Planungs-, Kommunikations- und Steuerungsinstrument** der Schreinerei Bucher AG. Pro KW-Sheet werden ~300 Zeilen und 29 Spalten genutzt.

**Kernfunktion:** Der Wochenplan beantwortet für jede KW zwei Fragen:
1. **Was wird produziert?** → Aufträge, gruppiert nach Produktionsphase
2. **Wer macht was, wann?** → Mitarbeiter-Zuordnung pro Tag und Halbstag

### 1.2 Struktur eines KW-Sheets

```
Zeile 1:    KW-Header (z.B. "KW06 / 02.02. - 06.02.2026")
Zeile 3-4:  Spaltenköpfe + Phasen-Abkürzungen

=== SEKTIONEN (vertikal gestapelt) ===

Zeile ~5:    ┌─ ZUSCHNITT (ZUS)
             │   Auftragszeilen + Mitarbeiterzuordnung
             │   "Total Auftragszeiten Zuschnitt"
             └─

Zeile ~25:   ┌─ CNC
             │   Mitarbeiter-Header (mit Anwes./Sollzeit/Unprod)
             │   Auftragszeilen
             │   "Total Auftragszeiten CNC" + "Kapazität CNC"
             └─

Zeile ~46:   ┌─ PRODUKTION (PROD)
             │   Mitarbeiter-Header (7 Produktionsmitarbeiter)
             │   Auftragszeilen (meisten Aufträge, ~30 Zeilen)
             │   "Total Auftragszeiten Produktion" + "Kapazität Produktion"
             └─

Zeile ~90:   ┌─ VORBEHANDLUNG (BEH)
             │   2 Behandler-Mitarbeiter
             │   Auftragszeilen
             │   "Total Auftragszeiten" + "Kapazität"
             ├─ KUNDE_131 (50% Kapazität, morgens)
             │   Auftragszeilen
             ├─ NACHBEHANDLUNG (BEH)
             │   Auftragszeilen
             ├─ BEHANDLUNG MALER_01 (BEH)
             │   Auftragszeilen
             ├─ BEHANDLUNG MALER_02 (BEH)
             └─

Zeile ~161:  ┌─ BESCHLÄGEN
             │   Auftragszeilen
             └─

Zeile ~178:  ┌─ TRANSPORT (3 Sektionen)
             │   Verschiedene Transport-Teams
             └─

Zeile ~213:  ┌─ MONTAGE (MON)
             │   2 eigene Monteure
             │   Auftragszeilen (viele mit fix-Angaben)
             │   "Total Auftragszeiten Montage" + "Kapazität Montage"
             └─

Zeile ~256:  ┌─ LEHRLINGE / HILFSKRAFT
             │   4 Lehrlinge + Hilfskräfte
             │   Zuordnung zu Monteure pro Tag
             └─

Zeile ~274:  ┌─ FREMDMONTEURE
             │   ~18 Fremdmonteure + 3 Fremdfirmen
             │   Zuordnung pro Tag
             └─

Zeile ~300:  ┌─ PENSIONÄRE
             │   8 Pensionäre
             └─

Zeile ~311:  ┌─ BÜRO
             │   ~11 Büroangestellte (SB/Projektleiter)
             └─

Zeile ~326:  ┌─ LEGENDE
             │   Farb-/Abkürzungslegende (FREI, FEI, SB_63, etc.)
             └─
```

### 1.3 Datenstruktur pro Auftragszeile

| Spalte | Inhalt | Beispiel |
|--------|--------|---------|
| **A** | Auftragsnr. inkl. Pos. | `25.0591-201/004` |
| **B** | Sachbearbeiter (SB) | `SB_60` |
| **C** | Kunde | `Kunde_006` |
| **D** | Arbeitsbeschreibung | "Liftabschlusstüren 5.OG" |
| **E** | Montageort | "Mühlau" |
| **F** | KW Zuschnitt | `KW5`, `6`, `-` |
| **G** | KW CNC | `KW4`, `-` |
| **H** | KW Produktion | `KW4` |
| **I** | KW Behandlung | `KW5` |
| **J** | KW Beschläge | `KW5` |
| **K** | KW Montage | `KW6` |
| **L** | Arbeiter (Tage) | `6` |
| **M** | Hilfskraft (Tage) | `6` |
| **N** | Farbe | `verschiedene`, `RAL 9016` |
| **O** | Kontakt | `Kontakt_003` |
| **P** | Tel. Kontakt | (Telefonnummer) |
| **Q** | Anrufen? | `Ja` / `Nein` |
| **R-AA** | Tagesplanung Mo-Fr | `MA_34`, `FREI`, `FIX` |
| **AB** | Bemerkungen | "Fix ab 08:00 Uhr" |

**Tagesplanung (Spalten R-AA):**
- Je 2 Spalten pro Tag (Mo R/S, Di T/U, Mi V/W, Do X/Y, Fr Z/AA)
- Halbtags-Granularität: Spalte R = Mo Morgen, Spalte S = Mo Nachmittag
- Werte: Mitarbeiter-Kürzel (`MA_14`), `FREI`, `FEI` (Feiertag), `FIX`, `ZUS`, `CNC`, `PRO`
- Zusätzliche Zeitangaben in Bemerkungen: "AB 06:00 Uhr", "fix ca. 07:15 Uhr", "fix 07:30-08:00 Uhr"

### 1.4 Phasen-KW-Planung (Spalten F-K)

Jeder Auftrag hat pro Produktionsphase eine **geplante Kalenderwoche**:

```
Auftrag: 25.0591-201/004 (Liftabschlusstüren)
  ZUS: -      (kein Zuschnitt nötig)
  CNC: KW4
  PROD: KW4
  BEH: KW5    (Behandlung in der nächsten Woche)
  BESCHL: KW5 (Beschläge parallel zu Behandlung)
  MONT: KW6   (Montage = Deadline, fix)
```

**Varianz der KW-Angaben:** `KW8`, `KW 08`, `8`, `02.02.`, `-`, `0`, `LW 4` (Tippfehler)

### 1.5 Planungs-Workflow (Ist-Prozess)

```
1. AUFTRAG KOMMT REIN
   → Sachbearbeiter (SB) legt Auftrag an
   → Montage-Termin wird mit Kunde vereinbart → KW MONT = fix

2. RÜCKWÄRTSPLANUNG
   → Vom Montagetermin rückwärts:
     MONT KW10 → BESCHL KW9 → BEH KW8 → PROD KW7 → CNC KW6 → ZUS KW6
   → Puffer je nach Auftragsumfang

3. WOCHENPLAN BEFÜLLEN
   → Auftrag wird in alle relevanten KW-Sheets eingetragen
   → Gleicher Auftrag erscheint in mehreren Sektionen desselben KW-Sheets
   → Und in verschiedenen KW-Sheets für verschiedene Phasen

4. TAGESPLANUNG (Freitags für nächste Woche)
   → Mitarbeiter-Kürzel in Tages-Spalten eintragen
   → Kapazität prüfen (Total vs. Kapazität pro Sektion)
   → Lehrlinge/Hilfskräfte zu Monteuren zuordnen

5. TÄGLICHE STEUERUNG
   → Morgens: Wer geht wohin?
   → Untertags: Anpassungen bei Störungen
   → "FREI"-Slots flexibel befüllen
```

### 1.6 Besondere Patterns

**1. Gleicher Auftrag, mehrere Sektionen:**
Auftrag `25-0989-201/001` erscheint in KW06 in:
- Zuschnitt (nicht in KW06)
- CNC (Zeile 31)
- Produktion (Zeile 71)
- Vorbehandlung (Zeile 100)
- Nachbehandlung (Zeile 130)
- Beschläge (Zeile 171)
→ Jede Sektion zeigt denselben Auftrag mit **unterschiedlichen** Tages-MA-Zuordnungen

**2. Mitarbeiter-Kategorien (aus dem Excel extrahiert):**

| Kategorie | Anzahl | Beispiele |
|-----------|--------|-----------|
| Produktionsmitarbeiter | ~7 | MA_01–MA_06, MA_11–MA_12 |
| CNC-Bediener | 2 | MA_01, MA_02 |
| Behandler | 2 | MA_07, MA_08 |
| Eigene Monteure | 2 | MA_09, MA_10 |
| Lehrlinge/Hilfskräfte | ~5 | Lehrling_01–04, MA_02, MA_06 |
| Fremdmonteure | ~18 | Fremdmonteur_01–18 |
| Fremdfirmen | 3 | Fremdfirma_01–03 |
| Pensionäre | 8 | Pensionaer_01–08 |
| Büro/Projektleiter | ~11 | Buero_01–11 |
| **Total** | **~56** | |

**3. Behandlungs-Sektion ist besonders komplex:**
- Vorbehandlung (eigene MA)
- Kunde_131 (50% morgens, externer Behandler)
- Nachbehandlung
- Maler_01 (externer Maler)
- Maler_02 (externer Maler)
→ 5 Sub-Sektionen für "Behandlung"

**4. Transport als eigene Sektion:**
- 3 Transport-Sektionen (verschiedene Teams/Fahrzeuge)
- Im Prompt als Produktionsphase nicht erwähnt, aber im Excel prominent

**5. Kapazitätsplanung:**
- "Total Auftragszeiten" = Summe der L-Spalte (Arbeiter-Tage)
- "Kapazität" = verfügbare MA × Tage
- Auslastung = Total / Kapazität (auf dem "Kapazität und Auslastung"-Sheet)
- CNC und Produktion haben Anwesenheits-Tracking (Anwes., Sollzeit, Unprod)

**6. Besondere Tages-Notationen:**
- `FIX` = Termin beim Kunden ist fix vereinbart
- `AB 06:00 Uhr` = Frühstart
- `fix ca. 07:15 Uhr` = fix-Termin mit ungefährer Startzeit
- `fix 07:30-08:00 Uhr` = fix-Termin mit Zeitfenster
- `fix anschl.` = fix, direkt im Anschluss an vorherigen Termin
- `ZUS`, `CNC`, `PRO` = MA arbeitet in dieser Sektion statt in seiner Stammsektion

---

## 2. Datenmodell-Mapping

### 2.1 Konzeptuelle Zuordnung

```
EXCEL                          INTELLIPLAN
─────────────────────────────  ──────────────────────────────
Auftragsnr. (25.0591-201/004) → Project
  + Pos. im Auftrag           →   (Teil des Project-Name/Ref)
Arbeitsbeschreibung            → Project.description
Kunde                          → Project.client (🆕 NEU)
Montageort                     → Project.location (🆕 NEU)
Sachbearbeiter (SB)            → Project.ownerId (User)
Farbe                          → Project.metadata.color (🆕 NEU)
Kontakt / Tel                  → Project.metadata.contact (🆕 NEU)

Produktionsphase (ZUS/CNC/..)  → Task (1 Task pro Phase)
  KW-Zuordnung                 → Task.startDate / Task.dueDate
  Mitarbeiter-Zuordnung/Tag    → TaskAssignment (🆕 NEU)
  Arbeiter-Tage (L)            → Task.durationMinutes (Tage × 8h)
  Hilfskraft-Tage (M)          → Task.helperDuration (🆕 NEU)

Mitarbeiter                    → Resource (type: person)
  Kategorie (Produktion, CNC)  → Resource.department (🆕 NEU)
  Wohnort                      → Resource.location (🆕 NEU)
  Anwesenheit / Sollzeit       → Resource.availability (🆕 NEU)

Legende-Einträge               → AbsenceType / StatusCode (🆕 NEU)
  FREI, FEI, Krank, etc.
```

### 2.2 Detailliertes Mapping

#### A) Aufträge → Projects

| Excel-Feld | IntelliPlan-Feld | Status | Anmerkung |
|------------|-----------------|--------|-----------|
| Auftragsnr. inkl. Pos. | `project.name` + `project.reference` 🆕 | ⚠️ `reference` fehlt | Braucht eigenes Feld für Auftragsnummer |
| Kunde | `project.client` 🆕 | ❌ Fehlt | Kunden-Referenz am Project nötig |
| Arbeit | `project.description` | ✅ Vorhanden | |
| Montageort | `project.location` 🆕 | ❌ Fehlt | Für Montage-Routing relevant |
| Farbe | `project.metadata.color` 🆕 | ❌ Fehlt | Branchenspezifisches Feld |
| SB | `project.ownerId` → User | ✅ Vorhanden | SB = Sachbearbeiter = Projektleiter |
| Kontakt / Tel | `project.metadata.contact` 🆕 | ❌ Fehlt | Kundenkontakt am Auftrag |
| Anrufen? ja/nein | `project.metadata.callRequired` 🆕 | ❌ Fehlt | Aktions-Flag |
| Arbeiter (L) | `project.estimatedDays` 🆕 | ❌ Fehlt | Gesamtaufwand in Arbeitstagen |
| Hilfskraft (M) | `project.helperDays` 🆕 | ❌ Fehlt | Zusätzlicher Hilfskraft-Bedarf |
| Bemerkungen | `project.notes` 🆕 | ❌ Fehlt | Freitext-Notizen |

#### B) Produktionsphasen → Tasks

**Aktuell:** IntelliPlan hat Tasks mit `status`, `schedulingMode`, `durationMinutes`, `resourceId`, `startDate`, `dueDate`.

**Mapping:**

```
Excel-Sektion "Zuschnitt"    → Task { title: "Zuschnitt", category: "production" }
Excel-Sektion "CNC"          → Task { title: "CNC", category: "production" }
Excel-Sektion "Produktion"   → Task { title: "Produktion", category: "production" }
Excel-Sektion "Vorbehandlung"→ Task { title: "Vorbehandlung", category: "treatment" }
Excel-Sektion "Nachbehandlung"→ Task { title: "Nachbehandlung", category: "treatment" }
Excel-Sektion "Beschläge"    → Task { title: "Beschläge", category: "assembly" }
Excel-Sektion "Transport"    → Task { title: "Transport", category: "delivery" }
Excel-Sektion "Montage"      → Task { title: "Montage", category: "assembly" }
```

**Dependencies (bereits vorhanden!):**
```
ZUS ──finish_start──► CNC
CNC ──finish_start──► PROD
PROD ──finish_start──► BEH (Vorbehandlung)
BEH ──finish_start──► BEH (Nachbehandlung)
BEH ──finish_start──► BESCHL
BESCHL ──finish_start──► MONT
PROD ──finish_start──► TRANSPORT (parallel zu BEH)
```

**Was fehlt an Tasks:**

| Feld | Beschreibung | Priorität |
|------|-------------|-----------|
| `phaseCode` | `ZUS`, `CNC`, `PROD`, `BEH`, `BESCHL`, `MONT`, `TRANS` | Hoch |
| `plannedWeek` | Geplante KW (z.B. "KW06") | Hoch |
| Multi-Resource Assignment | Mehrere MA pro Task pro Tag | Hoch |
| Halbtags-Slots | Morgen/Nachmittag-Zuordnung | Hoch |
| `isFixed` | Fixtermin (nicht verschiebbar) | Mittel |
| `fixTimeNote` | "AB 06:00 Uhr", "fix ca. 07:15" | Mittel |

#### C) Mitarbeiter → Resources

**Aktuell:** Resources haben `name`, `resourceType` (person/machine/vehicle), `description`, `isActive`.

**Was fehlt:**

| Feld | Beschreibung | Priorität |
|------|-------------|-----------|
| `department` | Abteilung: `zuschnitt`, `cnc`, `produktion`, `behandlung`, `beschlaege`, `montage`, `transport`, `buero` | Hoch |
| `employeeType` | `intern`, `lehrling`, `fremdmonteur`, `fremdfirma`, `pensionaer` | Hoch |
| `shortCode` | `MA_14`, `MA_28` – für schnelle Zuordnung | Hoch |
| `homeLocation` | Wohnort (für Montage-Routing) | Mittel |
| `defaultWorkHours` | Standard-Arbeitszeit (z.B. 50% für Kunde_131-Behandler) | Mittel |
| `specialNotes` | "MO/MI/DO ab 08:15 Uhr" (Fremdmonteur_01) | Niedrig |
| `unproductiveRate` | 0.05–0.12 (aus Anwes./Sollzeit/Unprod) | Niedrig |

#### D) Tagesplanung → Scheduling / Work-Slots

**Aktuell:** IntelliPlan hat `task_work_slots` mit `start_time`, `end_time`, `is_fixed`, `is_all_day`.

**Das Excel-Modell ist fundamental anders:**

```
EXCEL:                          INTELLIPLAN (aktuell):
Aufgabe × Tag × Halbtag × MA   Task → Work-Slots (Zeitblöcke)
= Matrix-Zuordnung              = Kalendereinträge

Excel: "Montag Morgen: MA_14 macht Auftrag X"
IP:    "Task X: Work-Slot Mo 07:00-12:00" (ohne MA-Zuordnung am Slot!)
```

**Der kritische Gap:** IntelliPlan's Work-Slots haben **keine Resource-Zuordnung auf Slot-Ebene**. Sie gehören nur zu einer Task, die eine einzelne Resource hat. Das Excel braucht aber **mehrere MA pro Auftragsphase pro Tag**.

→ **Das ist der grösste strukturelle Unterschied und die wichtigste Erweiterung.**

### 2.3 Neues Konzept: TaskAssignment (Schlüssel-Entität)

```
┌─────────────────────────────────────────────────┐
│ task_assignments (NEU)                          │
├─────────────────────────────────────────────────┤
│ id           UUID PK                            │
│ task_id      UUID FK → tasks                    │
│ resource_id  UUID FK → resources                │
│ date         DATE                               │
│ slot         ENUM('morning','afternoon','full')  │
│ is_fixed     BOOLEAN                            │
│ time_note    VARCHAR(100) -- "AB 06:00 Uhr"     │
│ created_at   TIMESTAMPTZ                        │
│ updated_at   TIMESTAMPTZ                        │
└─────────────────────────────────────────────────┘
```

**Das ersetzt die Matrix R-AA im Excel:**
```
Excel: Row 65, Spalte R = "MA_13", S = "MA_13", T = "MA_13"
→ 3 TaskAssignments:
  { task: "25.0213-201/002 PROD", resource: MA_13, date: 2026-02-02, slot: morning }
  { task: "25.0213-201/002 PROD", resource: MA_13, date: 2026-02-02, slot: afternoon }
  { task: "25.0213-201/002 PROD", resource: MA_13, date: 2026-02-03, slot: morning }
```

---

## 3. Gap-Analyse

### 3.1 Was kann IntelliPlan HEUTE schon?

| Feature | Excel-Äquivalent | Bewertung |
|---------|------------------|-----------|
| **Projects CRUD** | Aufträge anlegen/bearbeiten | ✅ Grundstruktur passt |
| **Tasks mit Dependencies** | Phasen-Reihenfolge ZUS→CNC→PROD→... | ✅ `finish_start` Dependencies genau richtig |
| **Auto-Scheduling (Rückwärtsplanung)** | Rückwärtsplanung vom MONT-Termin | ✅ Kernlogik vorhanden, braucht Anpassungen |
| **Task Templates** | Standard-Phasenfolge pro Produkttyp | ✅ Perfekt für Schreinerei-Templates |
| **Resources (Person/Maschine)** | Mitarbeiter-Stammdaten | ⚠️ Grundstruktur passt, fehlende Felder |
| **Work-Slots** | Tagesplanung | ⚠️ Konzept passt, aber fehlende MA-Zuordnung |
| **AI Conflict Detection** | Manuelles "passt das?" im Kopf des Planers | ✅ Sofort nutzbar |
| **Working Time Templates** | Arbeitszeitmodelle (50% morgens etc.) | ✅ Passt für Sonderfälle |
| **Pendenzen** | Bemerkungen-Spalte, mündliche Absprachen | ✅ Klarer Mehrwert vs. Excel |
| **Project Activity Log** | Nicht vorhanden im Excel | ✅ Echte Verbesserung |
| **Volltextsuche** | Strg+F im Excel | ✅ Besser als Excel |
| **Kalender-View** | Nicht direkt im Excel | ✅ Neue Perspektive |
| **Industries + Product Types** | Implizit (Schreinerei) | ✅ Bereits vorkonfiguriert |

### 3.2 Was FEHLT? (Priorisiert)

#### 🔴 Kritisch (Showstopper für Ablösung)

| # | Gap | Beschreibung | Aufwand |
|---|-----|-------------|---------|
| G1 | **Multi-Resource Task Assignment** | Mehrere MA pro Task pro Tag mit Halbtags-Slots | XL |
| G2 | **Wochenplan-View (KW-Ansicht)** | Die zentrale Ansicht: Aufträge × Sektionen × Tage × MA | XL |
| G3 | **Kunden/Kontakt am Projekt** | Kunde, Kontaktperson, Telefon, Anrufen-Flag | S |
| G4 | **Auftragsnummer-Feld** | Eigenes Referenz-Feld für `25.0591-201/004` | S |
| G5 | **Mitarbeiter-Abteilungen** | Department und EmployeeType an Resource | M |
| G6 | **Kapazitäts-Übersicht** | Total Auftragszeit vs. Kapazität pro Sektion/KW | L |

#### 🟡 Wichtig (Signifikanter Mehrwert)

| # | Gap | Beschreibung | Aufwand |
|---|-----|-------------|---------|
| G7 | **Phasen-Code an Tasks** | `ZUS`, `CNC`, `PROD`, etc. als Task-Attribut | S |
| G8 | **KW-basierte Planung** | Kalenderwochen als native Planungseinheit | M |
| G9 | **Montageort/Location am Projekt** | Für Transport-/Montage-Routing | S |
| G10 | **Farb-Spezifikation** | Dropdown mit Farben (RAL 9016, Spez. Farbe, etc.) | S |
| G11 | **Fix-Termin-Flag** | `isFixed` + Zeitnotiz an Assignments | S |
| G12 | **Drag & Drop Mitarbeiter-Zuordnung** | MA per Drag auf Auftrag/Tag ziehen | L |
| G13 | **Hilfskraft-Zuordnung** | Lehrlinge/Hilfskräfte zu Monteuren zuweisen | M |

#### 🟢 Nice-to-Have (Langfristig)

| # | Gap | Beschreibung | Aufwand |
|---|-----|-------------|---------|
| G14 | **Fremdmonteur-Verwaltung** | Spezialbehandlung externer Kräfte | M |
| G15 | **Transport-Planung** | Fahrzeug-Zuordnung, Routenplanung | L |
| G16 | **Anwesenheits-/Zeiterfassung** | Anwesenheit, Sollzeit, Unproduktiv | L |
| G17 | **Automatische KW-Übernahme** | Auftrag automatisch in nächste KW schieben wenn nicht fertig | M |
| G18 | **Excel-Export** | Wochenplan als Excel exportieren (Übergangsphase) | M |
| G19 | **Auslastungs-Dashboard** | Grafische Auslastung pro Abteilung über alle KWs | L |
| G20 | **Druckansicht** | Wochenplan für die Werkstatt drucken | M |

**Legende Aufwand:** S = 1-2 Tage, M = 3-5 Tage, L = 1-2 Wochen, XL = 2-4 Wochen

---

## 4. Feature-Roadmap

### Phase 1: Datenmodell-Erweiterungen (Fundament) — ~2 Wochen

**Ziel:** Das Datenmodell IntelliPlan-seitig so erweitern, dass der Wochenplan **abbildbar** wird.

#### Sprint 1.1: Project-Erweiterungen (G3, G4, G9, G10) — 3-4 Tage

```sql
-- Migration: Projekt-Erweiterungen für Wochenplan
ALTER TABLE projects ADD COLUMN reference VARCHAR(50);        -- "25.0591-201/004"
ALTER TABLE projects ADD COLUMN client_name VARCHAR(255);     -- Kundenname
ALTER TABLE projects ADD COLUMN client_contact VARCHAR(255);  -- Kontaktperson
ALTER TABLE projects ADD COLUMN client_phone VARCHAR(50);     -- Telefon
ALTER TABLE projects ADD COLUMN call_required BOOLEAN DEFAULT FALSE;
ALTER TABLE projects ADD COLUMN location VARCHAR(255);        -- Montageort
ALTER TABLE projects ADD COLUMN color_spec VARCHAR(100);      -- "RAL 9016"
ALTER TABLE projects ADD COLUMN notes TEXT;                   -- Bemerkungen
ALTER TABLE projects ADD COLUMN estimated_days DECIMAL(5,1);  -- Arbeiter-Tage
ALTER TABLE projects ADD COLUMN helper_days DECIMAL(5,1);     -- Hilfskraft-Tage

CREATE INDEX idx_projects_reference ON projects(reference) WHERE deleted_at IS NULL;
CREATE INDEX idx_projects_client ON projects(client_name) WHERE deleted_at IS NULL;
```

**Backend:** Project-Model, Schema, Service, Routes erweitern.
**Frontend:** Project-Form erweitern (Schreinerei-spezifische Felder).

#### Sprint 1.2: Resource-Erweiterungen (G5) — 2 Tage

```sql
ALTER TABLE resources ADD COLUMN department VARCHAR(50);
  -- 'zuschnitt','cnc','produktion','behandlung','beschlaege','montage','transport','buero'
ALTER TABLE resources ADD COLUMN employee_type VARCHAR(50);
  -- 'intern','lehrling','fremdmonteur','fremdfirma','pensionaer'
ALTER TABLE resources ADD COLUMN short_code VARCHAR(20);       -- "MA_14"
ALTER TABLE resources ADD COLUMN home_location VARCHAR(255);
ALTER TABLE resources ADD COLUMN default_availability DECIMAL(3,2) DEFAULT 1.0; -- 0.5 = 50%
ALTER TABLE resources ADD COLUMN notes TEXT;

CREATE INDEX idx_resources_department ON resources(department);
CREATE INDEX idx_resources_short_code ON resources(short_code);
```

#### Sprint 1.3: Task-Erweiterungen + TaskAssignment (G1, G7, G8, G11) — 5-7 Tage

```sql
-- Task-Erweiterungen
ALTER TABLE tasks ADD COLUMN phase_code VARCHAR(10);
  -- 'ZUS','CNC','PROD','VORBEH','NACHBEH','BESCHL','TRANS','MONT'
ALTER TABLE tasks ADD COLUMN planned_week INTEGER;             -- KW-Nummer
ALTER TABLE tasks ADD COLUMN planned_year INTEGER DEFAULT 2026;

CREATE INDEX idx_tasks_phase ON tasks(phase_code) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_week ON tasks(planned_year, planned_week) WHERE deleted_at IS NULL;

-- NEUE TABELLE: task_assignments
CREATE TABLE task_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  assignment_date DATE NOT NULL,
  slot VARCHAR(20) NOT NULL DEFAULT 'full',
    -- 'morning', 'afternoon', 'full'
  is_fixed BOOLEAN NOT NULL DEFAULT FALSE,
  time_note VARCHAR(100),  -- "AB 06:00 Uhr", "fix ca. 07:15"
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(task_id, resource_id, assignment_date, slot)
);

CREATE INDEX idx_task_assignments_task ON task_assignments(task_id);
CREATE INDEX idx_task_assignments_resource ON task_assignments(resource_id);
CREATE INDEX idx_task_assignments_date ON task_assignments(assignment_date);
CREATE INDEX idx_task_assignments_resource_date ON task_assignments(resource_id, assignment_date);
```

**Backend:** TaskAssignment-Model, CRUD-Service, Routes.
**API-Endpoints:**
```
GET    /api/tasks/:id/assignments
POST   /api/tasks/:id/assignments
PUT    /api/task-assignments/:id
DELETE /api/task-assignments/:id
GET    /api/resources/:id/assignments?from=&to=  (Wer macht was in Woche X?)
GET    /api/assignments/week/:year/:week         (Alle Assignments einer KW)
```

### Phase 2: Wochenplan-View (Kern-UI) — ~3 Wochen

**Ziel:** Die Excel-Hauptansicht in IntelliPlan nachbauen.

#### Sprint 2.1: Kapazitäts-Übersicht (G6) — 5 Tage

```
Backend:
- GET /api/capacity/:year/:week
  → Pro Abteilung: Total Auftragszeit, Kapazität, Auslastung %
  → Berücksichtigt Abwesenheiten (FREI, FEI, Krank)

Frontend:
- Kapazitäts-Widget pro Sektion
- Ampel-System: Grün (<80%), Gelb (80-100%), Rot (>100%)
```

#### Sprint 2.2: Wochenplan-Ansicht (G2) — 10-14 Tage

**Das ist die grösste Einzelaufgabe.** Die Ansicht muss das Excel möglichst 1:1 nachbilden.

```
┌─────────────────────────────────────────────────────────────┐
│ KW 06 / 02.02. - 06.02.2026              [← KW05] [KW07 →]│
├─────────────────────────────────────────────────────────────┤
│ ┌─ ZUSCHNITT ─────────────────────────────────────────────┐ │
│ │ Auftrag       Kunde    Arbeit     Mo  Di  Mi  Do  Fr   │ │
│ │ 26.0076-201   K_103    Bretter    MA13 -   -   -   -   │ │
│ │ 25.1083-201   K_126    Rahmentür  MA13 -   -   -   -   │ │
│ │ ...                                                      │ │
│ │ Total: 12.5 Tage  Kapazität: 10 Tage  [🟡 125%]        │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─ CNC ───────────────────────────────────────────────────┐ │
│ │ ...                                                      │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─ PRODUKTION ────────────────────────────────────────────┐ │
│ │ MA-Köpfe: MA_01  MA_11  MA_03  MA_12  MA_04  MA_05     │ │
│ │ Auftrag       Kunde    Arbeit     Mo  Di  Mi  Do  Fr   │ │
│ │ 25.0213-201   K_079    Rahmentür  13  13  13  -   -    │ │
│ │ 25.0591-201   K_006    Lifttür    -   13  -   -   -    │ │
│ │ ...                                                      │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ [... weitere Sektionen ...]                                 │
│                                                             │
│ ┌─ MONTAGE ───────────────────────────────────────────────┐ │
│ │ ...                                                      │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**Technologie-Entscheid:**
- **Option A:** Custom React-Tabelle mit MUI DataGrid → Flexible, aber aufwendig
- **Option B:** AG Grid (Community) → Mächtige Tabelle, Excel-ähnlich
- **Empfehlung:** Option A mit MUI, weil bereits im Stack und spezifisches Layout nötig

**Interaktionen:**
- KW-Navigation (vor/zurück)
- Klick auf MA-Zelle → Dropdown mit verfügbaren MA
- Klick auf Auftrag → Project-Detail öffnen
- Drag & Drop MA auf Zelle (Phase 2.3)
- Hover über MA → Tages-Übersicht: Was macht MA_14 heute alles?

#### Sprint 2.3: Drag & Drop Zuordnung (G12) — 5 Tage

- MA aus Seitenleiste auf Auftrag/Tag/Halbtag ziehen
- Sofortige Kapazitätsprüfung (MA schon belegt?)
- AI Conflict Detection bei Doppelbelegung
- "FREI"-Slots visuell hervorgehoben

### Phase 3: Rückwärtsplanung 2.0 — ~1 Woche

**Ziel:** Die bestehende Rückwärtsplanung an das Wochenplan-Modell anpassen.

#### Sprint 3.1: KW-basierte Rückwärtsplanung

```
Aktuell:  autoScheduleProjectTasks() rechnet mit Minuten + Arbeitstagen
Neu:      autoScheduleProjectTasks() soll KW-Granularität unterstützen

Input:  Montage-KW = 10, Produkttyp = "Einbauküche"
Output: ZUS=KW07, CNC=KW07, PROD=KW08, BEH=KW08, BESCHL=KW09, MONT=KW10

Regeln (branchenspezifisch):
- Standard-Vorlauf: 3-4 KW vor Montage
- Puffer zwischen Phasen: 0-1 KW
- BEH und BESCHL oft parallel
- Transport in gleicher KW wie MONT
```

**Backend-Änderung:**
```typescript
interface WeeklyScheduleInput {
  projectId: string;
  montageWeek: number;   // KW
  montageYear: number;
  productType?: string;  // Template-basierte Vorlaufzeiten
  overrides?: { phase: string; week: number }[];  // Manuelle Überschreibungen
}
```

### Phase 4: Import & Parallelbetrieb — ~2 Wochen

→ Details in Abschnitt 5 (Migrations-Strategie)

### Phase 5: Erweiterte Features — fortlaufend

| Feature | Wann | Aufwand |
|---------|------|---------|
| Auslastungs-Dashboard (G19) | Nach Phase 2 | L |
| Druckansicht (G20) | Nach Phase 2 | M |
| Transport-Planung (G15) | Nach Phase 3 | L |
| Zeiterfassung (G16) | Eigenständig | L |
| Automatische KW-Übernahme (G17) | Nach Phase 3 | M |
| Excel-Export (G18) | Parallel zu Phase 2 | M |
| Fremdmonteur-Verwaltung (G14) | Nach Phase 2 | M |
| Hilfskraft-Zuordnung (G13) | Nach Phase 2 | M |

### Gesamt-Timeline (optimistisch)

```
Phase 1: Datenmodell     ████████████████  (2 Wochen)
Phase 2: Wochenplan-UI   ████████████████████████  (3 Wochen)
Phase 3: Rückwärtspl. 2.0 ████████  (1 Woche)
Phase 4: Import/Migration ████████████████  (2 Wochen)
Phase 5: Erweitert        ████████████████████████████  (fortlaufend)

                          ─────────────────────────────────►
                          KW 08    KW 12    KW 16    KW 20+
```

**MVP (Minimum Viable Wochenplan):** Phase 1 + Phase 2.1 + 2.2 = ~5 Wochen
→ Dann kann der Wochenplan in IntelliPlan **gelesen** werden (nach Import).

**Full Replacement:** Phase 1–4 = ~8 Wochen
→ Dann kann komplett auf IntelliPlan umgestellt werden.

---

## 5. Migrations-Strategie

### 5.1 Ansatz: Schrittweise Migration

```
Phase A: Import-Tool (einmalig + wiederholt)
Phase B: Parallelbetrieb (Excel + IntelliPlan gleichzeitig)
Phase C: IntelliPlan-First (Excel nur als Backup/Export)
Phase D: Excel-Ablösung (nur noch IntelliPlan)
```

### 5.2 Import-Tool: Excel → IntelliPlan

**Technologie:** Node.js Script mit `xlsx`/`exceljs`-Library

```
import-wochenplan.ts
├── 1. Excel lesen
│   ├── Sheet-Names parsen (KW01-KW53)
│   ├── Pro Sheet: Sektionen identifizieren
│   └── Pro Sektion: Auftragszeilen + MA-Zuordnungen extrahieren
│
├── 2. Stammdaten erzeugen
│   ├── Mitarbeiter → Resources (mit department, shortCode)
│   ├── Kunden → (am Project)
│   └── Sachbearbeiter → Users
│
├── 3. Aufträge erzeugen
│   ├── Unique Auftragsnummern → Projects
│   ├── Pro Auftrag: Tasks pro Phase erstellen
│   ├── Dependencies zwischen Phasen setzen
│   └── KW-Angaben → startDate/dueDate umrechnen
│
├── 4. Zuordnungen erzeugen
│   ├── MA-Kürzel in Tages-Spalten → TaskAssignments
│   ├── FREI → Keine Assignment
│   ├── FIX → Assignment mit isFixed=true
│   └── "AB 06:00 Uhr" → time_note
│
└── 5. Validierung
    ├── Doppelbelegungen erkennen
    ├── Fehlende Aufträge in Sektionen
    └── Inconsistente KW-Angaben
```

### 5.3 Parsing-Herausforderungen

| Problem | Lösung |
|---------|--------|
| KW-Format variiert (`KW8`, `KW 08`, `8`, `KW08`) | Regex: `/(?:KW\s*)?(\d{1,2})/i` |
| KW als Datum (`02.02.`) | Datum → KW-Berechnung |
| KW = `-` oder `0` | Phase nicht relevant → kein Task |
| Gleicher Auftrag in mehreren Sektionen | Deduplizierung über Auftragsnr. |
| Sektions-Grenzen erkennen | Pattern: Zeile mit "Zuschnitt"/"CNC"/"Produktion" etc. in Spalte A |
| Mitarbeiter-Kürzel vs. Sektions-Codes | `MA_xx` = Person, `ZUS`/`CNC`/`PRO` = Abteilungs-Einsatz, `FREI`/`FEI` = Status |
| Merged cells | `openpyxl`/`exceljs` handeln Merges |
| Leere Zeilen zwischen Aufträgen | Überspringe Zeilen ohne Auftragsnr. in Spalte A |

### 5.4 Import-Reihenfolge

```
1. Stammdaten (einmalig):
   - Dropdown-Sheet → Farb-Optionen
   - Mitarbeiter aus allen KW-Sheets → Resources
   - Sachbearbeiter → Users

2. Aufträge (einmalig, mit Updates):
   - Alle einzigartigen Auftragsnummern über alle KW-Sheets
   - → Projects + Tasks (mit Dependencies)

3. Wochenplan (wöchentlich oder on-demand):
   - Gewählte KW importieren
   - TaskAssignments erstellen/updaten
   - Kapazitäten berechnen
```

### 5.5 Parallelbetrieb-Strategie

**Empfehlung: "Read-First, Write-Later"**

```
Woche 1-4:  Import läuft, IntelliPlan zeigt Wochenplan READ-ONLY
            → Planung weiterhin im Excel
            → IntelliPlan für Ansicht + Kapazitätscheck

Woche 5-8:  Neue Aufträge in IntelliPlan anlegen
            → Excel wird noch parallel geführt
            → Wöchentlicher Sync IntelliPlan → Excel

Woche 9+:   IntelliPlan-First
            → Excel nur noch als Export/Backup
            → Schrittweise Ablösung
```

### 5.6 Rückkanal: IntelliPlan → Excel Export

Für die Übergangsphase muss IntelliPlan den Wochenplan auch als Excel exportieren können – damit z.B. in der Werkstatt weiterhin ein ausgedruckter Wochenplan hängt.

```
GET /api/export/wochenplan/:year/:week
→ Generiert Excel mit identischer Struktur
→ Nutzt exceljs für Formatierung
```

---

## Anhang A: Vollständige Sektions-Struktur (KW06)

| Zeile | Sektion | Sub | Mitarbeiter |
|-------|---------|-----|-------------|
| 5 | Zuschnitt | — | 2 MA (MA_13, MA_28) |
| 25 | CNC | — | 2 MA (Mitarbeiter_01, _02) |
| 46 | Produktion | — | 7 MA (Mitarbeiter_01, _11, _03, _12, _04, _05, _06) |
| 90 | Vorbehandlung | BEH | 2 MA (Mitarbeiter_07, _08) |
| 106 | Kunde_131 | BEH | 1 MA (Mitarbeiter_08, 50%) |
| 125 | Nachbehandlung | BEH | (gleiche MA) |
| 142 | Behandlung Maler_01 | BEH | extern |
| 154 | Behandlung Maler_02 | BEH | extern |
| 161 | Beschlägen | — | 2-3 MA |
| 178 | Transport 1 | — | 1 Fahrer |
| 194 | Transport 2 | — | 1 Fahrer |
| 204 | Transport 3 | — | 1 Fahrer |
| 213 | Montage | — | 2 eigene + Fremdmonteure |
| 256 | Lehrlinge/Hilfskraft | — | 5 Personen |
| 274 | Fremdmonteure | — | ~18 Personen + 3 Firmen |
| 300 | Pensionäre | — | 8 Personen |
| 311 | Büro | — | ~11 Personen |
| 326 | Legende | — | Abkürzungen/Farben |

## Anhang B: Mitarbeiter-Zuordnungs-Kürzel (Legende)

| Kürzel | Bedeutung |
|--------|-----------|
| `MA_xx` | Mitarbeiter-Kürzel (Nummer) |
| `FREI` | Ferien/Sonderurlaub |
| `FEI` | Feiertag/Teilzeit |
| `SB_63` | Schule/Kurs/Weiterbildung |
| `SB_64` | Militär/Zivilschutz |
| `SB_65` | Unfall |
| `SB_66` | Krank |
| `SB_67` | Home Office |
| `fix` | Fixtermin |
| `PRO` | Einsatz in Produktion |
| `ZUS` | Einsatz im Zuschnitt |
| `CNC` | Einsatz an CNC |
| `SB_68` | Päckli/Rüsten |
| `SB_69` | Putzen |
| `SB_13` | Transport |
| `SB_70` | Bringen |
| `SB_71` | Holen |

## Anhang C: Farboptionen (Dropdown-Sheet)

```
RAL 9010, RAL 9016, RAL 9006, NCS S 0500-N,
Spez. Farbe, 2-farbig, keine, Natur lackiert,
nur Grundiert, beizen, ölen, verschiedene, -, zum Maler
```

---

> **Fazit:** IntelliPlan hat bereits eine solide Grundlage für die Wochenplan-Ablösung. Die kritischsten Gaps sind (1) Multi-Resource TaskAssignments, (2) die Wochenplan-View und (3) Projekt-Erweiterungen für Kunden/Referenzen. Die bestehende Rückwärtsplanung und Task-Dependencies sind perfekt für den Schreinerei-Workflow. Mit ~8 Wochen fokussierter Entwicklung kann das Excel vollständig abgelöst werden.
