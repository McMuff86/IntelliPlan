# IntelliPlan – Produktvision & Architekturplan

## Vision

**IntelliPlan ersetzt die Excel-Tabelle.**

Jeder Fertigungsbetrieb (Schreinerei, Metallbau, Zimmerei, etc.) hat eine eigene Excel-Tabelle für die Wochenplanung. Die Tabelle ist gewachsen, komplex, fragil, und nur eine Person versteht sie wirklich. IntelliPlan bietet eine bessere Lösung:

- **Projekte** verwalten (Aufträge mit Phasen und Zeitplan)
- **Mitarbeiter** einteilen (wer arbeitet wann an was)
- **Kapazität** im Blick haben (Auslastung, Engpässe, Verfügbarkeit)
- **Wochenplan** generieren (die bekannte KW-Ansicht – aber digital und live)

### Zielgruppe
Fertigungsbetriebe mit 10-100 Mitarbeitern die:
- Heute mit Excel/Papier planen
- Mehrere Produktionsphasen pro Auftrag haben
- Wissen wollen wer wann an was arbeitet
- Keine Lust auf SAP/ABACUS haben

### Was IntelliPlan NICHT ist
- Kein ERP (keine Buchhaltung, keine Materialwirtschaft)
- Kein Projektmanagement à la Jira (kein Scrum, keine Epics)
- Kein Zeiterfassungstool

IntelliPlan ist **das Bindeglied zwischen Auftrag und Werkstatt.**

---

## Datenmodell (Ziel)

### Core Entities

```
┌─────────────┐     ┌─────────────────┐     ┌──────────────────┐
│  Project     │────▷│  Task (= Phase) │────▷│  Task Assignment │
│              │     │                 │     │                  │
│ order_number │     │ phase_code      │     │ resource_id      │
│ customer     │     │ start_date      │     │ assignment_date   │
│ description  │     │ due_date        │     │ half_day          │
│ status       │     │ planned_week    │     │ is_fixed          │
│ color        │     │ status          │     │ time_note         │
└─────────────┘     └─────────────────┘     └──────────────────┘
                           │                        │
                           ▼                        ▼
                    ┌──────────────┐         ┌──────────────┐
                    │ Phase Def.   │         │  Resource    │
                    │              │         │              │
                    │ code         │         │ name         │
                    │ name         │         │ short_code   │
                    │ sort_order   │         │ department   │
                    │ department   │         │ work_role    │
                    │ color        │         │ skills       │
                    └──────────────┘         │ primary_phases│
                                             │ weekly_hours │
                                             └──────────────┘
```

### Kernkonzepte

**Project** = Ein Auftrag/Bestellung mit Auftragsnummer und Kundenbezug.
Hat keine eigenen Daten – alles leitet sich von seinen Tasks ab.

**Task** = Eine Phase eines Projekts (z.B. "Zuschnitt für Auftrag 25.0591").
Hat `phase_code`, `planned_week`, `start_date`, `due_date`. 
Ein Projekt hat typischerweise 3-8 Tasks (je nach benötigten Phasen).

**Task Assignment** = "MA_13 arbeitet am Montag Vormittag an diesem Task."
Die Halbtags-Granularität (morning/afternoon) entspricht der Excel-Logik.

**Resource** = Ein Mitarbeiter mit Fähigkeiten und Verfügbarkeit.
`primary_phases` definiert wo er standardmässig eingesetzt wird.

**Phase Definition** = Referenztabelle der möglichen Phasen.
Konfigurierbar pro Installation. Default: Schreinerei-Phasen.

### Views (keine eigenen Tabellen)

**Wochenplan** = Alle Task Assignments einer KW, gruppiert nach Abteilung/Phase.
Genau wie die Excel-Tabelle – aber live aus der Datenbank generiert.

**Kapazität** = Auslastung pro Mitarbeiter pro KW.
Verfügbare Halbtage minus zugewiesene Halbtage = freie Kapazität.

**Projekt-Gantt** = Timeline aller Tasks eines Projekts, sortiert nach Phase.
Zeigt auf einen Blick wo das Projekt steht.

