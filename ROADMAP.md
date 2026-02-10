# IntelliPlan ROADMAP

Stand: 2026-02-09

## 1. Ist-Stand (nach Merge PR #11)

### Repo + Qualitaet
- `main` ist synchron mit `origin/main`.
- Letzter Remote-Commit: `9d78d08` (2026-02-07).
- Backend-Qualitaet: `25` Testfiles, `475` Tests, alle gruen (`cd backend && npm test`).
- Frontend-Qualitaet: Build gruen (`cd frontend && npm run build`, Stand 2026-02-09).

### Aktuelle harte Blocker fuer Praxistauglichkeit (P0)
1. Manueller Smoke-Test fuer Kern-Views (Wochenplan, Capacity, Mitarbeiter) noch ausstehend.

## 2. Letzte relevante Commits (GitHub/Remote)

| Datum | Commit | Inhalt | Bedeutung fuer naechste Phase |
|---|---|---|---|
| 2026-02-07 | `9d78d08` | Cleanup, Legacy-Tooling entfernt | Repo-Struktur bereinigt |
| 2026-02-07 | `2cf8224` | Merge pendenzen UI | Pendenzen UX integriert |
| 2026-02-07 | `1960b31` | Merge RBAC/DB | Rechte + Datenmodell stabiler |
| 2026-02-07 | `6d1bb38` | Wochenplan Import-/Spalten-Fixes | Datenqualitaet verbessert |
| 2026-02-07 | `9cd9f8b` | work_role + skills + Hilfskraft | Ressourcenmodell erweitert |
| 2026-02-07 | `3e19b34` | Migrations- und Startup-Fixes | Stabilitaet verbessert |
| 2026-02-07 | `1fb1f6d` | ExcelJS Crash-Fix | Import robuster |
| 2026-02-07 | `e38c14c` | Review-Fixes (u.a. SQL Parametrisierung) | Sicherheits-/Codequalitaet verbessert |

## 3. Was bereits abgeschlossen ist

- Kernmodule laufen: Auth, Appointments, Projects, Tasks, Wochenplan, Capacity, Mitarbeiter-View, Pendenzen.
- Wochenplan Phase-2 Backend-Endpunkte sind vorhanden:
  - Konflikte, Batch-Assign, Copy-Week, Unassigned, Phase-Matrix, Resources-Overview.
- Datenbank-Migrationsstand bis `041_add_resource_work_role.sql`.
- CI vorhanden (Backend TypeCheck + Tests, Frontend TypeCheck + Build).
- Soft-Delete- und RBAC-Basis ist implementiert.

## 4. Roadmap bis "praxistauglich"

## Phase 0 - Stabilisieren (sofort, 2-4 Tage)
**Ziel:** Build gruen, Contract konsistent, keine stillen Fallbacks.

**Arbeitspakete:**
- [x] Frontend Build-Fehler beheben (Capacity/ResourceDetailPanel/assignmentService).
- [x] Frontend- und Backend-Resource-Typen vereinheitlichen.
- [x] Veraltete TODO/Fallbacks entfernen oder auf echten Feature-Flags umstellen.
- [ ] Kurzer Smoke-Test-Run fuer Kern-Views (Wochenplan, Capacity, Mitarbeiter).

**Exit-Kriterien:**
- [x] `cd frontend && npm run build` ist gruen.
- [x] `cd backend && npm test` bleibt gruen.
- [x] Keine API-Contract-Mismatch-Workarounds mehr in Kernpfaden.

## Phase 1 - Wochenplan End-to-End schliessen (1-2 Wochen)
**Ziel:** Die bereits gebauten Backend-Features sind voll in der UI nutzbar.

**Arbeitspakete:**
- [x] Batch-Assign (`POST /api/wochenplan/assign`) in Wochenplan-UI verdrahten.
- [ ] Copy-Week, Unassigned-View, Phase-Matrix im Frontend aktiv nutzen.
- [ ] CSV-Export aus UI nutzbar machen.
- [ ] URL-Sync + "Heute"-Navigation konsistent umsetzen.

**Exit-Kriterien:**
- Alle relevanten Wochenplan-Endpunkte haben produktive UI-Flows.
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
- Pilotbetrieb mit einem Realkunden (Bucher-Lead) mit klaren Erfolgskriterien.

**Exit-Kriterien:**
- Pilotkunde plant mindestens 2-4 Wochen ohne Rueckfall auf Excel als Primarsystem.
- Kritische Bugs haben reproduzierbaren Incident-Prozess.

## 5. Priorisierung (ab jetzt)

1. **P0:** Frontend Build + Contract Drift sofort beheben.
2. **P1:** Wochenplan Endpunkte komplett in UI verdrahten.
3. **P1:** Multi-Tenant/Owner-Scoping absichern.
4. **P2:** Ressourcen/Absenzen fuer realistische Kapazitaet ausbauen.
5. **P2:** Import-UX als Onboarding standardisieren.

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
