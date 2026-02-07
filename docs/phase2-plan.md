# Wochenplan Phase 2 – Implementation Plan

> **Created:** 2026-02-07 · **Branch:** `feature/wochenplan-phase2`
> **Status:** Planning complete — ready for parallel execution

---

## Overview

### What We're Building
IntelliPlan's Wochenplan is replacing an Excel-based weekly production plan for a carpentry company (~56 employees, 8 departments, ~300 rows per week). Phase 1 established the database schema (migrations 033-037) and basic read-only KW-View with click-to-assign. Phase 2 completes the feature to production-ready state.

### Why
The Excel system works but doesn't scale: no conflict detection, no capacity intelligence, manual copy-paste across 53 sheets, no visibility into overbooked workers. IntelliPlan must be **better than Excel**, not just digital Excel.

### Key Principles
1. **NOT an Excel clone** – Smarter grouping, automatic conflict detection, capacity intelligence
2. **Fully digital** – No Excel export back to old format. Clean CSV exports are fine
3. **Excel import for migration** – One-time + repeatable import (already built in Phase 1)
4. **Intelligent views** – KW-View, Mitarbeiter-View, Werkstatt-TV-View, Kapazitäts-Dashboard
5. **StatusCodes in EN** (`assigned`, `sick`, `vacation`) with future i18n

### Current State Assessment

| Layer | Status | Gap |
|-------|--------|-----|
| **DB Schema** | ✅ Complete (migrations 033-037) | — |
| **Task model** | ✅ Has `phase_code`, `planned_week`, `planned_year` | — |
| **Resource model** | ✅ Has `department`, `employee_type`, `short_code`, `weekly_hours`, `skills` | — |
| **TaskAssignment model** | ✅ Full CRUD + bulk create + status_code | — |
| **Project model** | ⚠️ DB columns exist but NOT in API | `order_number`, `customer_name`, `installation_location`, `color`, `contact_name`, `contact_phone`, `needs_callback`, `sachbearbeiter`, `worker_count`, `helper_count`, `remarks` — all missing from `CreateProjectDTO`, `UpdateProjectDTO`, `Project` interface, and `toProjectResponse` |
| **Wochenplan API** | ⚠️ Read-only GET, no write operations | Only `GET /api/wochenplan?kw=&year=` exists |
| **Capacity API** | ✅ Full (overview, by dept, by resource) | — |
| **Import** | ✅ Validate + execute endpoints | 978-line import service |
| **Frontend KW-View** | ⚠️ Basic but functional | Click-to-assign works, no drag-and-drop, no multi-assign, no Mitarbeiter-View |
| **Frontend Capacity** | ✅ Rich dashboard with dept cards + detail tables | — |
| **Frontend Import** | ✅ Upload + validate + execute flow | — |

---

## Work Packages

### WP1: Backend – Project Model Extensions (🔴 Highest Priority)

**Problem:** The DB has 11 Wochenplan-specific columns on `projects` (added in migration 035), but the Project TypeScript model, service, controller, and API completely ignore them. You can only read these fields via the `wochenplanService` SQL joins. Creating/editing projects through the API cannot set `order_number`, `customer_name`, etc.

**Files to modify:**

#### 1.1 `backend/src/models/project.ts`
Add to `Project` interface:
```typescript
order_number: string | null;
customer_name: string | null;
installation_location: string | null;
color: string | null;
contact_name: string | null;
contact_phone: string | null;
needs_callback: boolean;
sachbearbeiter: string | null;
worker_count: number | null;
helper_count: number | null;
remarks: string | null;
```

Add to `ProjectResponse` interface (camelCase):
```typescript
orderNumber: string | null;
customerName: string | null;
installationLocation: string | null;
color: string | null;
contactName: string | null;
contactPhone: string | null;
needsCallback: boolean;
sachbearbeiter: string | null;
workerCount: number | null;
helperCount: number | null;
remarks: string | null;
```

Update `toProjectResponse()` mapping.

