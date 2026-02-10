# IntelliPlan Masterplan: Projekt -> Gantt -> Intelligenter Wochenplan

Stand: 2026-02-10
Bezug: `ROADMAP.md` (Sektion 8-10)

## 1. Zielbild

IntelliPlan wird von einem import-zentrierten Wochenplan zu einem **projekt-getriebenen Planungssystem**:

1. Projekt wird in IntelliPlan erfasst (inkl. Endtermin).
2. Notwendige Produktionsschritte werden pro Projekt festgelegt.
3. Produktionsfreigabe erfolgt erst nach Readiness-Gate (AVOR/Material/Beschlaege/Plaene).
4. Wochenplan wird aus Projektstand + Kapazitaet intelligent vorgeschlagen.
5. Bei Stoerungen wird replanned (teilautomatisch).
6. Ist-Abweichungen werden systematisch gesammelt und fuer bessere Planung genutzt.

## 2. Fachliche Kernregeln

### 2.1 Projektdefinition ist fuehrend
- Kein Projekt darf "nur" im Wochenplan leben.
- Projekt enthaelt Endtermin, Prioritaet und definierte Produktionsschritte.

### 2.2 Schritte sind pro Projekt flexibel
- Beispiele:
  - Moebel ohne Behandlung.
  - Tueren ohne Zuschnitt (Rohling eingekauft).
  - Optional: Zwischenschliff/Oberflaeche.
- Daraus folgt: Keine starre Pflichtsequenz fuer alle Auftraege.

### 2.3 Produktionsstart nur bei Freigabe
Readiness-Gate muss explizit "bereit" sein:
- AVOR abgeschlossen
- Material bestellt/verfuegbar
- Beschlaege bestellt/verfuegbar
- Plaene vollstaendig/freigegeben
- Externe Freigaben (z. B. Baustelle bereit)

### 2.4 Planung ist iterativ
- Erstvorschlag mit Annahmen.
- Laufende Anpassung bei Realitaetsabweichungen.
- Historie von Planversionen muss nachvollziehbar bleiben.

## 3. Datenmodell-Erweiterung (minimal-invasiv)

Bestehendes Modell (`projects -> tasks -> task_assignments`) bleibt erhalten.
Wir erweitern gezielt:

### 3.1 Neue Tabelle: `project_phase_plan`
Zweck: Definiert, welche Phasen im Projekt geplant sind und mit welcher Grobschaetzung.

Vorschlag:
- `id UUID PK`
- `project_id UUID FK`
- `owner_id UUID NOT NULL`
- `phase_code VARCHAR(20) NOT NULL`
- `is_required BOOLEAN NOT NULL DEFAULT true`
- `is_enabled BOOLEAN NOT NULL DEFAULT true`
- `estimated_hours_min NUMERIC(6,1) NULL`
- `estimated_hours_max NUMERIC(6,1) NULL`
- `sequence_order INTEGER NOT NULL`
- `notes TEXT NULL`
- `created_at`, `updated_at`, `deleted_at`
- Unique: `(project_id, phase_code)` where not deleted

### 3.2 Neue Tabelle: `project_readiness_checks`
Zweck: Produktionsfreigabe strukturiert und auditiert speichern.

Vorschlag:
- `id UUID PK`
- `project_id UUID FK`
- `owner_id UUID NOT NULL`
- `check_code VARCHAR(40)` (AVOR_DONE, MATERIAL_READY, FITTINGS_READY, PLANS_READY, SITE_READY)
- `status VARCHAR(20)` (pending, ok, blocked, n_a)
- `checked_by UUID NULL`
- `checked_at TIMESTAMPTZ NULL`
- `comment TEXT NULL`
- `created_at`, `updated_at`
- Unique: `(project_id, check_code)`

### 3.3 Tasks erweitern (Soll/Ist + Ursache)
Bestehende `tasks` erweitern:
- `estimated_hours NUMERIC(6,1) NULL`
- `actual_start_date DATE NULL`
- `actual_end_date DATE NULL`
- `delay_reason_code VARCHAR(40) NULL`
- `delay_notes TEXT NULL`
- `blocked_reason TEXT NULL`

