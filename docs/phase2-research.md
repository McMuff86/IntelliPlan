# Phase 2 Research Report

> Generated 2026-02-07 by research agent. Branch: `feature/wochenplan-phase2`

---

## 1. Backend Architecture

### 1.1 Patterns (Model / Service / Controller / Route / Validator)

#### Models (`backend/src/models/`)
- **Pure TypeScript interfaces** — no ORM. Each model file defines:
  1. **DB interface** (snake_case): e.g. `Project`, `Resource`, `Task` — maps 1:1 to DB columns
  2. **Response interface** (camelCase): e.g. `ProjectResponse`, `ResourceResponse` — API output
  3. **Create/Update DTOs** (snake_case): e.g. `CreateResourceDTO`, `UpdateResourceDTO`
  4. **`toXxxResponse()` mapper function**: converts DB row → API response
  5. **Type unions / enums**: e.g. `TaskStatus`, `Department`, `EmployeeType`, `PhaseCode`, `HalfDay`, `StatusCode`
  6. **Exported constants**: e.g. `VALID_DEPARTMENTS`, `VALID_EMPLOYEE_TYPES`, `VALID_STATUS_CODES`, `VALID_PHASE_CODES`
- Pattern: snake_case for DB, camelCase for API — mapper function bridges them.

#### Services (`backend/src/services/`)
- **Direct SQL via `pg` pool** — `import { pool } from '../config/database'`
- Parameterized queries with `$1, $2` syntax
- CRUD pattern:
  - `createXxx(data: CreateDTO): Promise<Row>` — `INSERT ... RETURNING *`
  - `listXxx(ownerId, options?): Promise<PaginatedResult<Row>>` — count + select with `LIMIT/OFFSET`
  - `getXxxById(id, ownerId): Promise<Row | null>` — `SELECT * WHERE id = $1 AND owner_id = $2`
  - `updateXxx(id, ownerId, data: UpdateDTO): Promise<Row | null>` — dynamic field builder: builds SET clause from non-undefined fields
  - `deleteXxx(id, ownerId): Promise<boolean>` — soft delete via `UPDATE SET deleted_at = NOW()` (projects, tasks, task_assignments) or hard delete (resources)
- Transactions: `pool.connect()` → `BEGIN` → queries → `COMMIT` / `ROLLBACK` → `client.release()`
- No shared base class or generic repository — each service is standalone

#### Controllers (`backend/src/controllers/`)
- Standard Express signature: `(req: Request, res: Response, next: NextFunction): Promise<void>`
- Pattern:
  1. `validationResult(req)` check → 400 if errors
  2. Extract `userId` from `req.user.id` (set by middleware)
  3. Call service function(s)
  4. Return `res.status(xxx).json({ success: true/false, data: ... })` 
  5. `catch` → `next(error)` for centralized error handling
- Response envelope: always `{ success: boolean, data?: ..., error?: string, errors?: [...] }`
- Pagination response: `{ success, data, pagination: { total, limit, offset } }`

#### Routes (`backend/src/routes/`)
- Express Router instances
- Authentication: `router.use(requireUserId)` + `router.use(loadUser)` at top of every route file
- Validation: inline array of `express-validator` chains per route
- Route naming: RESTful (`GET /`, `POST /`, `GET /:id`, `PUT /:id`, `DELETE /:id`)
- Nested resources: e.g. `GET /api/tasks/:taskId/assignments`, `POST /api/projects/:projectId/tasks`
- All routes registered in `routes/index.ts` under `/api` prefix

#### Validators (`backend/src/validators/`)
- Arrays of `ValidationChain[]` from `express-validator`
- Pattern: `body('fieldName').optional()/notEmpty().isXxx().withMessage('...')`
- Custom validators for cross-field checks (e.g. date range max 31 days in capacityValidator)
- Reuse model constants: `isIn(VALID_DEPARTMENTS)`, `isIn(VALID_STATUS_CODES)`
- Separate create vs update validators (update has all fields optional)

### 1.2 Dependencies & Libraries

| Library | Purpose |
|---------|---------|
| `express` | HTTP framework |
| `pg` (node-postgres) | PostgreSQL driver — direct SQL, NO ORM |
| `express-validator` | Request validation |
| `jsonwebtoken` | JWT authentication |
| `bcryptjs` | Password hashing |
| `helmet` | Security headers |
| `cors` | CORS middleware |
| `express-rate-limit` | Rate limiting |
| `pino` / `pino-http` | Structured logging |
| `date-fns` | Date utilities |
| `exceljs` | Excel import/export |
| `multer` | File uploads |
| `nodemailer` | Email sending |
| `vitest` | Test framework |
| `supertest` | HTTP integration testing |

### 1.3 Authentication & RBAC

- **JWT-based**: Bearer token in Authorization header
- **Middleware chain**: `requireUserId` → `loadUser` (on every route file)
  - `requireUserId`: extracts userId from JWT, validates UUID format, checks token blacklist
  - `loadUser`: fetches full User record from DB, attaches to `req.user`
