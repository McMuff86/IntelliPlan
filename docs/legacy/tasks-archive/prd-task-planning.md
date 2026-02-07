# PRD: Task Planning & Project Scheduling

## Overview
Erweitert IntelliPlan um projektbasierte Aufgabenplanung mit abhaengigen Teilaufgaben, frei waehlbaren Arbeitstagen/Zeiten, optionalen Kalender-Erinnerungen und automatischer Kaskadierung bei Verschiebungen.

## Problem Statement
Professionelle Projekte (z. B. Bau, Produktion, Wartung) bestehen aus Arbeitspaketen mit Abhaengigkeiten und Zeitbloecken, die sich ueber Tage bis Monate erstrecken. Aktuell fehlen in IntelliPlan:
- Abhaengige Aufgabenplanung (Blockiert/Start-Logik)
- Mehrtaegige/mehrwoechige Zeitslots pro Aufgabe
- Kaskadierung bei Terminverschiebung
- Optionale Kalender-Erinnerungen fuer Aufgaben

## Goals
- Aufgaben und Teilaufgaben sauber strukturiert planen (mit Abhaengigkeiten)
- Arbeitstage/Zeiten flexibel und manuell auswaehlbar, mit optionalen Templates
- Verschieben einzelner Tasks oder kompletter Task-Bloecke
- Optionale Kalender-Erinnerungen pro Task-Work-Slot

## Non-Goals (Out of Scope)
- KI-basierte Auto-Planung (Phase 2)
- Echtzeit-Kollaboration / Multi-User Editing
- Externe Kalender-Synchronisation
- Mobile Offline-Planung

## User Stories

### [US-TP-001] Datenbank-Schema fuer Projekte & Tasks
**As a** Entwickler
**I want** Tabellen fuer Projekte, Tasks, Abhaengigkeiten und Work-Slots
**So that** Aufgaben ueber Wochen/Monate geplant und verknuepft werden koennen

**Acceptance Criteria:**
- [ ] `projects` mit Owner, Kalender-Template (Wochenenden, Arbeitszeiten)
- [ ] `tasks` mit Status, Dauer, Planung/Range
- [ ] `task_dependencies` mit Abhaengigkeits-Typ
- [ ] `task_work_slots` fuer manuelle Zeitbloecke

**Technical Notes:**
- UTC-Zeiten, ISO 8601
- CHECK-Constraints fuer Status/Typen

---

### [US-TP-002] Projekt-CRUD API
**As a** Nutzer
**I want** Projekte erstellen, lesen, bearbeiten, loeschen
**So that** ich Tasks gruppieren kann

**Acceptance Criteria:**
- [ ] POST /api/projects
- [ ] GET /api/projects
- [ ] GET /api/projects/:id
- [ ] PUT /api/projects/:id
- [ ] DELETE /api/projects/:id

---

### [US-TP-003] Task-CRUD API
**As a** Nutzer
**I want** Tasks in Projekten verwalten
**So that** ich Arbeitspakete planen kann

**Acceptance Criteria:**
- [ ] POST /api/projects/:projectId/tasks
- [ ] GET /api/projects/:projectId/tasks
- [ ] GET /api/tasks/:id
- [ ] PUT /api/tasks/:id
- [ ] DELETE /api/tasks/:id

---

### [US-TP-004] Work-Slots (manuelle Planung)
**As a** Nutzer
**I want** einzelne Arbeitsbloecke fuer Tasks festlegen
**So that** ich Arbeit auf Tage/Wochen verteilen kann

**Acceptance Criteria:**
- [ ] POST /api/tasks/:id/work-slots
- [ ] GET /api/tasks/:id/work-slots
- [ ] DELETE /api/tasks/:id/work-slots/:slotId
- [ ] Validierung: end > start

---

### [US-TP-005] Abhaengigkeiten verwalten
**As a** Nutzer
**I want** Task-Abhaengigkeiten definieren
**So that** ich Blockierungen und Reihenfolgen steuern kann