#### 1.2 `backend/src/services/projectService.ts`
- Add all 11 fields to `CreateProjectDTO` and `UpdateProjectDTO`
- Update `createProject()` INSERT query to include all fields
- Update `updateProject()` to handle all new fields in dynamic SET clause
- **Validation:** `order_number` should be unique (with soft-delete awareness), `worker_count`/`helper_count` >= 0

#### 1.3 `backend/src/controllers/projectController.ts`
- Update `create()` to extract new fields from `req.body`
- Update `update()` to pass new fields to service

#### 1.4 `backend/src/validators/projectValidator.ts` (or wherever validators live)
- Add validation rules for new fields
- `order_number`: optional string, max 50 chars
- `worker_count`, `helper_count`: optional numeric, >= 0
- `needs_callback`: optional boolean
- `color`: optional string, max 100 chars

**Estimated effort:** S (1-2 days) — Mechanical extension, all patterns exist

---

### WP2: Backend – Resource Management Enhancements

**Problem:** Resource model is already complete in TypeScript (`department`, `employee_type`, `short_code`, `weekly_hours`, `skills` all exist in model + service + CRUD). However, the API needs enhanced querying capabilities.

**Current state:** `GET /api/resources` returns all resources for the user. No filtering by department.

**Files to modify:**

#### 2.1 `backend/src/services/resourceService.ts`
- `getResourcesByDepartment()` already exists ✅
- Add `listResources()` with filters: `department`, `employee_type`, `is_active`, `resource_type`
- Add `getResourcesByShortCode()` for quick lookup (already exists for single)
- Add `getAvailableResourcesForDate(date, halfDay)` — returns resources NOT yet assigned for that slot

#### 2.2 `backend/src/controllers/resourceController.ts`
- Update `list()` to accept query params: `?department=produktion&employee_type=internal&active=true`

#### 2.3 `backend/src/routes/resources.ts`
- Add query param validation for department/employee_type filters

#### 2.4 Frontend: `frontend/src/services/resourceService.ts`
- Update `getAll()` to support filter params

**Estimated effort:** S (1 day)

---

### WP3: Backend – Intelligent KW-View API

**Problem:** The current `GET /api/wochenplan` endpoint is read-only and returns a monolithic response. Phase 2 needs additional intelligence.

**Current state:** `wochenplanService.getWeekPlan(kw, year)` returns sections grouped by department, each with tasks and their day-assignments. This is well-structured but missing:

**What to add:**

#### 3.1 Conflict Detection Endpoint
`GET /api/wochenplan/conflicts?kw=6&year=2026`

Returns resources assigned to multiple tasks in the same half-day:
```typescript
interface ConflictResponse {
  conflicts: {
    resourceId: string;
    resourceName: string;
    shortCode: string;
    date: string;
    halfDay: string;
    assignments: { taskId: string; projectOrderNumber: string; description: string }[];
  }[];
}
```

**File:** `backend/src/services/wochenplanService.ts` — add `getWeekConflicts(kw, year)`

SQL approach: `GROUP BY resource_id, assignment_date, half_day HAVING COUNT(*) > 1`

#### 3.2 Quick-Assign Endpoint (Batch)
`POST /api/wochenplan/assign`

Body:
```json
{
  "assignments": [
    { "taskId": "...", "resourceId": "...", "date": "2026-02-02", "halfDay": "morning" },
    { "taskId": "...", "resourceId": "...", "date": "2026-02-02", "halfDay": "afternoon" }
  ]
}
```

This wraps the existing bulk-create but with conflict pre-check and returns the updated week plan. Faster than individual POST calls + re-fetch.

**File:** New controller method in `wochenplanController.ts`, delegates to `taskAssignmentService.bulkCreateAssignments()`

#### 3.3 Copy-Week Endpoint
`POST /api/wochenplan/copy`

Body:
```json
{
  "sourceKw": 6, "sourceYear": 2026,
  "targetKw": 7, "targetYear": 2026,
  "options": { "includeAssignments": true, "includePhaseSchedules": true }
}
```

This is a common Excel pattern — copy last week's plan as starting point for next week.

#### 3.4 Unassigned Tasks View
`GET /api/wochenplan/unassigned?kw=6&year=2026`