Hinweis:
- `phase_code`, `planned_week`, `planned_year` existieren bereits.
- `delay_reason_code` wird spaeter gegen Katalog validiert.

### 3.4 Neue Tabelle: `task_delay_events`
Zweck: Mehrere Verzugsereignisse je Task statt nur "letzter Stand".

Vorschlag:
- `id UUID PK`
- `task_id UUID FK`
- `owner_id UUID NOT NULL`
- `reason_code VARCHAR(40) NOT NULL`
- `impact_days INTEGER NOT NULL`
- `is_external BOOLEAN NOT NULL DEFAULT false`
- `note TEXT NULL`
- `created_by UUID NULL`
- `created_at TIMESTAMPTZ`

### 3.5 Neue Tabelle: `planning_runs`
Zweck: Auto-Planungslaeufe versionieren.

Vorschlag:
- `id UUID PK`
- `owner_id UUID NOT NULL`
- `run_type VARCHAR(20)` (initial, replan)
- `kw_from INTEGER`
- `year_from INTEGER`
- `inputs JSONB NOT NULL`
- `result_summary JSONB NOT NULL`
- `created_by UUID NULL`
- `created_at TIMESTAMPTZ`

## 4. Scheduler-Ansatz (stufenweise)

### Stufe 1: Deterministisch (sofort implementierbar)
- Inputs:
  - Projekt-Endtermin
  - aktivierte Phasen mit Dauerannahmen
  - Readiness-Gate
  - Verfuegbare Ressourcen + Skills + Absenzen
- Regeln:
  - Nur freigegebene Projekte einplanen.
  - Reihenfolge anhand `sequence_order` + Abhaengigkeiten.
  - Kapazitaetslimit je Abteilung/Ressource je KW.
  - Konflikte markieren statt still zu ueberschreiben.
- Output:
  - Vorschlag Task-Phase -> KW
  - Vorschlag Task-Assignment -> Tag/Halbtag
  - Warnungen (Engpass, fehlende Skills, Gate blockiert)

### Stufe 2: Lernunterstuetzte Schaetzung (ML-light)
- Basis: Historische Soll/Ist-Differenzen je Phase.
- Ergebnis:
  - Dauerempfehlung mit Unsicherheitsband.
  - Risikoindikator pro Projekt/Phase.

### Stufe 3: Vorhersagemodell (spaeter)
- Features:
  - Phase, Auftragstyp, Kunde, Saison, Teamzuschnitt, externe Faktoren.
- Ziel:
  - Bessere Dauerprognosen und Delay-Warnungen vor Planfreigabe.
- Rahmen:
  - Erst wenn ausreichend strukturierte Datenqualitaet erreicht ist.

## 5. UX/Flow-Implementierung

### 5.1 Projektanlage-Wizard
Schritte:
1. Stammdaten + Endtermin.
2. Phasen waehlen (inkl. optional/entfaellt).
3. Grobschaetzung je Phase (Stundenband).
4. Readiness-Checks initial setzen.
5. Projekt speichern + Gantt erzeugen.

### 5.2 Projekt-Gantt (Fuehrungsansicht)
- Zeigt alle aktivierten Phasen in logischer Reihenfolge.
- Kennzeichnet Blocker (Gate, fehlende Ressourcen, externe Abhaengigkeit).
- Zeigt Planversion und letzte Umplanung.

### 5.3 Wochenplan "Vorschlagen" statt nur manuell fuellen
- Button: "KW intelligent planen".
- Ergebnis als Vorschau:
  - welche Assignments neu
  - welche verschoben
  - welche Konflikte offen
- Uebernahme nur nach Benutzerbestaetigung.

### 5.4 Abweichungen erfassen (minimaler Pflicht-Flow)
- Beim Verschieben/Verzug:
  - Grundcode waehlen
  - Impact in Tagen
  - Kurznotiz
- Diese Daten fliessen in Reports und spaeter in ML ein.

## 6. Datenreset-Strategie (Wochenplan-Neustart)

