# Nacht-Review 07.02.2026 – Wochenplan-Core (Iterationen 1-3)

> **Reviewer:** Sentinel (Nacht-Fabrik)  
> **Branch:** `nightly/07-02-wochenplan-core`  
> **Basis:** `main`  
> **Commits:** 3  
> **Datum:** 07.02.2026, 05:00-05:15 CET

---

## 1. Quantitative Zusammenfassung

| Metrik | Wert |
|--------|------|
| **Commits** | 3 (Iteration 1: Datenmodell+CRUD, Iteration 2: API+Frontend, Iteration 3: Fixes) |
| **Files geändert** | 34 |
| **Lines added** | 4'255 |
| **Lines removed** | 12 |
| **Neue Migrations** | 5 (033-037) |
| **Neue Services** | 3 (taskAssignmentService, wochenplanService, frontend/wochenplanService) |
| **Neue Controller** | 2 (taskAssignmentController, wochenplanController) |
| **Neue Models** | 2 (taskAssignment, resource/task extensions) |
| **Neue Validators** | 2 (taskAssignment, resource/task extensions) |
| **Neue Routes** | 2 (taskAssignments, wochenplan) |
| **Neue Frontend-Pages** | 1 (Wochenplan.tsx – 531 Zeilen) |
| **Test-Zeilen** | 1'023 (4 Test-Dateien) |
| **Test Cases** | 66 neue (im Branch), 239 gesamt passing |
| **TypeScript Errors** | 0 (Backend + Frontend) |
| **Test Failures** | 0 (alle 239 grün) |

---

## 2. Migration Review (033-037)

### 033_task_assignments.sql ✅
- Kern-Tabelle mit UUID PK, FKs zu tasks + resources mit CASCADE
- Unique Constraint: `(task_id, resource_id, assignment_date, half_day)` – korrekt
- Soft-Delete via `deleted_at` – konsistent mit Rest der App
- 3 Partial Indices (date, resource, task) – alle mit `WHERE deleted_at IS NULL`
- `updated_at` Trigger – sauber implementiert
- `half_day` CHECK: `morning/afternoon/full_day` – gute Modellierung

### 034_extend_resources.sql ✅
- 5 neue Spalten: department, employee_type, default_location, weekly_hours, skills
- `IF NOT EXISTS` Pattern – idempotent
- **Keine CHECK constraints** → behoben in 037

### 035_extend_projects.sql ✅
- 11 neue Spalten für Schreinerei-Daten (order_number, customer_name, etc.)
- Alle nullable – gut für Migration bestehender Daten
- `needs_callback BOOLEAN DEFAULT false` – nützliches Feature
- `sachbearbeiter VARCHAR(20)` – etwas knapp, aber reicht für Kürzel

### 036_production_phases.sql ✅
- Neuer ENUM-Type `production_phase` (6 Werte)
- `task_phase_schedules` Tabelle mit `(task_id, phase)` Unique Constraint
- Status-Tracking: planned/in_progress/completed/skipped
- `actual_start`/`actual_end` für Nachverfolgung
- Index auf `(planned_year, planned_kw)` – gut für Wochenplan-Queries

### 037_model_fixes.sql ✅ (Sehr gründlich)
- **6 separate Fixblöcke**, sauber dokumentiert mit Trennlinien
- `status_code` auf task_assignments mit CHECK constraint
- `short_code` auf resources mit Unique-Index (partial: NOT NULL + not deleted)
- `employee_type` CHECK erweitert um 'apprentice' (mit DROP/re-CREATE Pattern)
- `department` CHECK erweitert um 'buero'
- `phase_code`/`planned_week`/`planned_year` auf tasks mit Constraints + Indices
- ENUM-Erweiterung: transport, vorbehandlung, nachbehandlung
- **Exception Handling:** `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object` Pattern für Idempotenz