Returns tasks that have phase_schedules for this KW but zero assignments — helps planners see what still needs work.

#### 3.5 KW-Phase-Matrix Endpoint
`GET /api/wochenplan/phase-matrix?from_kw=4&to_kw=10&year=2026`

Returns a multi-week view of which tasks are in which phase across KWs — the "big picture" that Excel's separate sheets don't show well.

**Files to modify:**
- `backend/src/services/wochenplanService.ts` — add 4 new functions
- `backend/src/controllers/wochenplanController.ts` — add 4 new handler methods
- `backend/src/routes/wochenplan.ts` — add routes
- New validator: `backend/src/validators/wochenplanValidator.ts`

**Estimated effort:** M (3-4 days)

---

### WP4: Backend – Mitarbeiter-View API

**Problem:** No endpoint exists to answer "What does MA_14 do this week?" in a resource-centric view.

**Current state:** `GET /api/capacity/resource/:id?from=...&to=...` returns hours/utilization per day, but doesn't include task details per slot (only `projectName` and `halfDay`). `GET /api/resources/:resourceId/assignments?from=...&to=...` returns raw assignment records. Neither gives a proper "weekly schedule for this person" view.

**What to build:**

#### 4.1 Resource Weekly Schedule
`GET /api/wochenplan/resource/:resourceId?kw=6&year=2026`

Response:
```typescript
interface ResourceWeekSchedule {
  resource: { id, name, shortCode, department, employeeType, weeklyHours };
  kw: number;
  year: number;
  dateRange: { from: string; to: string };
  days: {
    date: string;
    dayName: string;
    morning: {
      taskId: string | null;
      projectOrderNumber: string;
      customerName: string;
      description: string;
      installationLocation: string;
      isFixed: boolean;
      notes: string | null;
      statusCode: string;
    } | null;
    afternoon: { /* same */ } | null;
    availableHours: number;
    assignedHours: number;
  }[];
  weekSummary: { totalAssigned: number; totalAvailable: number; utilizationPercent: number };
}
```

#### 4.2 All-Resources Week Overview
`GET /api/wochenplan/resources?kw=6&year=2026&department=montage`

Returns a compact matrix: all resources × 5 days × 2 half-days. Used for the Mitarbeiter-View grid.

**Files to modify:**
- `backend/src/services/wochenplanService.ts` — add `getResourceSchedule()`, `getResourcesOverview()`
- `backend/src/controllers/wochenplanController.ts` — add handlers
- `backend/src/routes/wochenplan.ts` — add routes

**Estimated effort:** M (2-3 days)

---

### WP5: Backend – Data Export

**Problem:** Users need to get data out of IntelliPlan in clean formats (NOT the old Excel layout).

**What to build:**

#### 5.1 CSV Export
`GET /api/export/wochenplan/csv?kw=6&year=2026&department=all`

Returns a flat CSV with columns:
`OrderNumber, Customer, Description, Phase, Department, Date, HalfDay, Worker, Status, IsFixed, Notes`

#### 5.2 JSON Export
`GET /api/export/wochenplan/json?kw=6&year=2026`

Returns the full WeekPlanResponse as downloadable JSON (for integrations).

#### 5.3 PDF / Print View (deferred to WP6 frontend)
Generate a printable weekly plan for the workshop TV — this is better handled client-side with the existing `jspdf` dependency.

**Files to create:**
- `backend/src/services/exportService.ts`
- `backend/src/controllers/exportController.ts`
- `backend/src/routes/export.ts`
- Register in `backend/src/routes/index.ts`

**Estimated effort:** S (1-2 days)

---

### WP6: Frontend – Smart KW-View Enhancements

**Problem:** The current KW-View is functional but basic. It needs production-grade UX improvements.

**Current state:**
- ✅ Section tables per department
- ✅ Task rows with phase KW chips, assignments, remarks
- ✅ Click-to-assign dialog (single assignment create/edit/delete)
- ✅ Capacity summary at bottom
- ❌ No drag-and-drop
- ❌ No inline quick-assign (must use dialog every time)
- ❌ No conflict warnings
- ❌ No keyboard shortcuts
- ❌ No multi-select assign
- ❌ No print/TV mode
- ❌ No filtering/search within week