- **Roles**: `admin | single | team | projektleiter | monteur | lehrling`
- **RBAC**: `permissions` table + `role_permissions` mapping table (migration 027)
- **Permission middleware**: `requirePermission('projects:write')` — but currently **NOT used** on routes (routes use `requireUserId` + `loadUser` only; ownership-based access via `owner_id` in queries)
- **User ownership**: most queries filter by `owner_id = $userId` — multi-tenant isolation

---

## 2. Existing Wochenplan Code

### 2.1 Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/wochenplan?kw=6&year=2026` | Get weekly plan for a specific ISO week |
| `GET` | `/api/capacity?from=...&to=...` | Capacity overview (all departments) |
| `GET` | `/api/capacity/department/:dept?from=...&to=...` | Capacity for single department |
| `GET` | `/api/capacity/resource/:id?from=...&to=...` | Capacity for single resource |
| `GET` | `/api/assignments?from=...&to=...&resource_id=...` | List assignments (global query) |
| `POST` | `/api/assignments/bulk` | Bulk create assignments |
| `GET` | `/api/assignments/:id` | Get single assignment |
| `PUT` | `/api/assignments/:id` | Update assignment |
| `DELETE` | `/api/assignments/:id` | Delete (soft) assignment |
| `GET` | `/api/tasks/:taskId/assignments` | Assignments for a task |
| `POST` | `/api/tasks/:taskId/assignments` | Create assignment for task |
| `GET` | `/api/resources/:resourceId/assignments?from=...&to=...` | Assignments for a resource |

### 2.2 Data Flow

**Wochenplan GET flow:**
1. Controller receives `kw` + `year` (defaults to current week)
2. `wochenplanService.getWeekPlan(kw, year)`:
   - Calculates Monday–Friday date range from ISO week
   - **Q1**: Fetches tasks via JOIN: `tasks` ← `projects` ← `task_phase_schedules` ← `task_assignments` — WHERE phase matches KW OR assignment falls in date range
   - **Q2**: Fetches all `task_phase_schedules` for found task IDs
   - **Q3**: Fetches all `task_assignments` for found task IDs in date range (with resource JOINs)
   - **Q4**: Fetches all active person resources grouped by department
   - Groups tasks into 8 department sections based on which phase is scheduled for the requested KW
   - Builds day assignments (Mon–Fri) with morning/afternoon/full_day detail per task
   - Calculates capacity summary (available hours from resources, planned hours from assignments at 4.25h per half-day)
3. Returns `WeekPlanResponse` with sections, resources, capacity summary

**Key data structures:**
- `WeekPlanResponse`: top-level with `kw`, `year`, `dateRange`, `sections[]`, `capacitySummary`
- `Section`: per department — tasks + resources + totalHours
- `WeekPlanTask`: project info (order number, customer, etc.) + phases + day assignments + remarks
- `DayAssignment`: per weekday — morning/afternoon resource name, status codes, detail objects, isFixed, notes

**Assignment CRUD flow:**
- Create: POST to `/tasks/:taskId/assignments` with `resourceId`, `assignmentDate`, `halfDay`, etc.
- Service creates row, then re-fetches with JOIN to get names
- Bulk create: wraps in transaction, creates one row per date
- Update/Delete: by assignment ID, soft delete via `deleted_at`

**Capacity flow:**
- Loads resources (optionally filtered by department)
- Loads assignments in date range
- Calculates daily available/assigned hours per resource
- Detects overbooking (assigned > available on any day)
- Aggregates per department and overall

### 2.3 Test Coverage

**Wochenplan tests** (`wochenplanService.test.ts`): 29 tests
- Date range calculation (KW 1 boundary, KW 53, leap year, Mon-Fri)
- Empty week handling (8 sections, zero utilization)
- Task placement in correct department sections (phase-based)
- Day assignments: morning, afternoon, full_day, null (FREI)
- Short code preference over resource name
- Status codes (sick, vacation)
- Fixed assignments, notes concatenation
- Multi-resource, bulk assignments
- Resource grouping by department
- Capacity calculation (available hours, planned hours at 4.25h/half-day, utilization %)
- Task field mapping (all project fields)
- Edge cases (SQL parameters, soft delete filters)

**Capacity tests** (`capacityService.test.ts`): 16 tests
- Pure helper tests: `getWeekdaysBetween`, `halfDayToHours`
- Empty overview, single resource capacity, full week utilization
- Overbooking detection (daily + weekly)
- Half-day calculations, department filter
- Different weekly hours, multi-department totals
- Day names, default weekly hours (42.5)
- Department capacity, resource capacity, null handling

**Capacity validator tests** (`capacityValidator.test.ts`): 7 tests
- Valid from/to, missing fields, invalid dates, date ordering, max 31-day range, department/UUID validation

**Total: ~52 tests** covering wochenplan + capacity

---

## 3. Frontend Architecture

### 3.1 Stack & Patterns

| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 19.2 | UI framework |
| TypeScript | 5.x | Type safety |
| Vite | - | Build tool |
| MUI (Material UI) | 7.3 | Component library |
| React Router | 7.12 | Routing |
| react-hook-form | 7.71 | Form handling |
| axios | 1.13 | HTTP client |
| date-fns | 4.1 | Date utilities |
| FullCalendar | 6.1 | Calendar views |
| jsPDF | 4.0 | PDF generation |

### 3.2 API Integration

- **Centralized `api.ts`**: axios instance with `baseURL = VITE_API_URL || 'http://localhost:3001/api'`
- **Request interceptor**: attaches `Bearer ${token}` from `localStorage`
- **Response interceptor**: auto-refresh JWT on 401 (with request queue during refresh)
- **Service pattern**: each entity has a service file (e.g. `wochenplanService.ts`, `capacityService.ts`, `assignmentService.ts`, `projectService.ts`)
  - Each service: `{ async method(params): Promise<T> { api.get/post... } }`
  - Response unwrapping: `response.data.data` (double-data from `{ success, data }` envelope)
- **Shared types**: `frontend/src/types/index.ts` — TypeScript interfaces for all entities (API response shape)
- **Separate frontend types** for wochenplan/capacity/assignment services (duplicated from backend response types)

### 3.3 Component Structure

- **Pages**: `frontend/src/pages/` — route-level components (Wochenplan, Capacity, Projects, etc.)
- **Components**: `frontend/src/components/` — reusable UI (each in named folder with `index.ts` barrel export)
  - Wochenplan-specific: `components/wochenplan/AssignmentDialog.tsx`
- **Contexts**: `AuthContext.tsx` for auth state
- **Hooks**: custom hooks (e.g. `useThemePreference`)
- **State management**: React `useState` + `useCallback` + `useEffect` — no Redux/Zustand
- **Form handling**: react-hook-form for complex forms, plain state for simple ones
- **Styling**: MUI `sx` prop, MUI theme system (light + codex themes)

**Wochenplan page structure:**
- `Wochenplan.tsx`: main page with KW/year selector, renders `SectionTable` per department
- `SectionTable`: MUI Table with task rows, phase chips, day cells
- `DayCell`: interactive morning/afternoon chips (click to assign)
- `AssignmentDialog`: modal for create/edit/delete assignments
- Data flow: `fetchWeekPlan()` → `wochenplanService.getWeekPlan(kw, year)` → state → render

---

## 4. Gap Analysis: DB vs Code

### 4.1 Projects: DB columns vs Model fields

**DB columns** (from migrations 004, 016, 017, 025, 035):

| Column | Type | Migration | In Model? | In Service? | In API? |
|--------|------|-----------|-----------|-------------|---------|
| `id` | UUID PK | 004 | ✅ | ✅ | ✅ |
| `name` | VARCHAR(255) | 004 | ✅ | ✅ | ✅ |
| `description` | TEXT | 004 | ✅ | ✅ | ✅ |
| `owner_id` | UUID FK | 004 | ✅ | ✅ | ✅ |
| `include_weekends` | BOOLEAN | 004 | ✅ | ✅ | ✅ |
| `workday_start` | TIME | 004 | ✅ | ✅ | ✅ |
| `workday_end` | TIME | 004 | ✅ | ✅ | ✅ |
| `work_template` | VARCHAR(50) | 016 | ✅ | ✅ | ✅ |
| `task_template_id` | UUID FK | 025 | ✅ | ✅ | ✅ |
| `deleted_at` | TIMESTAMPTZ | 017 | ✅ | ✅ | ✅ |
| `created_at` | TIMESTAMPTZ | 004 | ✅ | ✅ | ✅ |
| `updated_at` | TIMESTAMPTZ | 004 | ✅ | ✅ | ✅ |
| **`order_number`** | VARCHAR(50) | **035** | ❌ | ❌ | ❌ |
| **`customer_name`** | VARCHAR(200) | **035** | ❌ | ❌ | ❌ |
| **`installation_location`** | VARCHAR(200) | **035** | ❌ | ❌ | ❌ |
| **`color`** | VARCHAR(100) | **035** | ❌ | ❌ | ❌ |
| **`contact_name`** | VARCHAR(200) | **035** | ❌ | ❌ | ❌ |
| **`contact_phone`** | VARCHAR(50) | **035** | ❌ | ❌ | ❌ |
| **`needs_callback`** | BOOLEAN | **035** | ❌ | ❌ | ❌ |
| **`sachbearbeiter`** | VARCHAR(20) | **035** | ❌ | ❌ | ❌ |
| **`worker_count`** | NUMERIC(4,1) | **035** | ❌ | ❌ | ❌ |
| **`helper_count`** | NUMERIC(4,1) | **035** | ❌ | ❌ | ❌ |
| **`remarks`** | TEXT | **035** | ❌ | ❌ | ❌ |

**⚠️ 11 columns from migration 035 exist in DB but are NOT in the Project model, service, or API.**
The wochenplanService queries these columns directly via raw SQL JOINs — they work at DB level but are NOT exposed through the project CRUD API.

### 4.2 Resources: DB columns vs Model fields