### Migration Reihenfolge ✅
Die 5 Migrationen können in der nummerischen Reihenfolge laufen:
- 033 → Erstellt `task_assignments` (referenziert `tasks` + `resources`)
- 034 → Erweitert `resources` (unabhängig)
- 035 → Erweitert `projects` (unabhängig)
- 036 → Erstellt `production_phase` ENUM + `task_phase_schedules` (referenziert `tasks`)
- 037 → Erweitert alle 3 Tabellen + ENUM (abhängig von 033, 034, 036)

**Keine Zirkulärabhängigkeiten.** ✅

### ⚠️ Offene Punkte Migrations
1. **StatusCode-Divergenz:** DB CHECK erlaubt `assigned/available/sick/vacation/training/other`, aber die shared Types auf `zukunftsvision` nutzen `FREI/FEI/KRANK/SCHULE/MILITAER/UNFALL/HO`. → **Entscheidung nötig: welches Schema?** Empfehlung: Englische Codes im Backend, Deutsche Labels im Frontend.
2. **employee_type Divergenz:** DB hat `internal/temporary/external_firm/pensioner/apprentice`, Sprint-Plan hatte `intern/lehrling/fremdmonteur/fremdfirma/pensionaer`. → **Englisch gewählt – richtige Entscheidung**, aber Sprint-Plan updaten.
3. **Keine `deleted_at` auf `task_phase_schedules`** – bewusst oder vergessen? Aktuell nur mit CASCADE von tasks.

---

## 3. Service Review

### taskAssignmentService.ts (243 Zeilen) ✅✅

**Stärken:**
- Saubere `SELECT_WITH_NAMES` Basis-Query mit 4-Table JOIN
- `createTaskAssignment` → Insert + Re-Fetch Pattern (konsistent mit Response-Contract)
- `updateTaskAssignment` → Dynamic field mapping mit sauberem parameterized Query Building
- `bulkCreateAssignments` → Echte Transaction (BEGIN/COMMIT/ROLLBACK mit `pool.connect()`)
- `listAssignments` → Flexible Filter-Komposition mit Pagination + Count-Query
- Soft-Delete konsistent überall (`deleted_at IS NULL`)

**Patterns:**
- ✅ Parameterized Queries (keine SQL Injection)
- ✅ Type-safe DTOs
- ✅ Null-Coalescing für optionale Felder
- ✅ Return-Types immer `TaskAssignmentWithNames` (inkl. JOINed Daten)

**Verbesserungspotential:**
- `bulkCreateAssignments` macht sequenzielle INSERTs in der Transaction. Bei vielen Dates (z.B. 31) wäre ein `INSERT ... VALUES (...), (...), (...)` Statement effizienter. Aber für den Normalfall (5 Tage = Mo-Fr) ist das OK.
- Kein `ON CONFLICT` Handling bei Bulk – Rollback ist korrekt, aber UX-seitig verliert man alle wenn eines scheitert.

### wochenplanService.ts (423 Zeilen) ✅✅

**Stärken:**
- Klare Architektur: 3 separate SQL-Queries statt Monster-JOIN
- `getWeekDateRange()` korrekt nach ISO 8601 (Jan 4 Methode)
- Intelligentes Department-Detection: Erst Phase-Schedule, dann Fallback auf Resource-Department
- `buildDayAssignments()` sauber: morning/afternoon/full_day korrekt aufgelöst
- Kapazitätsberechnung: `4.25h per half-day` (42.5h / 5 Tage / 2) – realistisch
- `PHASE_ORDER` konstante – konsistente Darstellung

**Architekturentscheidung: Alles in einem Service-Call** ✅
Der Endpoint liefert ALLES für eine KW in einem Response. Das ist richtig für diesen Use-Case (Wochenplan ist ein "Big Picture" View).

**Verbesserungspotential:**
- Die Phasen-Sortierung im SQL nutzt CASE WHEN mit hardcodierten Werten – nur 6 Phasen abgedeckt, aber ENUM hat jetzt 9 (transport, vorbehandlung, nachbehandlung fehlen im CASE).
- `getTaskDepartment()` fällt auf 'produktion' zurück wenn keine Phase matcht – OK als Default, aber besser wäre Resource-Department aus dem Assignment.
- Resource-Query lädt ALLE aktiven Personen – bei wachsender Firma OK, bei 100+ MA könnte man nach relevanten Departments filtern.