**What to build:**

#### 6.1 Conflict Indicators
- After loading week plan, call `GET /api/wochenplan/conflicts`
- Show red badge/border on cells where a resource is double-booked
- Tooltip shows the conflicting assignments

**File:** Update `Wochenplan.tsx` + new `ConflictBadge` component

#### 6.2 Quick-Assign Mode
- When a "FREI" cell is clicked, instead of a full dialog, show a compact inline dropdown of available resources (filtered by department)
- Keyboard: type initials to filter → Enter to assign
- The full dialog remains available via a "more options" button

**Files:** New `QuickAssignPopover.tsx` component in `frontend/src/components/wochenplan/`

#### 6.3 Multi-Select & Batch Assign
- Shift+click to select multiple FREI cells (same task, different days)
- Assign same resource to all selected slots at once
- Uses `POST /api/wochenplan/assign` batch endpoint

**File:** Update `Wochenplan.tsx` state management

#### 6.4 Werkstatt-TV Mode
- Fullscreen toggle (hides sidebar, nav)
- Larger fonts, high contrast
- Auto-refresh every 30 seconds
- Read-only (no click-to-assign)
- Filter to show only departments relevant for the workshop

**Files:** New `WochenplanTV.tsx` page, new route, separate layout

#### 6.5 Week Navigation Keyboard Shortcuts
- `←` / `→` to navigate weeks
- `T` to jump to current week
- `F` for fullscreen/TV mode

**File:** Update `Wochenplan.tsx` — add `useEffect` keyboard listener

#### 6.6 Print View
- Button to generate a printable A3 landscape layout
- Uses `jspdf` (already in dependencies) or browser print
- Optimized for workshop wall posting

**Files:** New `PrintWochenplan.tsx` component

#### 6.7 Section Collapse/Expand
- Allow collapsing sections without tasks
- Remember collapse state in localStorage

**File:** Update `Wochenplan.tsx` + `SectionTable` component

#### 6.8 Unassigned Tasks Indicator
- Badge showing "3 unassigned" per section
- Click to highlight unassigned tasks

**Estimated effort:** L (5-7 days)

---

### WP7: Frontend – Mitarbeiter-View

**Problem:** No "What does this person do this week?" view exists. Planners need to see a resource-centric schedule.

**What to build:**

#### 7.1 Mitarbeiter Page
New page: `/mitarbeiter-plan`

Layout:
```
┌──────────────────────────────────────────────────────────┐
│ Mitarbeiter-Plan  KW 06 / 2026       [← KW05] [KW07 →] │
├──────────────────────────────────────────────────────────┤
│ [Filter: Abteilung ▼] [Filter: Typ ▼] [Suche: ______]  │
├──────────────────────────────────────────────────────────┤
│ MA    │ Mo VM │ Mo NM │ Di VM │ Di NM │ ... │ Fr NM │ % │
├───────┼───────┼───────┼───────┼───────┼─────┼───────┼───┤
│ MA_01 │ Prod  │ Prod  │ CNC   │ CNC   │     │       │65%│
│ MA_02 │ ZUS   │ ZUS   │ ZUS   │ FREI  │     │       │40%│
│ MA_14 │ MONT  │ MONT  │ MONT  │ MONT  │     │ MONT  │100│
│ ...   │       │       │       │       │     │       │   │
└───────┴───────┴───────┴───────┴───────┴─────┴───────┴───┘
```

- Each cell shows project abbreviation + color coded by department
- Click on cell → navigates to that task in KW-View (cross-link)
- Click on resource name → detail panel showing full week schedule
- Hover on cell → tooltip with full project info
- Color coding: green=assigned, yellow=training, red=sick, blue=vacation, grey=free

#### 7.2 Resource Detail Sidebar
- Click a resource → slide-in panel
- Shows: Name, short_code, department, weekly_hours, skills
- Weekly schedule with task details
- Link to capacity history (multi-week)

