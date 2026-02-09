# IntelliPlan ROADMAP

Stand: 2026-02-09

## 1. Ist-Stand (nach Merge PR #11)

### Repo + Qualitaet
- `main` ist synchron mit `origin/main`.
- Letzter Commit auf `main`: `0d1bc7d` (2026-02-09), PR #11 gemerged.
- Backend: `25` Testfiles, `475` Tests, gruen (`cd backend && npm test`).
- Frontend: Build gruen (`cd frontend && npm run build`).

### Hinweis zum Workspace
- Es gibt eine lokale, nicht-committe Aenderung in `backend/package-lock.json`.
- Diese Aenderung ist nicht Teil des aktuellen Plans und sollte bewusst behandelt werden.

## 2. Was abgeschlossen ist

- Frontend Build-Blocker wurden behoben.
- `MultiWeekTrend` ist in `Capacity` wieder sauber eingebaut.
- Wochenplan-/Mitarbeiter-/Kapazitaets-Kernflows sind lauffaehig.
- Wochenplan-Phase2 Backend-Endpunkte sind implementiert:
  - `GET /api/wochenplan/conflicts`
  - `POST /api/wochenplan/assign`
  - `POST /api/wochenplan/copy`
  - `GET /api/wochenplan/unassigned`
  - `GET /api/wochenplan/phase-matrix`
  - `GET /api/wochenplan/resources`
  - `GET /api/wochenplan/resource/:resourceId`
- CSV-Export Endpoint ist implementiert:
  - `GET /api/export/wochenplan/csv`

## 3. Aktuelle Luecken (naechster Fokus)

1. Frontend nutzt mehrere bereits vorhandene Wochenplan-Endpoints noch nicht produktiv.
2. Quick-Assign nutzt aktuell Einzel-Requests statt Batch-Endpoint.
3. In `frontend/src/services/wochenplanService.ts` und `frontend/src/services/mitarbeiterService.ts` gibt es noch Legacy-Fallbacks/TODOs.
4. API-Contract sollte in den Services eindeutiger und strikter gemacht werden (weniger implizite Fallback-Pfade).

## 4. Naechster Umsetzungsblock (fuer neues Kontextfenster)

## Phase 1A - Wochenplan End-to-End schliessen (Empfohlen als naechster Sprint)

**Ziel:** Alle bereits vorhandenen Wochenplan-Backend-Faehigkeiten sind im Frontend nutzbar.

### Arbeitspakete
1. **Service-Layer erweitern (`wochenplanService`)**
   - Methoden fuer `assignBatch`, `copyWeek`, `getUnassigned`, `getPhaseMatrix` und `exportCsvUrl`.
   - Einheitliche Request/Response-Typen definieren.

2. **Quick-Assign auf Batch-API umstellen**
   - `frontend/src/components/wochenplan/QuickAssignPopover.tsx`
   - Statt Schleife mit Einzel-POSTs: ein Request auf `POST /api/wochenplan/assign`.
   - Konflikte aus 409 sauber in UI anzeigen.

3. **Copy-Week UI in Wochenplan einbauen**
   - In `frontend/src/pages/Wochenplan.tsx` eine klare Aktion fuer "Woche kopieren".
   - Fehlerfall (Target hat bereits Daten) klar anzeigen.

4. **CSV-Export in Wochenplan integrieren**
   - Download-Button mit aktuell gewaehlter KW/Jahr (optional Department).

5. **Unassigned + Phase-Matrix sichtbar machen**
   - Unassigned-Details per Endpoint statt nur heuristischer Badge.
   - Phase-Matrix als kompakte Overlay/Drawer-Ansicht fuer mehrere KWs.

### Exit-Kriterien Phase 1A
- Quick-Assign nutzt produktiv den Batch-Endpoint.
- Copy-Week und CSV-Export sind aus der Wochenplan-UI bedienbar.
- Unassigned- und Phase-Matrix-Daten kommen aus den vorgesehenen Endpoints.
- Frontend-Build und Backend-Tests bleiben gruen.

## Phase 1A.1 - Bruecke Projekt/Gantt -> Wochenplan (direkter naechster Schritt)

**Ziel:** Nach `Schedule Tasks` im Projekt sollen die Tasks mit ihren Phasenwochen im Wochenplan sichtbar sein und direkt auf Mitarbeiter/Halbtage zugeordnet werden koennen.

### Problem (aktueller Stand)
- `autoSchedule` plant aktuell `tasks.start_date`/`tasks.due_date` und `task_work_slots`, aber publiziert die Planung nicht nach `task_phase_schedules`.
- Die Wochenplan-Sicht gruppiert Aufgaben primär ueber `task_phase_schedules` pro KW.
- Ergebnis: Projekt ist geplant, Wochenplan bleibt fuer diese Auftraege leer oder unvollstaendig.