**Acceptance Criteria:**
- [ ] Abhaengigkeits-Typen: start-start, finish-finish, finish-start
- [ ] POST /api/tasks/:id/dependencies
- [ ] GET /api/tasks/:id/dependencies
- [ ] DELETE /api/tasks/:id/dependencies/:dependencyId

---

### [US-TP-006] Blockierungs-Status & Validierung
**As a** Nutzer
**I want** Blockierungen sichtbar sehen
**So that** ich keine Tasks starte, die abhaengig sind

**Acceptance Criteria:**
- [ ] Task zeigt `blocked` wenn Abhaengigkeiten offen sind
- [ ] Start-Aktion nur moeglich, wenn Abhaengigkeiten erfuellt

---

### [US-TP-007] Verschieben & Kaskadierung
**As a** Nutzer
**I want** Tasks verschieben und Folgetasks automatisch anpassen
**So that** mein Plan konsistent bleibt

**Acceptance Criteria:**
- [ ] Default: Verschiebung zieht nur Folgetasks nach
- [ ] Option: kompletter Task-Block verschieben
- [ ] Kaskadierung respektiert Abhaengigkeiten

---

### [US-TP-008] UI: Projekt- & Task-Uebersicht
**As a** Nutzer
**I want** Projekte und Tasks in einer Uebersicht sehen
**So that** ich schnell navigieren kann

**Acceptance Criteria:**
- [ ] Projektliste + Taskliste pro Projekt
- [ ] Status, Dauer, Blockierung sichtbar

---

### [US-TP-009] UI: Task Detail + Work-Slots
**As a** Nutzer
**I want** einen Task-Detailbereich mit Slots
**So that** ich Zeitbloecke erstellen/entfernen kann

**Acceptance Criteria:**
- [ ] Slot-Liste mit Zeiten
- [ ] Hinzufuegen/Entfernen UI
- [ ] Abhaengigkeiten sichtbar

---

### [US-TP-010] UI: Timeline/Gantt Ansicht
**As a** Nutzer
**I want** eine Timeline-Ansicht
**So that** ich Dauer und Abhaengigkeiten visuell plane

**Acceptance Criteria:**
- [ ] Gantt/Timeline View pro Projekt
- [ ] Abhaengigkeiten sichtbar (Lines/Indicators)

---

### [US-TP-011] Kalender-Erinnerungen (optional)
**As a** Nutzer
**I want** optionale Erinnerungen im Kalender
**So that** Tasks als Termine sichtbar sind

**Acceptance Criteria:**
- [ ] Toggle pro Work-Slot oder Task
- [ ] Nur Reminder, keine echte Terminbindung

---

### [US-TP-012] Arbeitszeit-Templates
**As a** Nutzer
**I want** Templates fuer Arbeitszeit
**So that** ich schneller plane

**Acceptance Criteria:**
- [ ] Templates fuer Mo-Fr 8-17, Sa+So optional
- [ ] Pro Projekt speicherbar

## Technical Requirements
- REST API fuer Projekte, Tasks, Slots, Abhaengigkeiten
- PostgreSQL Migrations mit Constraints
- Kaskadierungs-Logik als Service (Phase 1: Basic)

## UI/UX Requirements
- Moderne Task-Planung UI (Liste + Timeline)
- Blocked/Ready visuell erkennbar
- Drag/Drop optional (Phase 2)

## Testing Requirements
- Unit Tests fuer Abhaengigkeitspruefung
- Integration Tests fuer Verschiebung/Kaskade

## Success Metrics
- Aufgaben ueber Wochen/Monate planbar
- Verschiebungen aktualisieren Folgetasks konsistent

## Timeline
- Phase 1: DB + API Grundgeruest (US-TP-001 bis US-TP-005)
- Phase 2: UI-Uebersicht & Task Detail (US-TP-008, US-TP-009)
- Phase 3: Kaskadierung + Timeline (US-TP-007, US-TP-010)

