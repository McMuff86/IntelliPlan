# PR-B: Projektphasen-Definition + Projektziel-Metadaten

Stand: 2026-02-10

## Scope

Diese Iteration legt die Basis fuer den Projekt-getriebenen Flow:

1. Projekte haben jetzt strukturite Ziel-Metadaten:
   - `targetEndDate`
   - `priority`
   - `riskLevel`
2. Projekte bekommen einen eigenen, konfigurierbaren Phasenplan:
   - Reihenfolge
   - aktiv/deaktiviert
   - Pflicht/optional
   - Dauerband (min/max Stunden)
   - Phasen-Abhaengigkeiten
3. Ein Sync-Endpoint uebertraegt den Phasenplan in `tasks` inkl. Dependencies.

## Migration

Neue Migration: `backend/migrations/042_project_phase_plans.sql`

Enthaelt:

1. `projects` erweitert um:
   - `target_end_date DATE`
   - `priority VARCHAR(20)` (`low|normal|high|urgent`)
   - `risk_level VARCHAR(20)` (`low|medium|high|critical`)
2. Neue Tabelle `project_phase_plans`
   - owner-scoped + soft-delete
   - partial unique index auf `(project_id, phase_code)` fuer aktive Datensaetze
   - range-check fuer `estimated_hours_min/max`

## API

### Projektfelder

`POST /api/projects` und `PUT /api/projects/:id` akzeptieren zusaetzlich:

```json
{
  "targetEndDate": "2026-06-30",
  "priority": "high",
  "riskLevel": "medium"
}
```

### Phase plan

1. `GET /api/projects/phase-plan/default`
   - liefert den Standard-Phasenplan (Template fuer neue Projekte)
2. `GET /api/projects/:id/phase-plan`
   - liefert gespeicherten Phasenplan des Projekts
3. `PUT /api/projects/:id/phase-plan`
   - ersetzt den gesamten Phasenplan
4. `POST /api/projects/:id/phase-plan/sync-tasks`
   - synchronisiert aktivierte Phasen in `tasks` + `task_dependencies`

Sync-Body:

```json
{
  "replaceExistingPhaseTasks": false
}
```

## Frontend-Basis

`Projects`-Erstellung und `ProjectDetail` zeigen:

1. `targetEndDate`
2. `priority`
3. `riskLevel`

Außerdem sind im Frontend-Service bereits Methoden fuer die neuen Phase-Plan-Endpunkte vorhanden:

1. `projectService.getDefaultPhasePlan()`
2. `projectService.getPhasePlan(projectId)`
3. `projectService.updatePhasePlan(projectId, phases)`
4. `projectService.syncPhasePlanToTasks(projectId, options)`

## Nächste Schritte (PR-C / PR-D Vorbereitung)

1. UI-Schritt "Phasen definieren" direkt im Projekt-Wizard integrieren.
2. Readiness-Gate-Datenmodell aufsetzen und Scheduler-Blockierung aktivieren.
3. Delta-Preview fuer `sync-tasks` (was wird erstellt/aktualisiert/entfernt) vor Ausfuehrung anzeigen.