Da Fokus nun auf sauberer Neuerfassung liegt:

1. Read-only Backup-Snapshot erstellen.
2. Planungsdaten resetten (tenant-sicher):
   - `task_assignments` (soft-delete oder hard-delete je Umgebung)
   - `task_phase_schedules` (nach Entscheidung)
   - optional Import-Testprojekte kennzeichnen/archivieren
3. Import-Routen bis Owner-Scoping-Fix nur eingeschraenkt nutzen.
4. Danach Pilotprojekte ausschliesslich nativ in IntelliPlan erfassen.

Wichtig:
- Kein destruktiver Reset ohne dokumentierte Wiederherstellung.
- Reset-Skript muss tenant-filterbar sein (`owner_id`).

## 7. Umsetzungsplan als PR-Serie

### PR-1: Datenhygiene + Guardrails
- Owner-Scoping in Import/wochenplan fixen.
- Reset-Playbook + Admin-Skript (tenant-safe).
- Tests: keine Cross-Owner-Zuordnungen.

### PR-2: Projektphasen-Plan + Gantt-Grundlage
- Migration `project_phase_plan`.
- API fuer Projektphasen.
- Projekt-Wizard Schritt "Phasen + Dauerband".

### PR-3: Readiness-Gate
- Migration `project_readiness_checks`.
- Gate-UI im Projekt.
- Scheduler blockiert Projekte ohne Freigabe.

### PR-4: Regelbasierter Scheduler v1
- Service `planningEngineService`.
- Vorschlag + Delta-Preview + Uebernahme.
- Umplanungs-Event protokollieren.

### PR-5: Soll/Ist + Delay-Learning Basis
- Task-Erweiterungen + `task_delay_events`.
- Pflichtfeld fuer Verzugsgrund bei replanning.
- Erste Analytics-Seite (Top Delay-Faktoren).

### PR-6: ML-light Empfehlungen
- Dauerempfehlung pro Phase aus Historie.
- Risiko-Hinweise pro Projekt/Kunde.
- Transparente Erklaerung "Warum dieser Vorschlag".

## 8. Qualitaets- und Erfolgsmetriken

### Produktmetriken
- Anteil Projekte mit vollstaendiger Projektdefinition vor Produktionsstart.
- Anteil Produktionsstarts mit Gate `ready`.
- Planstabilitaet: Anzahl Umplanungen pro Projekt.
- Termintreue: Anteil Tasks im geplanten Fenster.

### Lernmetriken
- Anteil Verzuege mit strukturiertem Grundcode.
- Top 5 Delay-Faktoren stabil identifizierbar.
- Prognosefehler Dauer (MAPE) ueber Zeit sinkend.

### Betriebsmetriken
- Keine ungefilterten owner-queries in produktiven Kernservices.
- Keine DB-Integritaetsverletzung bei Replan-Lauf.
- End-to-end Testfluss fuer "Projekt bis KW-Plan" stabil gruen.

## 9. Risiken und Gegenmassnahmen

- Risiko: Zu frueh "ML" bauen ohne Datenqualitaet.
  - Massnahme: Stufe 1/2 zuerst (deterministisch + ML-light).
- Risiko: Planlogik wird fuer User zu komplex.
  - Massnahme: Wizard + klare Defaults + Explainability je Vorschlag.
- Risiko: Replan zerstoert manuelle Feinplanung.
  - Massnahme: fixierte Assignments respektieren (`is_fixed` priorisieren).
- Risiko: Datenreset entfernt wertvolle Historie.
  - Massnahme: Snapshot + Archivierung + tenant-sichere Selektion.

## 10. Definition of Done fuer diese Produktlinie

Erreicht, wenn:
- Projekte ohne Excel-Endpunkte vollstaendig erfasst werden.
- Produktionsstart nur ueber Readiness-Gate erfolgt.
- Wochenplan-Vorschlaege reproduzierbar und nachvollziehbar sind.
- Umplanung mit Gruenden historisiert ist.
- Erste datengestuetzte Risiko-/Dauerhinweise im Alltag nutzbar sind.