#### 7.3 Department Tabs or Filter
- Quick filter by department
- "All" shows everyone (large table, maybe virtualized)

**Files to create:**
- `frontend/src/pages/MitarbeiterPlan.tsx` — main page
- `frontend/src/components/mitarbeiter/MitarbeiterGrid.tsx` — the matrix table
- `frontend/src/components/mitarbeiter/ResourceDetailPanel.tsx` — sidebar
- `frontend/src/services/wochenplanService.ts` — add `getResourceSchedule()`, `getResourcesOverview()`
- Update router in `App.tsx`

**Estimated effort:** M-L (4-5 days)

---

### WP8: Frontend – Kapazitäts-Dashboard Enhancements

**Current state:** The Capacity page is already quite rich:
- ✅ Company-wide summary (total %, hours, overbooked count)
- ✅ Department cards with utilization bars
- ✅ Expandable detail tables per department
- ✅ Resource rows with day-level hour breakdown
- ✅ Overbooking warnings

**What to enhance:**

#### 8.1 Multi-Week Trend
- Add a "4-week" or "8-week" view toggle
- Show utilization trend over time per department
- Simple bar chart (can use plain SVG or a lightweight chart lib)

#### 8.2 Department Heatmap
- Visual grid: departments × days, colored by utilization
- Quick way to spot bottlenecks across the week

#### 8.3 Capacity Planning Mode
- "What-if" slider: if we add 1 person to Montage, what happens to utilization?
- Read-only simulation, doesn't save anything

#### 8.4 Cross-Link to KW-View
- Click on a department card → navigate to KW-View scrolled to that section
- Click on an overbooked resource → navigate to Mitarbeiter-View

**Estimated effort:** M (3-4 days)

---

## Task Breakdown

### WP1: Backend – Project Model Extensions
| # | Task | Effort | Priority |
|---|------|--------|----------|
| 1.1 | Update `Project` interface + `ProjectResponse` + `toProjectResponse()` | S | P0 |
| 1.2 | Update `CreateProjectDTO` + `UpdateProjectDTO` with 11 fields | S | P0 |
| 1.3 | Update `createProject()` INSERT query | S | P0 |
| 1.4 | Update `updateProject()` dynamic SET clause | S | P0 |
| 1.5 | Update `projectController` create/update to pass new fields | S | P0 |
| 1.6 | Add validation rules for new fields | S | P0 |
| 1.7 | Update frontend `projectService.ts` types | S | P0 |
| 1.8 | Update frontend project form (if exists) to show new fields | M | P1 |

### WP2: Backend – Resource Management Enhancements
| # | Task | Effort | Priority |
|---|------|--------|----------|
| 2.1 | Add filter params to `listResources()` (department, employee_type, active) | S | P1 |
| 2.2 | Add `getAvailableResourcesForDate()` service function | S | P1 |
| 2.3 | Update resource controller + route for query params | S | P1 |
| 2.4 | Update frontend `resourceService.ts` to support filters | S | P1 |

### WP3: Backend – Intelligent KW-View API
| # | Task | Effort | Priority |
|---|------|--------|----------|
| 3.1 | Conflict detection endpoint | M | P0 |
| 3.2 | Quick-assign batch endpoint | S | P1 |
| 3.3 | Copy-week endpoint | M | P2 |
| 3.4 | Unassigned tasks endpoint | S | P1 |
| 3.5 | KW-Phase-Matrix endpoint (multi-week) | M | P2 |
| 3.6 | Wochenplan validators | S | P1 |

### WP4: Backend – Mitarbeiter-View API
| # | Task | Effort | Priority |
|---|------|--------|----------|
| 4.1 | Resource weekly schedule endpoint | M | P1 |
| 4.2 | All-resources week overview endpoint | M | P1 |

### WP5: Backend – Data Export
| # | Task | Effort | Priority |
|---|------|--------|----------|
| 5.1 | CSV export service + endpoint | S | P2 |
| 5.2 | JSON export endpoint | S | P2 |