### Frontend wochenplanService.ts (81 Zeilen) ✅
- Minimalistisch und korrekt. Einziger Endpoint-Call mit Type-Safe Response.
- **Hinweis:** Types `DayAssignment` im Frontend fehlt `morningStatusCode`/`afternoonStatusCode` – die der Backend-Response liefert. → Frontend-Types nachtragen.

---

## 4. Controller Review

### taskAssignmentController.ts (347 Zeilen) ✅✅

**Stärken:**
- Konsistentes Pattern mit validationResult() Check + getUserId()
- **DB Error Codes:** `23505` (Unique Violation) → 409, `23503` (FK Violation) → 400 – exzellent
- Alle Endpoints nutzen `toTaskAssignmentResponse()` Transformer
- `bulkCreateForTask` iteriert über `assignments` Array – flexibler als single-task Bulk
- Auth Check in jedem Handler (auch wenn Middleware existiert)

**Verbesserungspotential:**
- `getUserId()` gibt `null` zurück wenn kein User, aber der Check passiert in jedem einzelnen Handler. Ein Middleware-Guard wäre DRYer (existiert bereits als `requireUserId`).
- Bulk-Endpoint macht sequenzielle `bulkCreateAssignments` Calls statt sie in einer Transaction zu bündeln – bei mehreren Assignments die verschiedene Tasks betreffen, sind das mehrere unabhängige Transactions.

### wochenplanController.ts (57 Zeilen) ✅
- Sauber und kompakt
- Default-KW Berechnung im Controller statt im Service – leicht debattierbar, aber OK
- Validierung: KW 1-53, Year 2020-2099

---

## 5. Frontend Review: Wochenplan.tsx (531 Zeilen)

### Architektur ✅
- **4 Components** in einer Datei: `Wochenplan`, `SectionTable`, `TaskRow`, `DayCell`
- Für den aktuellen Stand OK. Bei Wachstum in separate Files extrahieren.

### UI Features ✅
- KW-Navigation (Vor/Zurück/Dropdown)
- Jahr-Auswahl (10 Jahre Spanne)
- Datum-Range Anzeige
- **Per-Section Tables** mit Header (Department + Kapazität)
- **Phasen-KW-Badges** farbig hervorgehoben wenn aktuelle KW
- **Assignment-Chips** mit Initialen + Fixed/Outlined Variante
- **DayCell** Smart: Gleiche Person für VM+NM = 1 Chip, sonst 2 kleine Chips
- **Callback-Icon** (PhoneCallbackIcon) bei needsCallback
- **Color-Circle** für Farbspezifikation
- **Kapazitätsübersicht** mit LinearProgress Bars pro Department

### Fehlende Features / Verbesserungen
1. **Kein "Heute" Button** – schnelle Navigation zur aktuellen KW fehlt
2. **Kein URL-Sync** – KW/Year nicht in URL, Deep-Linking nicht möglich
3. **Keine Skeleton-Loading** – nur CircularProgress Spinner
4. **Keine Empty-State Illustration** für leere Sections
5. **StatusCode wird nicht angezeigt** im DayCell (morningStatusCode/afternoonStatusCode existieren im Backend aber Frontend Types fehlen diese Felder)
6. **`isValidColor()` hardcodiert** 31 CSS-Farbnamen – funktional, aber ein CSS `div` mit `color: X` test wäre robuster
7. **Responsive:** minWidth 1400 auf Table → Mobile nicht nutzbar (OK per Sprint-Definition)
8. **Keine Accessibility** Labels auf den Chips (screen-reader unfriendly)

### Code-Qualität ✅
- Sauberes TypeScript, keine `any`
- `useCallback` für fetchWeekPlan – korrekt
- `useEffect` dependency Array korrekt
- `getInitials()` Helper sauber (max 3 Chars)

