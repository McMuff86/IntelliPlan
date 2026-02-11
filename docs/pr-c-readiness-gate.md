# PR-C: Readiness Gate

Stand: 2026-02-11

## Ziel

Projektplanung in die Produktion darf nur starten, wenn fachliche Voraussetzungen explizit freigegeben sind.

Abgedeckte Checks:

1. `AVOR_DONE`
2. `MATERIAL_READY`
3. `FITTINGS_READY`
4. `PLANS_READY`
5. `SITE_READY`

## Datenmodell

Migration: `backend/migrations/043_project_readiness_checks.sql`

Neue Tabelle: `project_readiness_checks`

1. owner-scoped (`owner_id`)
2. soft-delete (`deleted_at`)
3. status (`pending`, `ok`, `blocked`, `n_a`)
4. Historisierung der letzten Bewertung (`checked_by`, `checked_at`, `comment`)

## API

### Readiness endpoints

1. `GET /api/projects/readiness/default`
2. `GET /api/projects/:id/readiness`
3. `PUT /api/projects/:id/readiness`
4. `GET /api/projects/:id/readiness/summary`

### Auto-Schedule Guardrail

`POST /api/projects/:id/auto-schedule` blockiert jetzt mit `409`, wenn das Readiness-Gate nicht freigegeben ist.

Response beinhaltet die Summary:

1. `isReady`
2. `okCount`, `naCount`, `pendingCount`, `blockedCount`

## Frontend

`ProjectDetail` zeigt und bearbeitet das Gate:

1. Übersichtschips (`Ready/Not Ready`, Counts)
2. pro Check: Status + Kommentar
3. Speichern über `PUT /readiness`
4. `Schedule Tasks` ist deaktiviert, solange `isReady = false`

## Tests / Validierung

1. Neue Service-Tests: `backend/src/services/__tests__/projectReadinessService.test.ts`
2. Voller Backend-Testlauf gruen
3. Backend Typecheck gruen
4. Frontend Build gruen