### WP6: Frontend – Smart KW-View
| # | Task | Effort | Priority |
|---|------|--------|----------|
| 6.1 | Conflict indicators (red badges on cells) | M | P0 |
| 6.2 | Quick-assign popover (inline dropdown) | M | P1 |
| 6.3 | Multi-select & batch assign | M | P1 |
| 6.4 | Werkstatt-TV fullscreen mode | M | P2 |
| 6.5 | Keyboard shortcuts | S | P1 |
| 6.6 | Print view (jspdf / browser print) | M | P2 |
| 6.7 | Section collapse/expand + localStorage persistence | S | P1 |
| 6.8 | Unassigned tasks indicator per section | S | P1 |

### WP7: Frontend – Mitarbeiter-View
| # | Task | Effort | Priority |
|---|------|--------|----------|
| 7.1 | MitarbeiterPlan page with matrix grid | L | P1 |
| 7.2 | Resource detail sidebar panel | M | P1 |
| 7.3 | Department filter + search | S | P1 |
| 7.4 | Cross-links to KW-View | S | P2 |

### WP8: Frontend – Kapazitäts-Dashboard
| # | Task | Effort | Priority |
|---|------|--------|----------|
| 8.1 | Multi-week trend view | M | P2 |
| 8.2 | Department heatmap | M | P2 |
| 8.3 | What-if capacity simulation | L | P3 |
| 8.4 | Cross-links to KW-View and Mitarbeiter-View | S | P2 |

**Effort Legend:** S = ≤4h, M = 4-8h, L = 1-2 days

---

## Dependencies

```
WP1 (Project Model) ─────┐
                          ├──► WP3 (Intelligent KW-View API)
WP2 (Resource Enhance) ──┤
                          ├──► WP4 (Mitarbeiter-View API)
                          │
                          └──► WP6 (Frontend KW-View) ──► WP6.4 (TV Mode)
                                                         WP6.6 (Print)
                          
WP3 ──────► WP6.1 (Conflict indicators need conflict API)
WP3 ──────► WP6.3 (Multi-assign needs batch endpoint)
WP4 ──────► WP7   (Mitarbeiter frontend needs API)
WP3+WP4 ──► WP5   (Export uses same data, can be done after)
WP6+WP7 ──► WP8.4 (Cross-links need both views to exist)

Independent:
- WP5 (Export) can start anytime after WP1
- WP8.1-8.3 (Capacity enhancements) are independent of WP1-7
```

**Critical path:** WP1 → WP3 → WP6.1

---

## Suggested Coding Agent Assignments

### Agent A: Backend Core (WP1 + WP2 + WP5)
**Focus:** Data model completeness + resource API + export
**Branch:** `feature/wochenplan-phase2` (or sub-branch)

Tasks in order:
1. WP1.1–1.6: Project model extension (all backend)
2. WP2.1–2.3: Resource filtering
3. WP5.1–5.2: Export endpoints

**Estimated time:** 3-4 days
**No dependencies on other agents.**

### Agent B: Backend Intelligence (WP3 + WP4)
**Focus:** All new Wochenplan API endpoints
**Branch:** `feature/wochenplan-phase2`

Tasks in order:
1. WP3.1: Conflict detection (P0)
2. WP3.4: Unassigned tasks
3. WP3.2: Quick-assign batch
4. WP4.1–4.2: Mitarbeiter-View API
5. WP3.3: Copy-week
6. WP3.5: Phase-matrix

**Estimated time:** 4-5 days
**Depends on:** WP1 being complete (for project fields in responses). Can start WP3.1 immediately since it only reads existing data.

### Agent C: Frontend KW-View (WP6 + WP1.7-1.8)
**Focus:** KW-View enhancements + project form updates
**Branch:** `feature/wochenplan-phase2`