**DB columns** (from migrations 011, 034, 037):

| Column | Type | Migration | In Model? | In Service? | In API? |
|--------|------|-----------|-----------|-------------|---------|
| `id` | UUID PK | 011 | ✅ | ✅ | ✅ |
| `owner_id` | UUID FK | 011 | ✅ | ✅ | ✅ |
| `name` | VARCHAR(255) | 011 | ✅ | ✅ | ✅ |
| `resource_type` | VARCHAR(50) | 011 | ✅ | ✅ | ✅ |
| `description` | TEXT | 011 | ✅ | ✅ | ✅ |
| `is_active` | BOOLEAN | 011 | ✅ | ✅ | ✅ |
| `availability_enabled` | BOOLEAN | 011 | ✅ | ✅ | ✅ |
| `created_at` | TIMESTAMPTZ | 011 | ✅ | ✅ | ✅ |
| `updated_at` | TIMESTAMPTZ | 011 | ✅ | ✅ | ✅ |
| `department` | VARCHAR(50) | 034 | ✅ | ✅ | ✅ |
| `employee_type` | VARCHAR(30) | 034 | ✅ | ✅ | ✅ |
| `default_location` | VARCHAR(200) | 034 | ✅ | ✅ | ✅ |
| `weekly_hours` | NUMERIC(4,1) | 034 | ✅ | ✅ | ✅ |
| `skills` | TEXT[] | 034 | ✅ | ✅ | ✅ |
| `short_code` | VARCHAR(20) | 037 | ✅ | ✅ | ✅ |
| `deleted_at` | — | — | ❌ (not in model) | Referenced in WHERE | — |

**✅ All resource columns from migrations 034+037 are properly exposed in model, service, and API.**

Note: `deleted_at` column is referenced in service queries (`WHERE deleted_at IS NULL`) but:
- No migration adds `deleted_at` to resources table explicitly
- The Resource model interface does NOT include `deleted_at`
- `deleteResource()` does hard DELETE, not soft delete
- Some queries (like `getResourceByShortCode`, `getResourcesByDepartment`) filter by `deleted_at IS NULL` — this works because the column doesn't exist in the migration and `IS NULL` on a non-existent column would error. **This is either from a migration not checked in, or these queries would fail.** Investigation needed.

### 4.3 Tasks: DB columns vs Model fields

**DB columns** (from migrations 005, 009, 010, 012, 015, 017, 037):

| Column | Type | Migration | In Model? | In Service? | In API? |
|--------|------|-----------|-----------|-------------|---------|
| `id` | UUID PK | 005 | ✅ | ✅ | ✅ |
| `project_id` | UUID FK | 005 | ✅ | ✅ | ✅ |
| `owner_id` | UUID FK | 005 | ✅ | ✅ | ✅ |
| `title` | VARCHAR(255) | 005 | ✅ | ✅ | ✅ |
| `description` | TEXT | 005 | ✅ | ✅ | ✅ |
| `status` | VARCHAR(20) | 005 | ✅ | ✅ | ✅ |
| `scheduling_mode` | VARCHAR(20) | 005 | ✅ | ✅ | ✅ |
| `duration_minutes` | INTEGER | 005 | ✅ | ✅ | ✅ |
| `start_date` | DATE | 005 | ✅ | ✅ | ✅ |
| `due_date` | DATE | 005 | ✅ | ✅ | ✅ |
| `resource_label` | VARCHAR(255) | 010 | ✅ | ✅ | ✅ |
| `resource_id` | UUID FK | 012 | ✅ | ✅ | ✅ |
| `reminder_enabled` | BOOLEAN | 015 | ✅ | ✅ | ✅ |
| `deleted_at` | TIMESTAMPTZ | 017 | ✅ (implicit) | ✅ | — |
| `phase_code` | VARCHAR(20) | 037 | ✅ | ✅ | ✅ |
| `planned_week` | INTEGER | 037 | ✅ | ✅ | ✅ |
| `planned_year` | INTEGER | 037 | ✅ | ✅ | ✅ |

**✅ All task columns are properly exposed.**

### 4.4 task_assignments: DB columns vs Model fields

**DB columns** (from migrations 033, 037):

| Column | Type | Migration | In Model? | In Service? | In API? |
|--------|------|-----------|-----------|-------------|---------|
| `id` | UUID PK | 033 | ✅ | ✅ | ✅ |
| `task_id` | UUID FK | 033 | ✅ | ✅ | ✅ |
| `resource_id` | UUID FK | 033 | ✅ | ✅ | ✅ |
| `assignment_date` | DATE | 033 | ✅ | ✅ | ✅ |
| `half_day` | VARCHAR(10) | 033 | ✅ | ✅ | ✅ |
| `notes` | TEXT | 033 | ✅ | ✅ | ✅ |
| `is_fixed` | BOOLEAN | 033 | ✅ | ✅ | ✅ |
| `start_time` | TIME | 033 | ✅ | ✅ | ✅ |
| `created_at` | TIMESTAMPTZ | 033 | ✅ | ✅ | ✅ |
| `updated_at` | TIMESTAMPTZ | 033 | ✅ | ✅ | ✅ |
| `deleted_at` | TIMESTAMPTZ | 033 | ✅ | ✅ | — (filtered) |
| `status_code` | VARCHAR(20) | 037 | ✅ | ✅ | ✅ |

