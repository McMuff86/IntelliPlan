# Wochenplan Reset Playbook (Tenant-sicher)

Stand: 2026-02-10

Dieses Playbook setzt Wochenplan-Daten fuer **einen** Tenant (`owner_id`) zurueck.

## 1. Was der Reset macht

Script: `backend/src/scripts/resetWochenplanData.ts`

Mit `--execute`:
- `task_assignments` des Tenants werden **soft-deleted** (`deleted_at` gesetzt).
- `task_phase_schedules` des Tenants werden geloescht.
- Optional werden `tasks.planned_week/planned_year` des Tenants auf `NULL` gesetzt.

Ohne `--execute` laeuft nur ein Dry-Run (Vorschau, keine Aenderung).

## 2. Voraussetzungen

1. DB-Backup erstellen (empfohlen).
2. Ziel-`owner_id` eindeutig bestimmen.
3. Sicherstellen, dass kein paralleler Import/Copy-Week Lauf aktiv ist.

## 3. Backup (Beispiel)

```bash
docker compose exec -T postgres pg_dump -U postgres -d intelliplan > backup-intelliplan-before-reset.sql
```

## 4. Dry-Run

```bash
cd backend
npm run reset:wochenplan -- --owner-id <OWNER_UUID>
```

Ausgabe zeigt u. a.:
- `assignmentsToSoftDelete`
- `phaseSchedulesToDelete`
- `tasksWithWeekPlanning`

## 5. Execute

```bash
cd backend
npm run reset:wochenplan -- --owner-id <OWNER_UUID> --execute
```

Wenn Wochen-Kennzahlen auf Tasks erhalten bleiben sollen:

```bash
cd backend
npm run reset:wochenplan -- --owner-id <OWNER_UUID> --execute --keep-task-weeks
```

## 6. Verifikation

```sql
-- A) Assignments sollten fuer den Tenant soft-deleted sein
SELECT COUNT(*) AS active_assignments
FROM task_assignments ta
JOIN tasks t ON t.id = ta.task_id
WHERE t.owner_id = '<OWNER_UUID>'
  AND t.deleted_at IS NULL
  AND ta.deleted_at IS NULL;

-- B) Keine Phase-Schedules fuer den Tenant
SELECT COUNT(*) AS phase_schedules
FROM task_phase_schedules tps
JOIN tasks t ON t.id = tps.task_id
WHERE t.owner_id = '<OWNER_UUID>'
  AND t.deleted_at IS NULL;

-- C) Optional: Wochenfelder auf Tasks
SELECT COUNT(*) AS tasks_with_week
FROM tasks
WHERE owner_id = '<OWNER_UUID>'
  AND deleted_at IS NULL
  AND (planned_week IS NOT NULL OR planned_year IS NOT NULL);
```

## 7. Sicherheitshinweise

- Script ist tenant-spezifisch (`owner_id` Pflichtparameter).
- Ohne `--execute` werden keine Daten geaendert.
- Vor produktiver Nutzung immer Dry-Run + Backup.
