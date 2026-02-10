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

1. **P0:** Datenkorrektheit + Owner-Scoping haerten (Wochenplan/Import).
2. **P0:** Projekt-getriebener Ablauf definieren: Projekt -> Gantt -> Produktionsfreigabe -> KW-Plan.
3. **P1:** Produktionsphasen pro Projekt konfigurierbar machen (inkl. optionaler Schritte).
4. **P1:** Regelbasierte Auto-Planung + Umplanung bei Verschiebungen.
5. **P2:** Lernschleife (Soll/Ist + Verzoegerungsgruende) als Grundlage fuer spaetere ML-Vorhersagen.
6. **P2:** Import-UX als Onboarding standardisieren.

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

## 8. Neue Produktlinie 2026: "Projekt zuerst, Wochenplan intelligent"

**Produktfluss (Soll):**
1. Projekt in IntelliPlan erfassen (inkl. Endtermin, Kunde, Prioritaet, Risiko).
2. Im Projekt definieren, welche Phasen wirklich noetig sind (z. B. ohne Zuschnitt / ohne Behandlung).
3. Vor Produktionsstart "Readiness Gate" pruefen:
   - AVOR abgeschlossen
   - Material bestellt/verfuegbar
   - Beschlaege bestellt/verfuegbar
   - Plaene freigegeben
4. Nach Gate-Freigabe automatische Einplanung in KWs mit Kapazitaetspruefung.
5. Bei Stoerungen (Baustelle nicht bereit, Engpass, Krankheit) automatische Umplanung mit manueller Ueberschreibung.
6. Task-Notizen zu Abweichungen erfassen und als Lernbasis nutzen.

**Warum jetzt:**
- Zielgruppe plant individualisiert (kein Serienbetrieb), deshalb braucht es starke Soll-/Ist-Planung statt starrem Schema.
- Endtermin ist kundenseitig fuehrend; Rueckwaerts-/Vorwaertsplanung muss robust sein.
- Lernen aus realen Gruenden fuer Verzoegerung ist differenzierendes Kernfeature.

## 9. Umsetzungsphasen fuer die neue Produktlinie

### Phase 0R - Wochenplan-Daten resetbar + Schutz gegen erneute Verschmutzung (kurzfristig)
**Ziel:** Sauberer Neustart fuer produktive Testplanung.

**Arbeitspakete:**
- Bereinigungs-Playbook fuer `task_assignments`, `task_phase_schedules`, optional importierte Test-`tasks/projects/resources`.
- Import-Validierung schaerfen (nur echte Mitarbeiter-Codes, Notizen getrennt erfassen).
- Owner-Scoping fuer Import upserts und Wochenplan-Queries verbindlich machen.

**Exit-Kriterien:**
- Definierter "Reset to clean state" Ablauf dokumentiert und testbar.
- Keine Cross-Owner-Zuordnungen nach neuem Import.

### Phase 1C - Projektmodell fuer Custom-Fertigung
**Ziel:** Projekte tragen die komplette Produktionsdefinition.

**Arbeitspakete:**
- Projektanlage mit Endtermin, Prioritaet, Risikoklasse.
- Projektphasen-Definition pro Auftrag (Pflicht/Optional/entfaellt).
- Geschaetzte Dauer je Phase (Bandbreite statt starre Dauer).
- Abhaengigkeiten je Phase (z. B. Montage erst nach Produktion + Baustellenfreigabe).

**Exit-Kriterien:**
- Jeder neue Auftrag ist ohne Excel vollstaendig in IntelliPlan definierbar.
- Gantt zeigt komplette Projektlogik inkl. optionaler/entfallender Phasen.

### Phase 2B - Readiness Gate vor Produktionsplanung
**Ziel:** Produktion startet nur bei fachlich sinnvollem Zustand.

**Arbeitspakete:**
- Gate-Checks als strukturierte Daten (AVOR, Material, Beschlaege, Plaene, externe Freigaben).
- Gate-Status in Projekt- und Gantt-Ansicht sichtbar.
- Blockierte Phasen duerfen nicht automatisch eingeplant werden.

**Exit-Kriterien:**
- "Nicht bereit" Projekte erscheinen nicht als normale produktive Wochenplan-Kandidaten.
- Gate-Status ist revisionssicher historisiert.

### Phase 3B - Intelligente Wochenplanung + Umplanung
**Ziel:** Planvorschlaege sind realistisch und im Alltag anpassbar.

**Arbeitspakete:**
- Regelbasierter Scheduler (Kapazitaet, Skills/Rollen, Abhaengigkeiten, Kalenderrestriktionen).
- Szenario-Regeln fuer Spezialfaelle (z. B. Tueren ohne Zuschnitt).
- Umplanungs-Engine bei Terminverschiebungen (Baustelle, Lieferverzug, Krankmeldungen).
- Compare-Ansicht: alter Plan vs. neuer Plan inkl. Delta.

**Exit-Kriterien:**
- Planer kann eine Woche per Vorschlag erzeugen, pruefen und uebernehmen.
- Umplanung erzeugt nachvollziehbare Aenderungshistorie.

### Phase 4B - Lernsystem auf Basis realer Produktionsdaten
**Ziel:** IntelliPlan verbessert Schaetzungen und Risiko-Hinweise laufend.

**Arbeitspakete:**
- Strukturierte Erfassung von Verzoegerungsgruenden auf Task-Ebene.
- Soll/Ist-Dauern je Phase speichern und auswerten.
- Risikofaktoren je Projekt/Kunde/Phase aggregieren.
- Erste "ML-light" Stufe: statistische Vorschlaege + Risiko-Warnungen (ohne Blackbox).

**Exit-Kriterien:**
- Dashboard zeigt Top-Verzoegerungsgruende und wiederkehrende Muster.
- Planvorschlaege beruecksichtigen historische Ist-Daten sichtbar.

## 10. PR-Strategie fuer die naechsten Iterationen

1. **PR-A:** Datenreset-Playbook + owner-safe Import/Query-Fixes.
2. **PR-B:** Projektphasen-Definition + Endtermin-/Gantt-Erweiterung.
3. **PR-C:** Readiness-Gate (Datenmodell, API, UI).
4. **PR-D:** Regelbasierter Auto-Scheduler + Umplanung.
5. **PR-E:** Lernschleife (Soll/Ist, Delay-Reason, Analytics).

Jede PR enthaelt:
- Migrationen (falls noetig) + Backfill/Repair-Plan
- API-Contract-Aenderungen
- Frontend-Flow inkl. Empty-/Error-States
- Tests (Service/Validator/Flow)

Detailkonzept: `docs/project-first-planning-plan.md`
