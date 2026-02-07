# Nightly Log – 04.02.2026

## Pendenzen-Modul Backend

### Was wurde gemacht

**Branch:** `nightly/04-02-2026` (basierend auf `main`)

#### 1. Migration (`026_create_pendenzen.sql`)
- **Enums:** `pendenz_bereich`, `pendenz_prioritaet`, `pendenz_status`, `pendenz_kategorie` (mit `DO $$ ... EXCEPTION` für Idempotenz)
- **Tabellen:** `pendenzen`, `pendenzen_historie`
- **Indizes:** 5 partial indices auf `pendenzen` (project, verantwortlich, status, faellig, archived)
- **Trigger:** `updated_at` auto-update
- **FKs:** Nutzt bestehende `projects` und `users` Tabellen

#### 2. Model (`pendenz.ts`)
- Types: `PendenzBereich`, `PendenzPrioritaet`, `PendenzStatus`, `PendenzKategorie`
- Interfaces: `Pendenz`, `PendenzWithNames`, `PendenzResponse`, `CreatePendenzDTO`, `UpdatePendenzDTO`, `PendenzHistorie`
- Response Mappers: `toPendenzResponse()`, `toPendenzHistorieResponse()`

#### 3. Service (`pendenzService.ts`)
- `createPendenz()` – mit auto-increment `nr` pro Projekt
- `getPendenzById()` – JOIN mit User-Namen
- `listPendenzen()` – Pagination, Filter (status, verantwortlich, bereich, ueberfaellig), Sort
- `updatePendenz()` – dynamische SET-Klausel, auto `erledigt_am`
- `archivePendenz()` – Soft-Delete via `archived_at`
- `createHistorieEntry()` – Field-level Change Tracking
- `getHistorie()` – Historie abrufen
- `detectChanges()` – Diff zwischen altem und neuem Zustand

#### 4. Validator (`pendenzValidator.ts`)
- `createPendenzValidator` – beschreibung (required), bereich (required), optional: verantwortlichId, prioritaet, faelligBis, etc.
- `updatePendenzValidator` – alle Felder optional
- `listPendenzenQueryValidator` – Query-Parameter Validation (status, sort, limit, etc.)

#### 5. Controller (`pendenzController.ts`)
- `listByProject` – GET `/api/projects/:projectId/pendenzen`
- `getById` – GET `/api/pendenzen/:id`
- `createInProject` – POST `/api/projects/:projectId/pendenzen`
- `update` – PATCH `/api/pendenzen/:id`
- `remove` – DELETE `/api/pendenzen/:id` (soft delete)
- `listHistorie` – GET `/api/pendenzen/:id/historie`

#### 6. Routes
- **Project-scoped:** In `routes/projects.ts` registriert
- **Standalone:** `routes/pendenzen.ts` → `routes/index.ts`
- Alle Routes hinter `requireUserId` + `loadUser` Middleware

#### 7. Tests (40 passing)
- **Service Tests (21):** CRUD, Pagination, Filtering, Sorting, Historie, Change Detection
- **Validator Tests (19):** Create/Update Body Validation, Query Parameter Validation

### Design-Entscheidungen

1. **Bestehende Users/Projects nutzen** statt separate `benutzer`/`projekte` Tabellen – weniger Redundanz, konsistent mit bestehendem Auth
2. **Spalten-Naming:** DB bleibt bei snake_case (mix DE/EN wie im Spec), API Response durchgängig camelCase
3. **Soft-Delete** via `archived_at` statt echtem DELETE
4. **Auto-increment `nr` pro Projekt** – einfacher als DB-Sequence, reicht für MVP
5. **Historie als eigene Tabelle** statt generischem audit_log – Spec fordert field-level tracking
6. **Sort via Mapping** statt raw SQL injection – Whitelist erlaubter Sort-Parameter

### Was fehlt / Phase 2

- [ ] Integration Tests (API-Level mit Supertest)
- [ ] Berechtigungs-Matrix (Monteur/Projektleiter/Admin)
- [ ] Frontend
- [ ] Offline-Sync
- [ ] Anhänge/Fotos
- [ ] Push-Benachrichtigungen