### Arbeitspakete (konkret)
1. **Backend: Publish-Schritt von Auto-Schedule in den Wochenplan**
   - In `backend/src/services/taskService.ts` nach erfolgreichem Auto-Schedule je Task einen `UPSERT` auf `task_phase_schedules` ergaenzen.
   - Mapping definieren: `Task.phase_code` (`ZUS`, `CNC`, `PROD`, `VORBEH`, `NACHBEH`, `BESCHL`, `TRANS`, `MONT`) -> `production_phase`.
   - KW/Jahr aus geplantem Task-Zeitraum ableiten (mindestens aus `due_date`, optional konfigurierbar `start_date` vs. `due_date`).
   - Nur Tasks mit gueltigem `phase_code` publizieren; fehlende Phasen als Warning zurueckgeben.

2. **Contract schliessen (Task-Phase transparent im Frontend)**
   - In `frontend/src/types/index.ts` bei `Task` und `CreateTaskDTO` die Felder `phaseCode`, `plannedWeek`, `plannedYear` ergaenzen.
   - Sicherstellen, dass Task-Create/Update diese Felder weiterhin unveraendert an Backend-Validatoren durchreichen.

3. **Wochenplan-Integration wie geplant abschliessen**
   - `frontend/src/services/wochenplanService.ts`: Methoden fuer `assignBatch`, `copyWeek`, `getUnassigned`, `getPhaseMatrix`, `exportCsvUrl`.
   - `frontend/src/components/wochenplan/QuickAssignPopover.tsx`: Batch-Assign ueber `POST /api/wochenplan/assign` statt Einzel-POSTs.
   - `frontend/src/pages/Wochenplan.tsx`: Copy-Week Aktion, CSV-Export, Unassigned/Phase-Matrix Anzeige.

4. **Feingranulare Zuordnung im Wochenplan**
   - Beibehalten: Halbtag (`morning`/`afternoon`/`full_day`) als Standard.
   - Optional direkt danach: `startTime` in `AssignmentDialog` sichtbar machen, damit "genaue Zeiten" (z. B. 09:30) gepflegt werden koennen.

### Beschreibungspflicht nach Umsetzung
- Nach Abschluss von Phase 1A.1 wird eine kurze, klare Beschreibung fuer den Nutzer erstellt.
- Inhalt der Beschreibung:
  - Ausgangslage (warum Projekt geplant, aber Wochenplan leer war)
  - Was implementiert wurde (Bruecke Projekt -> Wochenplan)
  - Wie der Ablauf in der UI funktioniert (Projekt planen -> Wochenplan zuordnen)
  - Bekannte Grenzen und naechste Schritte

### Exit-Kriterien Phase 1A.1
- Auto-Scheduled Tasks erscheinen in der korrekten KW/Phase im Wochenplan.
- Quick-Assign arbeitet produktiv ueber Batch-Endpoint.
- Unassigned-Endpoint zeigt nur noch echte Restfaelle.
- Frontend-Build und Backend-Tests bleiben gruen.

## 5. Darauf folgende Phase

## Phase 1B - Contract Cleanup + Fallback-Haertung

**Ziel:** Keine "Endpoint may not exist yet"-Fallbacks mehr in produktiven Pfaden.

### Arbeitspakete
- Legacy-Fallbacks in `frontend/src/services/wochenplanService.ts` und `frontend/src/services/mitarbeiterService.ts` entfernen oder hinter klaren Feature-Flags kapseln.
- Response-Shapes zwischen Backend und Frontend strikt angleichen.
- Fehlerbehandlung in UI explizit (statt stilles Leerlaufen).

## 6. Definition "bereit fuer naechstes Kontextfenster"

Der Start im neuen Kontext sollte direkt mit **Phase 1A** beginnen.

### Empfohlene erste Task-Reihenfolge (konkret)
1. `wochenplanService` API-Methoden erweitern.
2. `QuickAssignPopover` auf Batch-Assign refactoren.
3. Copy-Week Aktion in `Wochenplan` einbauen.
4. CSV-Export Button einbauen.
5. Unassigned/Phase-Matrix Darstellung integrieren.

## 7. Pflegeprozess

- ROADMAP Update bei jedem Merge mit hohem Impact.
- Jede Phase braucht: Ziel, Arbeitspakete, Exit-Kriterien.
- Erledigte Punkte aus "Luecken" in "abgeschlossen" uebernehmen.