---

## 6. Model/Type Konsistenz

### Backend ✅✅
- `taskAssignment.ts`: DTOs klar getrennt (Create, Update, Bulk, Response, WithNames)
- `resource.ts`: VALID_DEPARTMENTS + VALID_EMPLOYEE_TYPES als exportierte Arrays – gut für Validatoren
- `task.ts`: VALID_PHASE_CODES exportiert, PhaseCode Type definiert
- `toResourceResponse()` / `toTaskAssignmentResponse()` Transformer – konsistentes Pattern

### Frontend-Backend Sync ⚠️
- **WeekPlanResource** im Frontend fehlt `shortCode` (Backend liefert es)
- **DayAssignment** im Frontend fehlt `morningStatusCode`/`afternoonStatusCode`
- → Frontend Types müssen nachgezogen werden

---

## 7. Test Review

### Abdeckung ✅✅
| Test-Datei | Tests | Zeilen | Was wird getestet |
|------------|-------|--------|-------------------|
| taskAssignmentService.test.ts | 21 | 345 | CRUD, Pagination, Filters, Soft-Delete |
| bulkAssignmentService.test.ts | 5 | 232 | Transaction, Rollback, StatusCode, Single-Date |
| taskAssignmentValidator.test.ts | 27 | 227 | Create, Update, List Query Validation |
| bulkAssignmentValidator.test.ts | 13 | 219 | Bulk Array, UUIDs, Dates, StatusCodes |
| **Total** | **66** | **1'023** | |

### Qualität ✅
- Sauberes Mock-Setup mit `vi.mock`/`vi.mocked`
- Edge Cases: Empty update, non-existent IDs, parameter boundaries
- **Rollback-Test:** Prüft dass bei Bulk-Fehler ROLLBACK + client.release() aufgerufen wird
- **StatusCode-Durchlauf:** Alle gültigen Werte getestet
- **Validator-Tests:** Positive + Negative Cases für alle Felder

### Fehlende Tests ⚠️
1. **Kein Integration-Test** für die neuen Endpoints (nur Unit-Tests mit Mocks)
2. **Kein Test für wochenplanService** – der komplexeste Service hat 0 Tests
3. **Kein Test für wochenplanController** – ISO-Week-Berechnung ungetestet
4. **Kein Frontend-Test** (aber das ist für Read-Only MVP akzeptabel)

---

## 8. Zukunftsvision-Branch Review

### Branch: `zukunftsvision/architektur-v2`
**Umfang:** 15 Files, 3'417 Lines added

### Shared Types Kompatibilität ⚠️

| Aspekt | wochenplan-core | zukunftsvision | Kompatibel? |
|--------|----------------|----------------|-------------|
| Department Type | `string literal union` in resource.ts | `Department` type in common.ts | ✅ Gleiche Werte |
| EmployeeType | `'internal'\|'temporary'\|...` | `EmployeeType` in common.ts | ✅ Gleiche Werte |
| HalfDay | `'morning'\|'afternoon'\|'full_day'` | `HalfDay` in common.ts | ✅ Match |
| StatusCode | `'assigned'\|'available'\|'sick'\|...` | `'FREI'\|'FEI'\|'KRANK'\|...` | ❌ **DIVERGENZ** |
| ProductionPhase | ENUM in DB, string in TS | `PRODUCTION_PHASES` const | ⚠️ zukunftsvision hat nur 6, DB hat 9 |
| WeekPlanResponse | Inline types in service | Explizite Interfaces | ✅ Strukturell kompatibel |
| DayAssignment | Backend hat morningStatusCode | zukunftsvision hat nicht | ⚠️ Nachtragen |

**Hauptproblem:** StatusCode-Schema divergiert. Empfehlung: **Englisch im Backend** (assigned, sick, vacation...), **Deutsche Labels** nur im Frontend-Display.