**✅ All task_assignment columns are properly exposed.**

### 4.5 task_phase_schedules: DB vs Code

**DB columns** (from migration 036):

| Column | Type | In Code? |
|--------|------|----------|
| `id` | UUID PK | ❌ No model file |
| `task_id` | UUID FK | Queried in wochenplanService |
| `phase` | production_phase ENUM | Queried in wochenplanService |
| `planned_kw` | INTEGER | Queried in wochenplanService |
| `planned_year` | INTEGER | Queried in wochenplanService |
| `actual_start` | DATE | ❌ Not queried |
| `actual_end` | DATE | ❌ Not queried |
| `status` | VARCHAR(20) | ❌ Not queried |

**⚠️ No model, service, controller, or routes exist for `task_phase_schedules`.** It is only queried directly by the wochenplanService via raw SQL. There is **NO CRUD API** for managing phase schedules — they can only be read through the wochenplan endpoint. This is a major gap for Phase 2.

---

## 5. Current Database Schema

### 5.1 All Tables

#### `teams` (001)
```
id          UUID PK DEFAULT gen_random_uuid()
name        VARCHAR(255) NOT NULL
created_at  TIMESTAMPTZ DEFAULT NOW()
```

#### `users` (002, 013, 014, 024)
```
id                              UUID PK DEFAULT gen_random_uuid()
email                           VARCHAR(255) UNIQUE NOT NULL
name                            VARCHAR(255) NOT NULL
role                            VARCHAR(50) NOT NULL CHECK (admin|single|team|projektleiter|monteur|lehrling)
team_id                         UUID FK → teams(id) ON DELETE SET NULL
timezone                        VARCHAR(100) DEFAULT 'UTC'
password_hash                   TEXT
email_verified_at               TIMESTAMPTZ
email_verification_token        TEXT
email_verification_expires_at   TIMESTAMPTZ
password_reset_token            TEXT
password_reset_expires_at       TIMESTAMPTZ
industry_id                     UUID FK → industries(id) ON DELETE SET NULL
created_at                      TIMESTAMPTZ DEFAULT NOW()
updated_at                      TIMESTAMPTZ DEFAULT NOW()
```

#### `appointments` (003)
```
id           UUID PK DEFAULT gen_random_uuid()
title        VARCHAR(255) NOT NULL
description  TEXT
start_time   TIMESTAMPTZ NOT NULL
end_time     TIMESTAMPTZ NOT NULL
timezone     VARCHAR(100) NOT NULL DEFAULT 'UTC'
user_id      UUID FK → users(id) ON DELETE CASCADE NOT NULL
created_at   TIMESTAMPTZ DEFAULT NOW()
updated_at   TIMESTAMPTZ DEFAULT NOW()
deleted_at   TIMESTAMPTZ
CHECK (end_time > start_time)
```

#### `projects` (004, 016, 017, 025, 035)
```
id                      UUID PK DEFAULT gen_random_uuid()
name                    VARCHAR(255) NOT NULL
description             TEXT
owner_id                UUID FK → users(id) ON DELETE CASCADE NOT NULL
include_weekends        BOOLEAN NOT NULL DEFAULT TRUE
workday_start           TIME NOT NULL DEFAULT '08:00'
workday_end             TIME NOT NULL DEFAULT '17:00'
work_template           VARCHAR(50) NOT NULL DEFAULT 'weekday_8_17'
task_template_id        UUID FK → task_templates(id) ON DELETE SET NULL
deleted_at              TIMESTAMPTZ
-- ↓ Migration 035 fields (NOT in model/API):
order_number            VARCHAR(50)
customer_name           VARCHAR(200)
installation_location   VARCHAR(200)
color                   VARCHAR(100)
contact_name            VARCHAR(200)
contact_phone           VARCHAR(50)
needs_callback          BOOLEAN DEFAULT false
sachbearbeiter          VARCHAR(20)
worker_count            NUMERIC(4,1)
helper_count            NUMERIC(4,1)
remarks                 TEXT
created_at              TIMESTAMPTZ DEFAULT NOW()
updated_at              TIMESTAMPTZ DEFAULT NOW()
```

