# IntelliPlan ROADMAP

Stand: 2026-02-10

## 1. Ist-Stand (nach Merge nightly/10-02-intelliplan-phase1a)

### Repo + Qualitaet
- `main` enthaelt Phase 0 Contract Cleanup + Phase 1A/1A.1 Features.
- Backend: `25` Testfiles, `479` Tests, gruen (`cd backend && npm test`).
- Frontend: Build gruen (`cd frontend && npm run build`).

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
- **Phase 0 (PR #13) — Contract Cleanup:**
  - Frontend-Contract-Alignment: direkte API-Calls ohne Fallback
  - QuickAssign mit `useMemo`, `extractAssignError`, Conflict-Labels
  - MitarbeiterGrid: FIX-Anzeige, erweiterte Tooltips
  - `AssignHalfDay` Union-Type statt `string`
- **Phase 1A — Frontend Integration abgeschlossen:**
  - `wochenplanService` erweitert: `assignBatch`, `copyWeek`, `getUnassigned`, `getPhaseMatrix`, `getExportCsvUrl`
  - QuickAssignPopover auf Batch-Assign umgestellt (ein Request statt Schleife)
  - Copy-Week Dialog in Wochenplan-UI
  - CSV-Export Button in Wochenplan-UI
  - Unassigned-Anzeige unter Kapazitaetsuebersicht
  - Phase-Matrix Drawer (7-Wochen-Uebersicht)
- **Phase 1A.1 — Bruecke Projekt→Wochenplan:**
  - `autoScheduleProjectTasks` publiziert jetzt nach `task_phase_schedules` (UPSERT)
  - Phase-Code Mapping (ZUS→zuschnitt, CNC→cnc, etc.)
  - ISO-Week Berechnung aus due_date
  - Frontend Types: `phaseCode`, `plannedWeek`, `plannedYear` auf Task

## 3. Was bereits abgeschlossen ist (historisch)

- Kernmodule laufen: Auth, Appointments, Projects, Tasks, Wochenplan, Capacity, Mitarbeiter-View, Pendenzen.
- Datenbank-Migrationsstand bis `041_add_resource_work_role.sql`.
- CI vorhanden (Backend TypeCheck + Tests, Frontend TypeCheck + Build).
- Soft-Delete- und RBAC-Basis ist implementiert.

## 4. Roadmap bis "praxistauglich"

## Phase 1B - Contract Cleanup + Fallback-Haertung (naechster Sprint)
**Ziel:** Keine "Endpoint may not exist yet"-Fallbacks mehr in produktiven Pfaden.

**Arbeitspakete:**
- Legacy-Fallbacks in `mitarbeiterService.ts` entfernen oder hinter klaren Feature-Flags kapseln.
- Response-Shapes zwischen Backend und Frontend strikt angleichen.
- Fehlerbehandlung in UI explizit (statt stilles Leerlaufen).
- [ ] Kurzer Smoke-Test-Run fuer Kern-Views (Wochenplan, Capacity, Mitarbeiter).
- [ ] URL-Sync + "Heute"-Navigation konsistent umsetzen.

**Exit-Kriterien:**
- Keine API-Contract-Mismatch-Workarounds mehr in Kernpfaden.
- Ein Werkstattleiter kann eine Woche ohne API-Workaround planen/kopieren/exportieren.

## Phase 2 - Datenkorrektheit und Multi-Tenant-Haertung (1 Woche)
**Ziel:** Keine Datenleaks, konsistente Filterung, belastbare DB-Regeln.

**Arbeitspakete:**
- Owner-Scoping in allen Wochenplan-Queries verifizieren/haerten.
- Soft-Delete-Konsistenz in allen planungsrelevanten Tabellen schliessen.
- Migration-/Backfill-Checks fuer Bestandsdaten dokumentieren.
- Contract-Tests fuer zentrale Endpunkte erweitern.

**Exit-Kriterien:**
- Tenant-Trennung fuer Wochenplan-Daten nachweisbar.
- Keine ungefilterten produktiven Queries in kritischen Services.

## Phase 3 - Ressourcenmodell + Kapazitaet realbetriebssicher (1-2 Wochen)
**Ziel:** Kapazitaet bildet die Werkstattrealitaet korrekt ab.

**Arbeitspakete:**
- Absenzen (ferien/krank/etc.) als eigenes Modell + UI integrieren.
- Kapazitaetsberechnung um Absenzen und Rollenregeln erweitern.
- Skills/WorkRole im Planning-Flow aktiv verwenden (Filter, Vorschlaege).

**Exit-Kriterien:**
- Kapazitaetsansicht stimmt bei Testwochen mit manueller Referenz ueberein.
- Ressourcenplanung ohne Excel-Nebenliste moeglich.

## Phase 4 - Import als Onboarding-Flow (1 Woche)
**Ziel:** Excel-Import ist fuer Neukunden stabil und nachvollziehbar.

**Arbeitspakete:**
- Import-Vorschau + Mapping-Feedback verbessern.
- Re-Import idempotent und fehlertolerant machen.
- In-App Anleitung fuer "Excel -> IntelliPlan" bereitstellen.

**Exit-Kriterien:**
- 2-3 echte Kundenfiles lassen sich reproduzierbar importieren.
- Importfehler sind klar erklaert und korrigierbar.

## Phase 5 - Pilot-Rollout und Betriebsfaehigkeit (laufend)
**Ziel:** Sicherer Beta-Betrieb mit schnellem Feedback-Zyklus.

**Arbeitspakete:**
- Monitoring/Logging-Standards fuer produktive Fehlerfaelle definieren.
- Backup/Restore-Prozess dokumentieren und testen.
- API-Dokumentation (OpenAPI) fuer Integrationen bereitstellen.
- Pilotbetrieb mit einem Realkunden mit klaren Erfolgskriterien.

**Exit-Kriterien:**
- Pilotkunde plant mindestens 2-4 Wochen ohne Rueckfall auf Excel als Primaersystem.
- Kritische Bugs haben reproduzierbaren Incident-Prozess.

## 5. Priorisierung (ab jetzt)

1. **P0:** Phase 1B: Contract-Fallbacks entfernen, Smoke-Tests.
2. **P1:** Multi-Tenant/Owner-Scoping absichern.
3. **P2:** Ressourcen/Absenzen fuer realistische Kapazitaet ausbauen.
4. **P2:** Import-UX als Onboarding standardisieren.

## 6. Definition "Praxistauglich" fuer IntelliPlan

IntelliPlan gilt als praxistauglich, wenn alle Punkte erfuellt sind:
- Build/Tests in CI stabil gruen.
- Wochenplanung, Mitarbeiterplanung, Kapazitaet und Export laufen ohne Workaround.
- Import von realen Kundendateien ist robust.
- Daten sind tenant-sicher und soft-delete-konsistent.
- Ein Pilotkunde nutzt IntelliPlan als primaeres Planungstool ueber mehrere Wochen.

## 7. Pflegeprozess fuer diese Datei

- Update-Rhythmus: mindestens 1x pro Woche oder bei jedem Merge in `main` mit hohem Impact.
- Jede Phase enthaelt: Ziel, Arbeitspakete, Exit-Kriterien.
- Erledigte Punkte werden nach oben in "abgeschlossen" uebernommen.