---

## Architektur-Entscheidungen

### 1. Phasen sind konfigurierbar, nicht hartcodiert

Jeder Betrieb hat andere Phasen. Eine Schreinerei hat Zuschnitt→CNC→Produktion→Behandlung→Montage. Ein Metallbauer hat vielleicht Zuschnitt→Schweissen→Schleifen→Lackieren→Montage.

→ `phase_definitions` Tabelle mit `code`, `name`, `sort_order`, `color`, `department`
→ Admin kann Phasen hinzufügen, umbenennen, deaktivieren
→ Beim Projekt erstellen: Auswahl welche Phasen relevant sind

### 2. Ein Task = Eine Phase

Kein komplexes Task-Hierarchie-System. Ein Projekt hat N Tasks, jeder Task ist genau eine Phase. Das mappt 1:1 auf die Excel-Logik und ist für Werkstattleiter sofort verständlich.

Falls ein Betrieb Sub-Tasks braucht (z.B. Produktion aufteilen in Korpus + Fronten): Das kann in v2 kommen. Für MVP reicht Phase = Task.

### 3. Planung = KW-basiert, nicht tagesgenau

Die Excel-Tabelle plant in Kalenderwochen, nicht in Stunden. IntelliPlan übernimmt das:
- Projekte werden auf KWs geplant ("Zuschnitt in KW12")
- Mitarbeiter werden auf Halbtage zugeteilt ("MA_13 macht Montag+Dienstag Vormittag Zuschnitt")
- Feinplanung (Uhrzeiten) ist optional via `time_note`

### 4. Import als Onboarding, nicht als Dauerlösung

Jeder Betrieb hat eine Excel-Tabelle. Der Import ist der **erste Kontakt** mit IntelliPlan:
1. Excel hochladen → IntelliPlan zeigt was es erkannt hat
2. Daten prüfen, Mitarbeiter zuordnen, bereinigen
3. Ab jetzt in IntelliPlan weiterarbeiten

Kein permanenter Excel-Sync. Die Excel-Datei wird abgelöst, nicht gespiegelt.

### 5. Multi-Tenancy von Anfang an

Jedes Projekt, jeder Task, jede Resource hat einen `owner_id`. Das ermöglicht:
- Mehrere Betriebe in einer Installation (SaaS)
- Datenisolation ohne extra Datenbanken
- User-Management pro Betrieb (Admin, Werkstattleiter, Mitarbeiter)

→ Ist bereits implementiert (alle Queries filtern auf owner_id).

---

## Umsetzungsplan (priorisiert)

### Milestone 1: "Projekte im Gantt" (MVP-Erweiterung)
**Ziel:** Importierte oder manuell erfasste Projekte sind im Gantt sichtbar und mit dem Wochenplan verlinkt.

| # | Task | Aufwand | Details |
|---|------|---------|---------|
| 1 | `phase_definitions` Tabelle + Seed | 1h | Migration + Default-Phasen |
| 2 | Tasks: `start_date`/`due_date` aus `planned_week` berechnen | 1h | Migration + Backfill |
| 3 | Projektliste: Neue Spalten (order_number, customer, KW-Range, Phasen) | 2h | Frontend |
| 4 | Projekt-Detail: Gantt mit Phasen-Sortierung + Mitarbeiter-Anzeige | 3h | Frontend |
| 5 | Verlinkung: Wochenplan → Projekt (klickbare Auftragsnr.) | 1h | Frontend |
| 6 | Verlinkung: Projekt → Wochenplan (Button "In KW anzeigen") | 1h | Frontend |

**Aufwand: ~9h**

### Milestone 2: "Projekte erstellen"
**Ziel:** Neue Projekte werden in IntelliPlan erstellt, Phasen gewählt, auf KWs geplant.

| # | Task | Aufwand | Details |
|---|------|---------|---------|
| 1 | "Neues Projekt" Dialog mit Phasen-Auswahl | 3h | Frontend + Backend |
| 2 | Automatische Task-Generierung (1 Task pro Phase) | 1h | Backend |
| 3 | KW-Planung: Start-KW → Phasen verteilen | 2h | Frontend + Backend |
| 4 | Quick-Assign: Mitarbeiter auf Phase zuweisen | 2h | Frontend |