#### `tasks` (005, 010, 012, 015, 017, 037)
```
id                UUID PK DEFAULT gen_random_uuid()
project_id        UUID FK → projects(id) ON DELETE CASCADE NOT NULL
owner_id          UUID FK → users(id) ON DELETE CASCADE NOT NULL
title             VARCHAR(255) NOT NULL
description       TEXT
status            VARCHAR(20) NOT NULL DEFAULT 'planned' CHECK (planned|in_progress|blocked|done)
scheduling_mode   VARCHAR(20) NOT NULL DEFAULT 'manual' CHECK (manual|auto)
duration_minutes  INTEGER
resource_label    VARCHAR(255)
resource_id       UUID FK → resources(id) ON DELETE SET NULL
start_date        DATE
due_date          DATE
reminder_enabled  BOOLEAN NOT NULL DEFAULT false
deleted_at        TIMESTAMPTZ
phase_code        VARCHAR(20) CHECK (ZUS|CNC|PROD|VORBEH|NACHBEH|BESCHL|TRANS|MONT)
planned_week      INTEGER CHECK (1-53)
planned_year      INTEGER
created_at        TIMESTAMPTZ DEFAULT NOW()
updated_at        TIMESTAMPTZ DEFAULT NOW()
```

#### `task_dependencies` (006)
```
id                  UUID PK DEFAULT gen_random_uuid()
task_id             UUID FK → tasks(id) ON DELETE CASCADE NOT NULL
depends_on_task_id  UUID FK → tasks(id) ON DELETE CASCADE NOT NULL
dependency_type     VARCHAR(20) NOT NULL CHECK (finish_start|start_start|finish_finish)
created_at          TIMESTAMPTZ DEFAULT NOW()
CHECK (task_id <> depends_on_task_id)
UNIQUE (task_id, depends_on_task_id, dependency_type)
```

#### `task_work_slots` (007, 009, 015)
```
id                UUID PK DEFAULT gen_random_uuid()
task_id           UUID FK → tasks(id) ON DELETE CASCADE NOT NULL
start_time        TIMESTAMPTZ NOT NULL
end_time          TIMESTAMPTZ NOT NULL
is_fixed          BOOLEAN NOT NULL DEFAULT FALSE
is_all_day        BOOLEAN NOT NULL DEFAULT FALSE
reminder_enabled  BOOLEAN NOT NULL DEFAULT false
created_at        TIMESTAMPTZ DEFAULT NOW()
updated_at        TIMESTAMPTZ DEFAULT NOW()
CHECK (end_time > start_time)
```

#### `project_activity` (008)
```
id              UUID PK DEFAULT gen_random_uuid()
project_id      UUID FK → projects(id) ON DELETE CASCADE NOT NULL
actor_user_id   UUID FK → users(id) ON DELETE SET NULL
entity_type     VARCHAR(20) NOT NULL CHECK (project|task|work_slot|dependency)
action          VARCHAR(50) NOT NULL
summary         TEXT NOT NULL
metadata        JSONB
created_at      TIMESTAMPTZ DEFAULT NOW()
```

#### `resources` (011, 034, 037)
```
id                    UUID PK DEFAULT gen_random_uuid()
owner_id              UUID FK → users(id) ON DELETE CASCADE NOT NULL
name                  VARCHAR(255) NOT NULL
resource_type         VARCHAR(50) NOT NULL CHECK (person|machine|vehicle)
description           TEXT
is_active             BOOLEAN NOT NULL DEFAULT TRUE
availability_enabled  BOOLEAN NOT NULL DEFAULT FALSE
department            VARCHAR(50) CHECK (zuschnitt|cnc|produktion|behandlung|beschlaege|transport|montage|buero)
employee_type         VARCHAR(30) DEFAULT 'internal' CHECK (internal|temporary|external_firm|pensioner|apprentice)
default_location      VARCHAR(200)
weekly_hours          NUMERIC(4,1) DEFAULT 42.5
skills                TEXT[]
short_code            VARCHAR(20) — UNIQUE WHERE NOT NULL AND deleted_at IS NULL
created_at            TIMESTAMPTZ DEFAULT NOW()
updated_at            TIMESTAMPTZ DEFAULT NOW()
```
*Note: No `deleted_at` column in migrations, but it's referenced in indexes and queries.*

#### `task_assignments` (033, 037)
```
id               UUID PK DEFAULT gen_random_uuid()
task_id          UUID FK → tasks(id) ON DELETE CASCADE NOT NULL
resource_id      UUID FK → resources(id) ON DELETE CASCADE NOT NULL
assignment_date  DATE NOT NULL
half_day         VARCHAR(10) NOT NULL CHECK (morning|afternoon|full_day)
notes            TEXT
is_fixed         BOOLEAN DEFAULT false
start_time       TIME
status_code      VARCHAR(20) DEFAULT 'assigned' CHECK (assigned|available|sick|vacation|training|other)
created_at       TIMESTAMPTZ DEFAULT NOW()
updated_at       TIMESTAMPTZ DEFAULT NOW()
deleted_at       TIMESTAMPTZ
UNIQUE(task_id, resource_id, assignment_date, half_day)
TRIGGER: auto-update updated_at
```

#### `task_phase_schedules` (036)
```
id            UUID PK DEFAULT gen_random_uuid()
task_id       UUID FK → tasks(id) ON DELETE CASCADE NOT NULL
phase         production_phase ENUM NOT NULL
planned_kw    INTEGER
planned_year  INTEGER
actual_start  DATE
actual_end    DATE
status        VARCHAR(20) DEFAULT 'planned' CHECK (planned|in_progress|completed|skipped)
created_at    TIMESTAMPTZ DEFAULT NOW()
updated_at    TIMESTAMPTZ DEFAULT NOW()
UNIQUE(task_id, phase)
TRIGGER: auto-update updated_at
```

