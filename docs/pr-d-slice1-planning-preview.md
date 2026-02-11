# PR-D Slice 1: Planning Engine Preview + Apply

Stand: 2026-02-11

## Ziel

Der Wochenplan-Flow bekommt einen expliziten Vorschau-Schritt vor der Uebernahme:

1. Vorschlag berechnen (deterministisch)
2. Delta anzeigen (`create`, `update`, `unchanged`, `skipped`)
3. Konflikte/Warnungen sichtbar machen
4. Uebernahme nach Benutzerbestaetigung

## Backend

Neue Service-Datei:

- `backend/src/services/planningEngineService.ts`

Kernfunktionen:

1. `buildAutoSchedulePreview(...)`
2. `applyAutoSchedulePreview(...)`

Neue API:

1. `POST /api/projects/:id/auto-schedule/preview`

Bestehende API:

1. `POST /api/projects/:id/auto-schedule`
   - nutzt jetzt dieselbe Planning-Engine-Logik (Preview -> Apply) fuer konsistente Ergebnisse.

## Frontend

`AutoScheduleDialog` wurde auf einen 2-Schritt-Flow umgestellt:

1. `Preview Plan`
2. `Apply Plan`

Neue Anzeigeelemente:

1. Delta-Chips (`Create/Update/Unchanged/Skipped`)
2. Warning-Block
3. Konfliktanzeige fuer Ressourcenuerschneidungen
4. Task-Liste mit geplanten Aenderungen

## Tests / Validierung

Neue Tests:

1. `backend/src/services/__tests__/planningEngineService.test.ts`

Bestehende Tests angepasst:

1. `backend/src/services/__tests__/taskService.test.ts` (Auto-Schedule nutzt nun Planning Engine)
