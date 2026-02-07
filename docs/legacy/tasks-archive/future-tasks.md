# Future Tasks

Track upcoming features and PRDs to be created.

## Pending PRDs

### High Priority (Core Features)

| Feature | Description | Status |
|---------|-------------|--------|
| Appointment Management | CRUD, views, overlap detection, roles | In progress (CRUD + calendar views done; roles/auth pending) |
| Reminders | Add reminders, templates, ICS import | Pending |
| Auth & Access | OAuth (Google/Microsoft), sessions, roles, teams | Not started |

### Medium Priority

| Feature | Description | Status |
|---------|-------------|--------|
| External Calendar Integration | Google/Outlook OAuth, bidirectional sync | Pending |
| Search & Filtering | Text search, date/time filters, advanced filters | Pending |
| User Interface | Themes, responsive design, accessibility | In progress (Phase B done; visual refresh ongoing) |
| Data Persistence | Local storage, backup, sync | Pending |
| Timezones & Time Management | UTC storage, ISO 8601, geolocation detection | Partial (UTC storage done; user settings pending) |

### API & Technical Goals

| Feature | Description | Status |
|---------|-------------|--------|
| RESTful API Design | Idempotency, versioning, documentation | Pending |
| API Prediction Endpoints | ML-based suggestions (Phase 2 AI) | Pending |

## AI Extensions (Phase 2)

These extend core features with ML capabilities:

| Feature | AI Extension | Status |
|---------|--------------|--------|
| Appointment Management | ML-based conflict resolution | Pending |
| Reminders | Personalized timing via ML | Pending |
| Timezones | Geolocation-based detection | Pending |
| Calendar Integration | ML merge conflict resolution | Pending |
| Search | Semantic search (BERT models) | Pending |
| UI | Adaptive layout (ML user behavior) | Pending |
| Data Persistence | ML backup suggestions | Pending |

## Nice-to-Have (Long-term)

- Task and project management
- Collaboration & communication
- Document management
- Visual views (Kanban, Gantt)
- Automations
- Time & resource management
- Reports & analytics
- Integrations (Slack, Drive)
- User & team management
- Mobile & offline support
- Advanced appointment features
- Security & compliance

---

## Next Implementation Order (Recommended)

1) Authentication + OAuth (Google/Microsoft) with session or JWT handling
2) Role-based access (admin/team) and team visibility rules
3) Search and filtering across appointments (text + date range)
4) Reminders (templates, scheduling, notifications)
5) External calendar sync (ICS + Google/Outlook bidirectional)
6) Observability: structured logs, error tracking, and basic CI tests

## How to Create a New PRD

```
Load the prd skill and create a PRD for [feature name]
```

## How to Convert PRD to Ralph Format

```
Load the ralph skill and convert tasks/prd-[feature-name].md to prd.json
```