# IntelliPlan – Architektur-Zielstruktur

> **Stand:** 2026-02-07 · **Status:** Explorativ / Zukunftsvision  
> **Zweck:** Definiert die Ziel-Architektur für die schrittweise Migration

---

## Übersicht

IntelliPlan bewegt sich von einer flachen Ordnerstruktur hin zu einer **Feature-basierten Architektur**. Dieses Dokument beschreibt die Zielstruktur und den Migrationsplan.

### Prinzipien

1. **Feature-First:** Jedes Feature ist ein eigenständiges Modul mit eigenen Components, Hooks, Services und Types
2. **Shared Kern:** Gemeinsam genutzte Bausteine (UI-Components, Hooks, Utils) leben in `shared/`
3. **Klare Abhängigkeiten:** Features dürfen `shared/` importieren, aber nicht gegenseitig (Ausnahme: explizite Cross-Feature-APIs)
4. **Schrittweise Migration:** Neue Features werden direkt in der neuen Struktur gebaut, bestehende werden bei Bedarf migriert

---

## Frontend Zielstruktur

```
frontend/src/
├── features/
│   ├── auth/                       # Login, Register, Token-Management
│   │   ├── components/
│   │   │   ├── LoginForm.tsx
│   │   │   ├── RegisterForm.tsx
│   │   │   └── TokenRefresh.tsx
│   │   ├── hooks/
│   │   │   └── useAuth.ts
│   │   ├── services/
│   │   │   └── authService.ts
│   │   ├── types/
│   │   │   └── auth.types.ts
│   │   └── index.ts                # Public API des Features
│   │
│   ├── projects/                   # Projektliste, Detail, CRUD
│   │   ├── components/
│   │   │   ├── ProjectList.tsx
│   │   │   ├── ProjectDetail.tsx
│   │   │   ├── ProjectForm.tsx
│   │   │   └── ProjectCard.tsx
│   │   ├── hooks/
│   │   │   └── useProjects.ts
│   │   ├── services/
│   │   │   └── projectService.ts
│   │   ├── types/
│   │   │   └── project.types.ts
│   │   └── index.ts
│   │
│   ├── tasks/                      # Task-Management
│   │   ├── components/
│   │   │   ├── TaskList.tsx
│   │   │   ├── TaskDetail.tsx
│   │   │   ├── TaskForm.tsx
│   │   │   └── TaskDependencies.tsx
│   │   ├── hooks/
│   │   │   └── useTasks.ts
│   │   ├── services/
│   │   │   └── taskService.ts
│   │   ├── types/
│   │   │   └── task.types.ts
│   │   └── index.ts
│   │
│   ├── pendenzen/                  # Pendenzen-Modul
│   │   ├── components/
│   │   │   ├── PendenzList.tsx
│   │   │   ├── PendenzForm.tsx
│   │   │   └── PendenzFilters.tsx
│   │   ├── hooks/
│   │   │   └── usePendenzen.ts
│   │   ├── services/
│   │   │   └── pendenzService.ts
│   │   ├── types/
│   │   │   └── pendenz.types.ts
│   │   └── index.ts
│   │
│   ├── wochenplan/                 # Wochenplan-View + Edit
│   │   ├── components/
│   │   │   ├── WochenplanHeader.tsx
│   │   │   ├── WochenplanSection.tsx
│   │   │   ├── WochenplanTable.tsx
│   │   │   ├── AssignmentCell.tsx
│   │   │   ├── CapacityBar.tsx
│   │   │   └── PhaseWeekBadge.tsx
│   │   ├── hooks/
│   │   │   ├── useWochenplan.ts
│   │   │   ├── useCapacity.ts
│   │   │   └── useWeekNavigation.ts
│   │   ├── services/
│   │   │   └── wochenplanService.ts
│   │   ├── types/
│   │   │   └── wochenplan.types.ts
│   │   └── index.ts
│   │
│   ├── resources/                  # Mitarbeiter-Verwaltung
│   │   ├── components/
│   │   │   ├── ResourceList.tsx
│   │   │   ├── ResourceForm.tsx
│   │   │   └── ResourceCard.tsx
│   │   ├── hooks/
│   │   │   └── useResources.ts
│   │   ├── services/
│   │   │   └── resourceService.ts
│   │   ├── types/
│   │   │   └── resource.types.ts
│   │   └── index.ts
│   │
│   ├── capacity/                   # Kapazitätsplanung
│   │   ├── components/
│   │   │   ├── CapacityDashboard.tsx
│   │   │   ├── DepartmentCapacity.tsx
│   │   │   └── CapacityTimeline.tsx
│   │   ├── hooks/
│   │   │   └── useCapacityPlanning.ts
│   │   ├── services/
│   │   │   └── capacityService.ts
│   │   ├── types/
│   │   │   └── capacity.types.ts
│   │   └── index.ts
│   │
│   └── settings/                   # User Settings, Admin
│       ├── components/
│       │   ├── SettingsPage.tsx
│       │   ├── ProfileSettings.tsx
│       │   └── AdminPanel.tsx
│       ├── hooks/
│       │   └── useSettings.ts
│       ├── services/
│       │   └── settingsService.ts
│       ├── types/
│       │   └── settings.types.ts
│       └── index.ts
│
├── shared/
│   ├── components/                 # Wiederverwendbare UI-Bausteine
│   │   ├── Button.tsx
│   │   ├── Modal.tsx
│   │   ├── ConfirmDialog.tsx
│   │   ├── DataTable.tsx
│   │   ├── EmptyState.tsx
│   │   ├── LoadingSpinner.tsx
│   │   └── index.ts
│   │
│   ├── hooks/                      # Shared Hooks
│   │   ├── useApi.ts              # Generic fetch mit Loading/Error/Refetch
│   │   ├── useDebounce.ts         # Debounce für Search/Filter
│   │   ├── useWeekNavigation.ts   # KW Vor/Zurück/Today
│   │   ├── useHotkeys.ts         # Keyboard Shortcuts
│   │   └── index.ts
│   │
│   ├── utils/                      # Utility-Funktionen
│   │   ├── formatDate.ts
│   │   ├── weekCalculation.ts
│   │   ├── topologicalSort.ts
│   │   └── index.ts
│   │
│   └── types/                      # Shared Types
│       ├── api.ts                 # Generic API Response Types
│       ├── common.ts              # Pagination, SortOrder, DateRange
│       ├── wochenplan.ts          # WeekPlan Types (gespiegelt vom Backend)
│       └── index.ts
│
├── layouts/                        # Layout-Komponenten
│   ├── MainLayout.tsx             # Sidebar, Header, Content
│   ├── AuthLayout.tsx             # Login/Register Layout
│   └── index.ts
│
└── app/                            # App-Shell
    ├── App.tsx                    # Root Component
    ├── routes.tsx                 # Route-Definitionen
    ├── theme.ts                   # MUI Theme
    └── main.tsx                   # Entry Point
```