### ARCHITECTURE.md ✅✅
- Feature-basierte Ordnerstruktur gut definiert
- Import-Regeln klar (Feature→Shared: ✅, Feature→Feature internals: ❌)
- Migrationsplan in 4 Phasen realistisch
- Dependency Graph zwischen Features sinnvoll
- **Passt zur Realität?** Ja – der aktuelle Code (flat pages/) ist der Ausgangspunkt, die Zielstruktur ist klar. Erste Schritte (shared/hooks, shared/types) bereits im Branch.

### Multi-Tenant-Strategie ✅
- RLS-basiert mit `tenant_id` auf allen Tabellen – **richtige Entscheidung**
- Supabase-Roadmap realistisch (Q3-Q4 2026)
- Migration Single→Multi gut durchdacht (nullable erst, dann NOT NULL)
- **Realistisch?** Ja, für den Zeitrahmen. Die Phasen sind inkrementell. Risiko ist Auth-Migration (Passwort-Reset).
- **Kompatibel mit aktueller Arbeit?** Ja – `owner_id` Pattern wird später durch `tenant_id` ergänzt/ersetzt.

### Zukunftsvision-Code Qualität ✅
- `useApi` Hook: Race-condition-safe mit fetchIdRef – professionell
- `useMutation` Hook: Sauberes Fire-and-Return Pattern
- `useWeekNavigation`: Korrekte ISO-Week Berechnung inkl. Week-53 Years
- `QueryBuilder`: Simpel aber effektiv, mit `count()` Method
- `BaseService`: Factory Pattern mit Config – gut für konsistente CRUD
- `EventBus`: Typed EventEmitter – gute Grundlage für Realtime

---

## 9. Architektur-Bewertung

### Was hervorragend ist 🌟
1. **Datenmodell** passt exakt zum Schreinerei-Wochenplan (Phasen, Halbtage, Departments)
2. **API-Design**: Wochenplan-Endpoint liefert alles in einem Call – Frontend braucht keinen Orchestration-Code
3. **Soft-Delete konsistent** überall – gut für Audit und Undo
4. **Migrations idempotent** (IF NOT EXISTS, DO $$ EXCEPTION Blocks)
5. **Test-First Approach** bei Services und Validatoren

### Was gut ist ✅
1. Backend-Schichtung (Model → Service → Controller → Route → Validator) konsequent durchgezogen
2. camelCase↔snake_case Transformation in Response-Mappern
3. Bulk-Operation mit echter DB-Transaction
4. Kapazitätsberechnung im Backend (nicht Frontend)

### Was verbessert werden sollte ⚠️
1. **wochenplanService hat keine Tests** – das ist der kritischste Service
2. **Frontend-Types unvollständig** (statusCode, shortCode fehlen)
3. **Phasen-CASE in SQL** deckt nicht alle ENUM-Werte ab
4. **Kein Caching** – bei vielen Usern wird derselbe Wochenplan N-mal berechnet
5. **Keine API-Versionierung** im aktuellen Code (zukunftsvision hat v1/-Plan)

---

## 10. Tech Debt Register

| # | Debt | Severity | Aufwand | Empfehlung |
|---|------|----------|---------|------------|
| 1 | wochenplanService ohne Tests | 🔴 Hoch | M (2-3h) | Nächste Iteration |
| 2 | Frontend-Types nicht sync mit Backend | 🟡 Mittel | S (30min) | Sofort |
| 3 | StatusCode Schema-Divergenz (EN vs DE) | 🟡 Mittel | S (1h) | Entscheidung treffen, zukunftsvision anpassen |
| 4 | Phasen-SQL CASE unvollständig (9 Phasen, 6 im CASE) | 🟡 Mittel | XS (15min) | Sofort |
| 5 | Kein Integration-Test für neue Endpoints | 🟡 Mittel | L (4-5h) | Phase 2 |
| 6 | Wochenplan.tsx monolithisch (531 Zeilen) | 🟢 Niedrig | M (1-2h) | Beim nächsten Feature-Add |
| 7 | Kein Caching Layer | 🟢 Niedrig | L (4-5h) | Phase 2 |
| 8 | deleted_at fehlt auf task_phase_schedules | 🟢 Niedrig | XS (5min) | Nächste Migration |
| 9 | "Heute" Button im Frontend fehlt | 🟢 Niedrig | XS (10min) | Nächste Frontend-Iteration |
| 10 | URL-Sync für KW/Year fehlt | 🟢 Niedrig | S (30min) | Nächste Frontend-Iteration |

