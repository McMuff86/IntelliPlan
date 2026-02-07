# IntelliPlan – Agent Instructions

## What is IntelliPlan?

IntelliPlan replaces the Excel spreadsheet that every manufacturing shop uses for weekly planning. It manages projects (orders), production phases, worker assignments, and capacity – all in one place.

**Target users:** Manufacturing shops (carpentry, metalwork, joinery) with 10-100 employees who plan with Excel today.

## Tech Stack

- **Frontend:** React 19 + TypeScript + Vite 7 + Material-UI 7
- **Backend:** Node.js + Express + TypeScript
- **Database:** PostgreSQL 16 (Docker)
- **Testing:** Vitest (backend unit tests)
- **CI/CD:** GitHub Actions (TypeCheck + Tests)

## Project Structure

```
backend/
├── migrations/          # Sequential SQL migrations (001-041)
├── src/
│   ├── config/          # Database, logger
│   ├── controllers/     # Request handlers
│   ├── middleware/       # Auth, RBAC, rate limiting
│   ├── models/          # Types + response mappers
│   ├── routes/          # Express routes
│   ├── services/        # Business logic
│   ├── validators/      # express-validator chains
│   └── scripts/         # Seed scripts
frontend/
├── src/
│   ├── components/      # Reusable UI components
│   ├── contexts/        # Auth context
│   ├── hooks/           # Custom hooks
│   ├── pages/           # Route pages
│   ├── services/        # API service layer
│   ├── theme/           # MUI themes
│   ├── types/           # TypeScript interfaces
│   └── utils/           # Utilities
docs/                    # Product vision, architecture plans
```

## Core Domain Model

```
Project (= Order/Auftrag)
  → has many Tasks (each Task = one production Phase)
    → each Task has Assignments (worker + date + half_day)

Resource (= Worker/Mitarbeiter)
  → has department, work_role, skills
  → assigned to Tasks via TaskAssignment

Phase Definitions (configurable per company)
  → ZUS, CNC, PROD, VORBEH, NACHBEH, BESCHL, TRANS, MONT
  → sort_order defines production sequence
```

## Key Features

| Feature | Status | Backend | Frontend |
|---------|--------|---------|----------|
| Auth (JWT, DSGVO) | ✅ | ✅ | ✅ |
| Appointments | ✅ | ✅ | ✅ |
| Projects (CRUD, Gantt, DnD) | ✅ | ✅ | ✅ |
| Tasks + Dependencies | ✅ | ✅ | ✅ |
| RBAC (Permissions) | ✅ | ✅ | Partial |
| Pendenzen (Todos) | ✅ | ✅ | ✅ |
| Wochenplan (KW-View) | ✅ | ✅ | ✅ |
| Capacity Dashboard | ✅ | ✅ | ✅ |
| Mitarbeiter-View | ✅ | ✅ | ✅ |
| Excel Import | ✅ | ✅ | ✅ |
| CSV Export | ✅ | ✅ | – |
| Templates (Industry/Product) | ✅ | ✅ | ✅ |

## Development

```bash
# Start everything
docker compose up -d

# Backend dev (from backend/)
npm run dev

# Frontend dev (from frontend/)
npm run dev

# Run tests
cd backend && npx vitest run

# Run migrations
cd backend && npm run migrate

# Type check
cd backend && npx tsc --noEmit
```

## Conventions

- **Migrations:** Sequential numbering (`042_description.sql`), use `IF NOT EXISTS`, never modify existing migrations
- **API:** camelCase in JSON, snake_case in DB
- **Auth:** All routes use `requirePermission('resource:action')` via RBAC middleware
- **Soft Delete:** `deleted_at` column, all queries filter `WHERE deleted_at IS NULL`
- **Owner Scoping:** All data scoped by `owner_id` (multi-tenant ready)
- **Tests:** Vitest with mocked `pool.query`, no real DB in tests

## Current Priorities

See `docs/product-vision.md` for the full roadmap. Current focus:
1. Unify Projects ↔ Wochenplan (Gantt with phases)
2. Resource model improvements (skills, absences)
3. Better project creation flow (phase selection)
4. Import as onboarding experience