---

## Backend Zielstruktur

```
backend/src/
├── routes/
│   ├── v1/                         # API v1 (alle aktuellen Endpoints)
│   │   ├── index.ts               # Re-exportiert alle v1 Routes
│   │   ├── auth.ts
│   │   ├── projects.ts
│   │   ├── tasks.ts
│   │   ├── resources.ts
│   │   ├── wochenplan.ts
│   │   ├── pendenzen.ts
│   │   └── ...
│   └── index.ts                   # Mountet /api/v1/..., /api/v2/...
│
├── services/
│   ├── base/                       # Generische Service-Patterns
│   │   ├── baseService.ts         # CRUD-Grundoperationen
│   │   └── queryBuilder.ts        # Filter, Sort, Paginate
│   ├── projectService.ts
│   ├── taskService.ts
│   ├── wochenplanService.ts
│   └── ...
│
├── events/                         # Event-System
│   ├── eventBus.ts                # EventEmitter-basiert
│   ├── events.ts                  # Event-Definitionen
│   └── subscribers/               # Event-Handler
│       ├── logSubscriber.ts
│       └── notificationSubscriber.ts
│
├── controllers/
├── models/
├── middleware/
├── validators/
└── config/
```

---

## Migrationsplan: Aktuell → Zielstruktur

### Phase 1: Shared Foundation (jetzt – dieser Branch)