ENUM `production_phase`: `zuschnitt | cnc | produktion | behandlung | beschlaege | montage | transport | vorbehandlung | nachbehandlung`

#### `reminders` (018)
```
id              UUID PK DEFAULT gen_random_uuid()
appointment_id  UUID FK → appointments(id) ON DELETE CASCADE NOT NULL
user_id         UUID FK → users(id) NOT NULL
remind_at       TIMESTAMPTZ NOT NULL
reminder_type   VARCHAR(20) NOT NULL DEFAULT 'relative'
offset_minutes  INTEGER
status          VARCHAR(20) NOT NULL DEFAULT 'pending'
created_at      TIMESTAMPTZ DEFAULT NOW()
updated_at      TIMESTAMPTZ DEFAULT NOW()
```

#### `working_time_templates` (019)
```
id          UUID PK DEFAULT gen_random_uuid()
name        VARCHAR(100) NOT NULL
user_id     UUID FK → users(id) NOT NULL
is_default  BOOLEAN NOT NULL DEFAULT FALSE
created_at  TIMESTAMPTZ DEFAULT NOW()
updated_at  TIMESTAMPTZ DEFAULT NOW()
```

#### `working_time_slots` (019)
```
id           UUID PK DEFAULT gen_random_uuid()
template_id  UUID FK → working_time_templates(id) ON DELETE CASCADE NOT NULL
day_of_week  INTEGER NOT NULL CHECK (0-6)
start_time   TIME NOT NULL
end_time     TIME NOT NULL
CHECK (end_time > start_time)
```

#### `audit_logs` (020)
```
id           UUID PK DEFAULT gen_random_uuid()
user_id      UUID FK → users(id) ON DELETE SET NULL
action       VARCHAR(100) NOT NULL
entity_type  VARCHAR(50)
entity_id    UUID
ip_address   VARCHAR(45)
user_agent   TEXT
metadata     JSONB DEFAULT '{}'
created_at   TIMESTAMPTZ DEFAULT NOW()
```

#### `industries` (021, 028)
```
id          UUID PK DEFAULT gen_random_uuid()
name        VARCHAR(255) NOT NULL UNIQUE
description TEXT
icon        VARCHAR(50)
settings    JSONB NOT NULL DEFAULT '{}'
created_at  TIMESTAMPTZ DEFAULT NOW()
updated_at  TIMESTAMPTZ DEFAULT NOW()
```

#### `product_types` (022, 028)
```
id           UUID PK DEFAULT gen_random_uuid()
industry_id  UUID FK → industries(id) ON DELETE CASCADE NOT NULL
name         VARCHAR(255) NOT NULL
description  TEXT
icon         VARCHAR(50)
is_active    BOOLEAN NOT NULL DEFAULT true
created_at   TIMESTAMPTZ DEFAULT NOW()
updated_at   TIMESTAMPTZ DEFAULT NOW()
UNIQUE (industry_id, name)
```

#### `task_templates` (023, 028)
```
id               UUID PK DEFAULT gen_random_uuid()
product_type_id  UUID FK → product_types(id) ON DELETE CASCADE NOT NULL
name             VARCHAR(255) NOT NULL
description      TEXT
tasks            JSONB NOT NULL DEFAULT '[]'
is_default       BOOLEAN NOT NULL DEFAULT false
is_system        BOOLEAN NOT NULL DEFAULT false
owner_id         UUID FK → users(id) ON DELETE SET NULL
created_at       TIMESTAMPTZ DEFAULT NOW()
updated_at       TIMESTAMPTZ DEFAULT NOW()
UNIQUE (product_type_id, name)
```

#### `pendenzen` (026)
```
id                 UUID PK DEFAULT gen_random_uuid()
project_id         UUID FK → projects(id) ON DELETE CASCADE NOT NULL
nr                 INTEGER NOT NULL
beschreibung       TEXT NOT NULL
bereich            pendenz_bereich ENUM NOT NULL
verantwortlich_id  UUID FK → users(id) ON DELETE SET NULL
erfasst_von_id     UUID FK → users(id) ON DELETE RESTRICT NOT NULL
prioritaet         pendenz_prioritaet ENUM NOT NULL DEFAULT 'mittel'
status             pendenz_status ENUM NOT NULL DEFAULT 'offen'
faellig_bis        DATE
erledigt_am        DATE
bemerkungen        TEXT
auftragsnummer     VARCHAR(50)
kategorie          pendenz_kategorie ENUM NOT NULL DEFAULT 'projekt'
created_at         TIMESTAMPTZ DEFAULT NOW()
updated_at         TIMESTAMPTZ DEFAULT NOW()
archived_at        TIMESTAMPTZ
UNIQUE (project_id, nr)
TRIGGER: auto-update updated_at
```