**Aufwand: ~8h**

### Milestone 3: "Ressourcen richtig modellieren"
**Ziel:** Mitarbeiter haben Skills, Abteilungen, Verfügbarkeit.

| # | Task | Aufwand | Details |
|---|------|---------|---------|
| 1 | Resources erweitern: `primary_phases`, `qualifications`, `work_days` | 2h | Migration + API |
| 2 | ResourceEditDialog erweitern | 2h | Frontend |
| 3 | `resource_absences` Tabelle (Ferien, Krank, etc.) | 2h | Migration + API + UI |
| 4 | Kapazitätsberechnung mit Absenzen | 2h | Backend + Frontend |

**Aufwand: ~8h**

### Milestone 4: "Import als Onboarding"
**Ziel:** Sauberer Excel-Import mit Vorschau, Mapping, Bereinigung.

| # | Task | Aufwand | Details |
|---|------|---------|---------|
| 1 | Parser fixen (Zeitnotizen ≠ Mitarbeiter) | 1h | Backend |
| 2 | Import-Vorschau mit Resource-Matching UI | 3h | Frontend + Backend |
| 3 | Konfigurierbares Spalten-Mapping | 3h | Frontend + Backend |
| 4 | Dokumentation: "So importierst du deine Excel" | 1h | Docs/In-App |

**Aufwand: ~8h**

### Gesamtüberblick

```
Milestone 1: Projekte im Gantt      ██████████░░░░░░░░░░  ~9h   → Projekte sichtbar
Milestone 2: Projekte erstellen     ░░░░░░░░████████░░░░  ~8h   → Eigener Workflow
Milestone 3: Ressourcen-Modell      ░░░░░░░░░░░░████████  ~8h   → Kapazitätsplanung
Milestone 4: Import als Onboarding  ░░░░░░░░░░░░░░░░████  ~8h   → Kundenfreundlich

Total: ~33h → 5-6 Nacht-Sessions
```

---

## Was wir NICHT bauen (jetzt)

- ❌ Automatische Mitarbeiter-Zuteilung/KI (v2/v3)
- ❌ Multi-Language/i18n (v2)
- ❌ Rechte-System pro Mitarbeiter-Rolle (existiert rudimentär, Ausbau in v2)
- ❌ Mobile App (responsive Web reicht für MVP)
- ❌ Notifications/Erinnerungen für Mitarbeiter (v2)
- ❌ Zeiterfassung / Soll-Ist-Vergleich (v3 oder nie – nicht unser Scope)

> **Hinweis:** Drag & Drop im Gantt (Projects) existiert bereits inkl. Dependency-Handling.
> Drag & Drop im Wochenplan (KW-Ansicht) wäre nice-to-have für v2.

---

## Entscheidungen (getroffen)

1. **DB-Daten behalten**
   Die importierten Bucher-Daten bleiben als Testdaten. Werden einem "Bucher"-Testuser zugewiesen, damit wir echte Kundendaten als Referenz haben. Für Demo/Launch frische DB.

2. **Phase-Definitions: Pro Betrieb**
   Jeder Betrieb definiert seine eigenen Phasen. Seed liefert Schreinerei-Defaults. Passt zusammen mit den bereits existierenden Projekt-Templates (Branche → Produkttyp → Vorlage), die der User selbst erstellen kann.

3. **Pricing: Später**
   Zuerst Beta erreichen, echten Nutzen/Zeitersparnis messen, dann Preis ableiten. Keine hypothetischen Preise festlegen bevor wir Kundenfeedback haben.

4. **Beta-Tester: Heisser Lead vorhanden**
   Renato Buchers Cousin (Teilhaber einer Firma) evaluiert gerade aktiv eine Ablösung ihrer Excel-Planung durch ein professionelles System. Sucht quasi ein "ERP". → Perfekter Beta-Kandidat, genau unsere Zielgruppe. Kontakt über Renato herstellen sobald Milestone 2 steht.