- [x] `shared/types/` erstellen (api.ts, common.ts, wochenplan.ts)
- [x] `shared/hooks/` erstellen (useApi, useWeekNavigation, useDebounce)
- [x] `backend/services/base/` erstellen (baseService, queryBuilder)
- [x] `backend/routes/v1/` vorbereiten
- [x] `backend/events/` EventBus aufbauen

### Phase 2: Neue Features in neuer Struktur (Q1)

- [ ] `features/wochenplan/` – Wochenplan als erstes Feature in neuer Struktur
- [ ] `features/capacity/` – Kapazitätsplanung
- [ ] `layouts/MainLayout.tsx` – Layout extrahieren

### Phase 3: Bestehende Features migrieren (Q2)

- [ ] `features/auth/` – aus `contexts/AuthContext.tsx` + `pages/Auth.tsx`
- [ ] `features/projects/` – aus `pages/Projects.tsx` + `pages/ProjectDetail.tsx`
- [ ] `features/tasks/` – aus `pages/TaskDetail.tsx`
- [ ] `features/pendenzen/` – aus Pendenzen-Komponenten
- [ ] `features/resources/` – wenn Resource-Management-UI gebaut wird
- [ ] `features/settings/` – aus `pages/Settings.tsx`

### Phase 4: Aufräumen (Q2-Q3)

- [ ] Alte `pages/` Ordner leeren
- [ ] Alte `components/` Ordner leeren (nur noch shared übrig)
- [ ] Alte `services/` in Feature-Module verschieben
- [ ] `types/index.ts` auflösen in Feature-Types

---

## Import-Regeln

```typescript
// ✅ Erlaubt: Feature importiert aus shared
import { useApi } from '@/shared/hooks';
import { ApiResponse } from '@/shared/types';

// ✅ Erlaubt: Feature importiert aus eigenem Modul
import { WochenplanTable } from './components/WochenplanTable';

// ✅ Erlaubt: Feature nutzt Public API eines anderen Features
import { useAuth } from '@/features/auth';

// ❌ Verboten: Feature importiert direkt aus anderem Feature-Innenleben
import { LoginForm } from '@/features/auth/components/LoginForm';

// ❌ Verboten: Shared importiert aus Feature
import { useWochenplan } from '@/features/wochenplan/hooks';
```

### Path Aliases (tsconfig.json)

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@features/*": ["./src/features/*"],
      "@shared/*": ["./src/shared/*"],
      "@layouts/*": ["./src/layouts/*"]
    }
  }
}
```

---

## Naming Conventions

| Element | Convention | Beispiel |
|---------|-----------|---------|
| Feature-Ordner | kebab-case | `wochenplan/`, `capacity/` |
| Komponenten | PascalCase | `WochenplanTable.tsx` |
| Hooks | camelCase mit `use` Prefix | `useWochenplan.ts` |
| Services | camelCase mit `Service` Suffix | `wochenplanService.ts` |
| Types | camelCase mit `.types.ts` | `wochenplan.types.ts` |
| Backend Services | camelCase mit `Service` Suffix | `baseService.ts` |
| Events | dot-notation | `task.created`, `assignment.updated` |
| API Routes | kebab-case | `/api/v1/task-assignments` |

---

## Abhängigkeiten zwischen Features

```
                    ┌──────────┐
                    │  shared  │  ← Foundation (Types, Hooks, Utils)
                    └────┬─────┘
                         │
          ┌──────────────┼──────────────┐
          │              │              │
     ┌────┴────┐   ┌────┴────┐   ┌────┴────┐
     │  auth   │   │settings │   │resources│
     └────┬────┘   └─────────┘   └────┬────┘
          │                           │
     ┌────┴────────────────┬──────────┤
     │                     │          │
┌────┴────┐          ┌────┴────┐  ┌──┴───────┐
│projects │          │  tasks  │  │ capacity │
└────┬────┘          └────┬────┘  └──────────┘
     │                    │
     └────────┬───────────┘
              │
        ┌─────┴─────┐
        │ wochenplan │  ← Aggregiert Projects, Tasks, Resources
        └─────┬─────┘
              │
        ┌─────┴─────┐
        │ pendenzen  │  ← Optional verknüpft mit Projects/Tasks
        └───────────┘
```