#### `pendenzen_historie` (026)
```
id          UUID PK DEFAULT gen_random_uuid()
pendenz_id  UUID FK → pendenzen(id) ON DELETE CASCADE NOT NULL
user_id     UUID FK → users(id) ON DELETE SET NULL
aktion      VARCHAR(50) NOT NULL
feld        VARCHAR(100)
alter_wert  TEXT
neuer_wert  TEXT
created_at  TIMESTAMPTZ DEFAULT NOW()
```

#### `permissions` (027)
```
id          UUID PK DEFAULT gen_random_uuid()
name        VARCHAR(100) NOT NULL UNIQUE
description TEXT
created_at  TIMESTAMPTZ DEFAULT NOW()
```

#### `role_permissions` (027)
```
role           VARCHAR(50) NOT NULL
permission_id  UUID FK → permissions(id) ON DELETE CASCADE NOT NULL
PRIMARY KEY (role, permission_id)
```

### 5.2 Key Relationships

```
users ──< projects (owner_id)
users ──< resources (owner_id)
users ──< appointments (user_id)
users ──< audit_logs (user_id)
users ──< reminders (user_id)
users ──< working_time_templates (user_id)
users ──< pendenzen (erfasst_von_id, verantwortlich_id)
users ──  industries (industry_id)
teams ──< users (team_id)

projects ──< tasks (project_id)
projects ──< project_activity (project_id)
projects ──< pendenzen (project_id)
projects ──  task_templates (task_template_id)

tasks ──< task_dependencies (task_id, depends_on_task_id)
tasks ──< task_work_slots (task_id)
tasks ──< task_assignments (task_id)
tasks ──< task_phase_schedules (task_id)
tasks ──  resources (resource_id)

resources ──< task_assignments (resource_id)

task_assignments: task_id + resource_id + assignment_date + half_day (UNIQUE)
task_phase_schedules: task_id + phase (UNIQUE)

industries ──< product_types (industry_id)
product_types ──< task_templates (product_type_id)

appointments ──< reminders (appointment_id)
```

---

## 6. Recommendations

### 6.1 Critical Gaps to Fill for Phase 2

1. **Project model needs migration 035 fields**: The 11 fields from `035_extend_projects.sql` (`order_number`, `customer_name`, `installation_location`, `color`, `contact_name`, `contact_phone`, `needs_callback`, `sachbearbeiter`, `worker_count`, `helper_count`, `remarks`) must be added to:
   - `backend/src/models/project.ts` — `Project` interface, `ProjectResponse` interface, `toProjectResponse()` mapper, DTOs
   - `backend/src/services/projectService.ts` — `createProject()` INSERT, `updateProject()` field builder
   - `backend/src/controllers/projectController.ts` — extract new fields from `req.body` in create/update
   - `backend/src/validators/projectValidator.ts` — add validation rules for new fields
   - `frontend/src/types/index.ts` — update `Project` and `CreateProjectDTO` interfaces

2. **task_phase_schedules needs full CRUD**: Currently only queried by wochenplanService. Needs:
   - Model file (`backend/src/models/taskPhaseSchedule.ts`)
   - Service file with CRUD + queries by task/KW
   - Controller + routes
   - Validators
   - Frontend service + UI for managing phase schedules per task

3. **Resources `deleted_at` inconsistency**: The migration doesn't add `deleted_at` to resources, but queries reference it. Either:
   - Add migration for `ALTER TABLE resources ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`
   - OR remove `deleted_at IS NULL` from resource queries

4. **Frontend `types/index.ts` gaps**: The `Resource` interface in frontend types is missing the new fields (`department`, `employeeType`, `shortCode`, `defaultLocation`, `weeklyHours`, `skills`). The frontend services for wochenplan/capacity have their own local types that DO include these — but the shared type file doesn't.

### 6.2 Architecture Observations

- **No shared base service** — each service manually builds dynamic UPDATE queries. A small helper function for building SET clauses would reduce boilerplate.
- **Types duplicated** between backend models and frontend types — no codegen. Changes must be synced manually.
- **WochenplanService queries project fields directly** (e.g. `p.order_number`, `p.sachbearbeiter`) — these work at DB level even though the project model/API doesn't expose them yet. This is intentional (raw SQL bypasses the model layer).
- **Auth is ownership-based** (owner_id filtering), not permission-based despite RBAC tables existing. The `requirePermission` middleware exists but isn't applied to routes.
- **No Wochenplan-specific validator file** — just inline `query()` validators in the route. Consider adding a dedicated one as the endpoint grows.
- **Capacity service is read-only** — no write operations for capacity planning (e.g. setting availability exceptions, planned absences).
- **production_phase ENUM** in DB has 9 values (`zuschnitt, cnc, produktion, behandlung, beschlaege, montage, transport, vorbehandlung, nachbehandlung`) but the wochenplan UI only renders 6 phase columns (missing `transport`, `vorbehandlung`, `nachbehandlung`). The `PHASE_ORDER` constant in `wochenplanService.ts` has 7 entries. Alignment needed.