Tasks in order:
1. WP1.7–1.8: Frontend project model + form updates
2. WP6.7: Section collapse/expand (quick win)
3. WP6.5: Keyboard shortcuts (quick win)
4. WP6.8: Unassigned indicator
5. WP6.1: Conflict indicators (needs Agent B's WP3.1)
6. WP6.2: Quick-assign popover
7. WP6.3: Multi-select assign (needs Agent B's WP3.2)
8. WP6.4: TV mode
9. WP6.6: Print view

**Estimated time:** 5-7 days
**Depends on:** Agent B for WP3.1 (conflict API) and WP3.2 (batch assign API). Can start immediately with WP1.7, WP6.5, WP6.7, WP6.8.

### Agent D: Frontend Mitarbeiter + Capacity (WP7 + WP8 + WP2.4)
**Focus:** New Mitarbeiter-View page + Capacity dashboard enhancements
**Branch:** `feature/wochenplan-phase2`

Tasks in order:
1. WP2.4: Frontend resource service filter support
2. WP7.1: MitarbeiterPlan page + grid
3. WP7.2: Resource detail sidebar
4. WP7.3: Filters
5. WP7.4: Cross-links
6. WP8.4: Cross-links from Capacity
7. WP8.1: Multi-week trend (if time)
8. WP8.2: Department heatmap (if time)

**Estimated time:** 5-6 days
**Depends on:** Agent B for WP4.1–4.2 (Mitarbeiter API). Can start WP2.4 immediately, then WP7.1 scaffold while API is being built.

### Parallel Execution Timeline

```
Day 1-2:
  Agent A: WP1 (Project model backend)
  Agent B: WP3.1 (Conflict detection) + WP3.4 (Unassigned)
  Agent C: WP1.7-1.8 (Project frontend) + WP6.7 + WP6.5
  Agent D: WP2.4 (Resource filters frontend) + WP7.1 scaffold

Day 3-4:
  Agent A: WP2 (Resource API) + WP5 (Export)
  Agent B: WP3.2 (Batch assign) + WP4.1-4.2 (Mitarbeiter API)
  Agent C: WP6.8 + WP6.1 (conflicts) + WP6.2 (quick-assign)
  Agent D: WP7.1-7.3 (Mitarbeiter grid + detail + filters)

Day 5-7:
  Agent A: Done or helping with reviews
  Agent B: WP3.3 (Copy-week) + WP3.5 (Phase-matrix)
  Agent C: WP6.3 (multi-select) + WP6.4 (TV) + WP6.6 (print)
  Agent D: WP7.4 + WP8.4 (cross-links) + WP8.1 (trends)
```

### Key Coordination Points
1. **Agent A must finish WP1 before Agent C starts WP1.7** — Agent A should prioritize this on Day 1
2. **Agent B must finish WP3.1 before Agent C does WP6.1** — Agent B should prioritize conflict API
3. **Agent B must finish WP4.1 before Agent D can build WP7.1 with real data** — Agent D can scaffold UI first
4. **All agents on same branch** — coordinate commits, run `git pull` before starting each task

---

## Technical Notes

### Stack Reference
- **Backend:** Node.js + Express + TypeScript, PostgreSQL (via `pg` pool), express-validator
- **Frontend:** React 19 + Vite + MUI v7 + date-fns + FullCalendar + react-hook-form + jspdf
- **Auth:** Custom middleware (`requireUserId`, `loadUser`)
- **Patterns:** snake_case DB/service ↔ camelCase API/frontend, soft delete via `deleted_at`

### Naming Conventions
- DB columns: `snake_case` (e.g., `order_number`)
- TypeScript interfaces: `snake_case` for DB types, `camelCase` for Response types
- API responses: `camelCase` (e.g., `orderNumber`)
- Status codes: English lowercase (`assigned`, `sick`, `vacation`)
- Departments: lowercase singular (`zuschnitt`, `produktion`, `montage`)

### Production Phase Enum Values
```
DB enum (production_phase): zuschnitt, cnc, produktion, vorbehandlung, behandlung, 
                            nachbehandlung, beschlaege, transport, montage
Task phase_code (varchar):  ZUS, CNC, PROD, VORBEH, NACHBEH, BESCHL, TRANS, MONT
```

### Department Keys
```
zuschnitt, cnc, produktion, behandlung, beschlaege, transport, montage, buero
```

### Employee Types
```
internal, temporary, external_firm, pensioner, apprentice
```

### Status Codes (task_assignments)
```
assigned, available, sick, vacation, training, other
```