---

## 11. Empfehlungen für Adi

### Sofort (vor Merge nach Main)
1. ✅ **TypeScript kompiliert** – keine Errors
2. ✅ **Alle Tests grün** – 239/239
3. ⚠️ **Frontend-Types nachtragen** (morningStatusCode, shortCode) – 30min
4. ⚠️ **Phasen-CASE im SQL erweitern** um transport/vorbehandlung/nachbehandlung – 15min

### Diese Woche
5. 🔴 **Tests für wochenplanService schreiben** – der Service ist zu wichtig um ungetestet zu sein
6. 🟡 **StatusCode-Entscheidung treffen**: Englisch (assigned/sick/vacation) oder Deutsch (FREI/KRANK/FEI)?
7. 🟡 **Testdaten einspielen** – Der Wochenplan macht ohne echte Aufträge/Mitarbeiter keinen Sinn visuell

### Nächste Iteration (Phase 2 Vorbereitung)
8. Click-to-Assign UI (das bringt den meisten Mehrwert nach dem Read-Only View)
9. Excel-Import vorbereiten (Stammdaten-Migration)
10. Integration-Tests für die neuen API-Endpoints

### Merge-Strategie
- **Branch ist merge-ready** nach Fix #3 und #4 (je 15-30min)
- Alternativ: Fixes als 4. Commit auf den Branch, dann mergen
- Zukunftsvision-Branch **NICHT mergen** – bleibt als Referenz-Branch

---

## 12. Priorisierte nächste Schritte

| Prio | Task | Aufwand | Warum |
|------|------|---------|-------|
| 1 | Frontend-Types fixen | XS | Bugs verhindern |
| 2 | Phasen-SQL CASE fixen | XS | Korrektheit |
| 3 | wochenplanService Tests | M | Sicherheitsnetz für den wichtigsten Service |
| 4 | Testdaten/Seed Script | M | Ohne Daten kann man die UI nicht beurteilen |
| 5 | Click-to-Assign (Task 4.1) | L | Größter Mehrwert nach Read-Only |
| 6 | "Heute" Button + URL-Sync | S | UX-Quick-Wins |
| 7 | StatusCode-Entscheidung | S | Blockiert zukunftsvision-Merge |
| 8 | Excel-Import Parser (Task 5.1) | XL | Datenmigration für Parallelbetrieb |

---

## 13. Fazit

**In 3 Iterationen wurde eine solide Grundlage für den Wochenplan gebaut.** Das Datenmodell ist durchdacht, die API-Schicht sauber geschichtet, und das Frontend zeigt eine brauchbare Read-Only Ansicht. 

**Stärke:** Die enge Orientierung am echten Schreinerei-Wochenplan (Phasen, Halbtage, Departments, Short-Codes) macht das Produkt sofort verständlich für die Zielgruppe.

**Risiko:** Der wochenplanService als komplexester Baustein hat keine Tests. Das sollte vor dem nächsten Feature-Sprint behoben werden.

**Tempo-Bewertung:** 4'255 Zeilen produktiver Code in 3 Iterationen (inkl. 1'023 Zeilen Tests) ist exzellent. Bei diesem Tempo sind die MVP-Phase-1-Tasks (Read-Only Wochenplan) **effektiv abgeschlossen** – es fehlt nur noch Testdaten und die kleinen Type-Fixes.

**Gesamtbewertung: 8.5/10** ⭐⭐⭐⭐
- Datenmodell: 9/10
- Backend-Code: 9/10
- Frontend-Code: 8/10
- Test-Abdeckung: 7/10 (wochenplanService fehlt)
- Architektur: 9/10
- Dokumentation: 8/10
