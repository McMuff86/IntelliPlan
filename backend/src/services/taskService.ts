import { pool } from '../config/database';
import type {
  CreateTaskDTO,
  Task,
  TaskDependency,
  TaskWorkSlot,
  UpdateTaskDTO,
  DependencyType,
  ResourceType,
  TaskStatus,
} from '../models/task';

export interface TaskWorkSlotCalendar {
  id: string;
  task_id: string;
  task_title: string;
  project_id: string;
  project_name: string;
  start_time: string;
  end_time: string;
  is_fixed: boolean;
  is_all_day: boolean;
  task_duration_minutes: number | null;
}

export async function createTask(data: CreateTaskDTO): Promise<Task> {
  const result = await pool.query<Task>(
    `INSERT INTO tasks (
        project_id,
        owner_id,
        title,
        description,
        status,
        scheduling_mode,
        duration_minutes,
        resource_label,
        resource_id,
        start_date,
        due_date
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [
      data.project_id,
      data.owner_id,
      data.title,
      data.description || null,
      data.status || 'planned',
      data.scheduling_mode || 'manual',
      data.duration_minutes ?? null,
      data.resource_label ?? null,
      data.resource_id ?? null,
      data.start_date ?? null,
      data.due_date ?? null,
    ]
  );

  return result.rows[0];
}

type TaskWithBlocked = Task & {
  is_blocked?: boolean;
  resource_name?: string | null;
  resource_type?: ResourceType | null;
};

export async function listTasksByProject(projectId: string, ownerId: string): Promise<TaskWithBlocked[]> {
  const result = await pool.query<TaskWithBlocked>(
    `SELECT t.*,
            r.name AS resource_name,
            r.resource_type AS resource_type,
            COALESCE(BOOL_OR(dep.status <> 'done'), false) AS is_blocked
     FROM tasks t
     LEFT JOIN task_dependencies td ON td.task_id = t.id
     LEFT JOIN tasks dep ON td.depends_on_task_id = dep.id
     LEFT JOIN resources r ON t.resource_id = r.id
     WHERE t.project_id = $1 AND t.owner_id = $2
     GROUP BY t.id, r.name, r.resource_type
     ORDER BY t.created_at DESC`,
    [projectId, ownerId]
  );

  return result.rows;
}

export async function getTaskById(taskId: string, ownerId: string): Promise<TaskWithBlocked | null> {
  const result = await pool.query<TaskWithBlocked>(
    `SELECT t.*,
            r.name AS resource_name,
            r.resource_type AS resource_type,
            COALESCE(BOOL_OR(dep.status <> 'done'), false) AS is_blocked
     FROM tasks t
     LEFT JOIN task_dependencies td ON td.task_id = t.id
     LEFT JOIN tasks dep ON td.depends_on_task_id = dep.id
     LEFT JOIN resources r ON t.resource_id = r.id
     WHERE t.id = $1 AND t.owner_id = $2
     GROUP BY t.id, r.name, r.resource_type`,
    [taskId, ownerId]
  );

  return result.rows[0] || null;
}

export async function updateTask(
  taskId: string,
  ownerId: string,
  data: UpdateTaskDTO
): Promise<Task | null> {
  const fields: string[] = [];
  const values: (string | number | null)[] = [];
  let paramIndex = 1;

  if (data.title !== undefined) {
    fields.push(`title = $${paramIndex++}`);
    values.push(data.title);
  }
  if (data.description !== undefined) {
    fields.push(`description = $${paramIndex++}`);
    values.push(data.description);
  }
  if (data.status !== undefined) {
    fields.push(`status = $${paramIndex++}`);
    values.push(data.status);
  }
  if (data.scheduling_mode !== undefined) {
    fields.push(`scheduling_mode = $${paramIndex++}`);
    values.push(data.scheduling_mode);
  }
  if (data.duration_minutes !== undefined) {
    fields.push(`duration_minutes = $${paramIndex++}`);
    values.push(data.duration_minutes);
  }
  if (data.resource_label !== undefined) {
    fields.push(`resource_label = $${paramIndex++}`);
    values.push(data.resource_label);
  }
  if (data.resource_id !== undefined) {
    fields.push(`resource_id = $${paramIndex++}`);
    values.push(data.resource_id);
  }
  if (data.start_date !== undefined) {
    fields.push(`start_date = $${paramIndex++}`);
    values.push(data.start_date);
  }
  if (data.due_date !== undefined) {
    fields.push(`due_date = $${paramIndex++}`);
    values.push(data.due_date);
  }

  if (fields.length === 0) {
    return getTaskById(taskId, ownerId);
  }

  fields.push(`updated_at = NOW()`);
  values.push(taskId, ownerId);

  const result = await pool.query<Task>(
    `UPDATE tasks SET ${fields.join(', ')}
     WHERE id = $${paramIndex} AND owner_id = $${paramIndex + 1}
     RETURNING *`,
    values
  );

  return result.rows[0] || null;
}

export async function deleteTask(taskId: string, ownerId: string): Promise<boolean> {
  const result = await pool.query(
    `DELETE FROM tasks WHERE id = $1 AND owner_id = $2`,
    [taskId, ownerId]
  );

  return result.rowCount !== null && result.rowCount > 0;
}

export async function createDependency(
  taskId: string,
  ownerId: string,
  dependsOnTaskId: string,
  dependencyType: DependencyType
): Promise<TaskDependency | null> {
  const result = await pool.query<TaskDependency>(
    `INSERT INTO task_dependencies (task_id, depends_on_task_id, dependency_type)
     SELECT $1, $2, $3
     WHERE EXISTS (SELECT 1 FROM tasks WHERE id = $1 AND owner_id = $4)
     RETURNING *`,
    [taskId, dependsOnTaskId, dependencyType, ownerId]
  );

  return result.rows[0] || null;
}

export async function listDependencies(taskId: string, ownerId: string): Promise<TaskDependency[]> {
  const result = await pool.query<TaskDependency>(
    `SELECT td.*
     FROM task_dependencies td
     JOIN tasks t ON td.task_id = t.id
     WHERE td.task_id = $1 AND t.owner_id = $2
     ORDER BY td.created_at ASC`,
    [taskId, ownerId]
  );

  return result.rows;
}

export async function isTaskBlocked(taskId: string, ownerId: string): Promise<boolean> {
  const result = await pool.query<{ dependency_type: DependencyType; status: TaskStatus }>(
    `SELECT td.dependency_type, dep.status
     FROM task_dependencies td
     JOIN tasks t ON td.task_id = t.id
     JOIN tasks dep ON td.depends_on_task_id = dep.id
     WHERE t.id = $1 AND t.owner_id = $2`,
    [taskId, ownerId]
  );

  return result.rows.some((row) => {
    if (row.dependency_type === 'start_start') {
      return row.status === 'planned';
    }
    if (row.dependency_type === 'finish_finish') {
      return false;
    }
    return row.status !== 'done';
  });
}

export async function deleteDependency(dependencyId: string, ownerId: string): Promise<boolean> {
  const result = await pool.query(
    `DELETE FROM task_dependencies
     WHERE id = $1 AND task_id IN (SELECT id FROM tasks WHERE owner_id = $2)`,
    [dependencyId, ownerId]
  );

  return result.rowCount !== null && result.rowCount > 0;
}

export async function createWorkSlot(
  taskId: string,
  ownerId: string,
  startTime: string,
  endTime: string,
  isFixed = false,
  isAllDay = false
): Promise<TaskWorkSlot | null> {
  const result = await pool.query<TaskWorkSlot>(
    `INSERT INTO task_work_slots (task_id, start_time, end_time, is_fixed, is_all_day)
     SELECT $1, $2, $3, $4, $5
     WHERE EXISTS (SELECT 1 FROM tasks WHERE id = $1 AND owner_id = $6)
     RETURNING *`,
    [taskId, startTime, endTime, isFixed, isAllDay, ownerId]
  );

  return result.rows[0] || null;
}

export async function listWorkSlots(taskId: string, ownerId: string): Promise<TaskWorkSlot[]> {
  const result = await pool.query<TaskWorkSlot>(
    `SELECT tws.*
     FROM task_work_slots tws
     JOIN tasks t ON tws.task_id = t.id
     WHERE tws.task_id = $1 AND t.owner_id = $2
     ORDER BY tws.start_time ASC`,
    [taskId, ownerId]
  );

  return result.rows;
}

export async function listWorkSlotsForCalendar(ownerId: string): Promise<TaskWorkSlotCalendar[]> {
  const result = await pool.query<TaskWorkSlotCalendar>(
    `SELECT tws.id,
            tws.task_id,
            t.title AS task_title,
            t.project_id,
            p.name AS project_name,
            tws.start_time,
            tws.end_time,
            tws.is_fixed,
            tws.is_all_day,
            t.duration_minutes AS task_duration_minutes
     FROM task_work_slots tws
     JOIN tasks t ON tws.task_id = t.id
     JOIN projects p ON t.project_id = p.id
     WHERE t.owner_id = $1
     ORDER BY tws.start_time ASC`,
    [ownerId]
  );

  return result.rows;
}

export async function deleteWorkSlot(slotId: string, ownerId: string): Promise<boolean> {
  const result = await pool.query(
    `DELETE FROM task_work_slots
     WHERE id = $1 AND task_id IN (SELECT id FROM tasks WHERE owner_id = $2)`,
    [slotId, ownerId]
  );

  return result.rowCount !== null && result.rowCount > 0;
}

export async function getWorkSlotById(slotId: string, ownerId: string): Promise<TaskWorkSlot | null> {
  const result = await pool.query<TaskWorkSlot>(
    `SELECT tws.*
     FROM task_work_slots tws
     JOIN tasks t ON tws.task_id = t.id
     WHERE tws.id = $1 AND t.owner_id = $2`,
    [slotId, ownerId]
  );

  return result.rows[0] || null;
}

export async function getDependencyById(
  dependencyId: string,
  ownerId: string
): Promise<TaskDependency | null> {
  const result = await pool.query<TaskDependency>(
    `SELECT td.*
     FROM task_dependencies td
     JOIN tasks t ON td.task_id = t.id
     WHERE td.id = $1 AND t.owner_id = $2`,
    [dependencyId, ownerId]
  );

  return result.rows[0] || null;
}

export interface ShiftResult {
  shiftedTaskIds: string[];
  deltaDays: number;
  shiftedTasks?: { taskId: string; deltaDays: number }[];
}

interface DependencyEdge {
  task_id: string;
  depends_on_task_id: string;
  dependency_type: DependencyType;
}

interface TaskScheduleSnapshot {
  start: Date | null;
  end: Date | null;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const toDate = (value: string | null): Date | null => {
  if (!value) return null;
  return new Date(value);
};

const shiftDate = (value: Date, days: number): Date => new Date(value.getTime() + days * MS_PER_DAY);

const shiftTaskSchedule = async (taskIds: string[], ownerId: string, deltaDays: number): Promise<void> => {
  if (taskIds.length === 0 || deltaDays === 0) {
    return;
  }

  await pool.query(
    `UPDATE task_work_slots
     SET start_time = start_time + ($1 || ' days')::interval,
         end_time = end_time + ($1 || ' days')::interval,
         updated_at = NOW()
     WHERE task_id = ANY($2::uuid[])
       AND task_id IN (SELECT id FROM tasks WHERE owner_id = $3)`,
    [deltaDays, taskIds, ownerId]
  );

  await pool.query(
    `UPDATE tasks
     SET start_date = CASE
           WHEN start_date IS NULL THEN NULL
           ELSE (start_date + ($1 || ' days')::interval)::date
         END,
         due_date = CASE
           WHEN due_date IS NULL THEN NULL
           ELSE (due_date + ($1 || ' days')::interval)::date
         END,
         updated_at = NOW()
     WHERE id = ANY($2::uuid[])
       AND owner_id = $3`,
    [deltaDays, taskIds, ownerId]
  );
};

export async function shiftProjectSchedule(
  projectId: string,
  ownerId: string,
  deltaDays: number
): Promise<ShiftResult> {
  if (deltaDays === 0) {
    return { shiftedTaskIds: [], deltaDays, shiftedTasks: [] };
  }

  const result = await pool.query<{ id: string }>(
    `SELECT id FROM tasks WHERE project_id = $1 AND owner_id = $2`,
    [projectId, ownerId]
  );

  const ids = result.rows.map((row) => row.id);
  if (ids.length === 0) {
    return { shiftedTaskIds: [], deltaDays, shiftedTasks: [] };
  }

  await shiftTaskSchedule(ids, ownerId, deltaDays);

  return {
    shiftedTaskIds: ids,
    deltaDays,
    shiftedTasks: ids.map((id) => ({ taskId: id, deltaDays })),
  };
}

const getDependentEdges = async (taskId: string, ownerId: string): Promise<DependencyEdge[]> => {
  const result = await pool.query<DependencyEdge>(
    `WITH RECURSIVE deps AS (
        SELECT td.task_id, td.depends_on_task_id, td.dependency_type
        FROM task_dependencies td
        JOIN tasks t ON td.task_id = t.id
        WHERE td.depends_on_task_id = $1 AND t.owner_id = $2
      UNION
        SELECT td.task_id, td.depends_on_task_id, td.dependency_type
        FROM task_dependencies td
        JOIN tasks t ON td.task_id = t.id
        JOIN deps d ON td.depends_on_task_id = d.task_id
        WHERE t.owner_id = $2
     )
     SELECT DISTINCT task_id, depends_on_task_id, dependency_type FROM deps`,
    [taskId, ownerId]
  );

  return result.rows;
};

const getConnectedTaskIds = async (taskId: string, ownerId: string): Promise<string[]> => {
  const result = await pool.query<{ id: string }>(
    `WITH RECURSIVE edges AS (
        SELECT td.task_id, td.depends_on_task_id
        FROM task_dependencies td
        JOIN tasks t1 ON td.task_id = t1.id
        JOIN tasks t2 ON td.depends_on_task_id = t2.id
        WHERE t1.owner_id = $2 AND t2.owner_id = $2
      ),
      connected AS (
        SELECT $1::uuid AS id
        UNION
        SELECT e.task_id
        FROM edges e
        JOIN connected c ON e.depends_on_task_id = c.id
        UNION
        SELECT e.depends_on_task_id
        FROM edges e
        JOIN connected c ON e.task_id = c.id
      )
     SELECT DISTINCT id FROM connected`,
    [taskId, ownerId]
  );

  return result.rows.map((row) => row.id);
};

const getTaskScheduleSnapshots = async (
  taskIds: string[],
  ownerId: string
): Promise<Map<string, TaskScheduleSnapshot>> => {
  if (taskIds.length === 0) {
    return new Map();
  }

  const result = await pool.query<{
    id: string;
    start_date: string | null;
    due_date: string | null;
    min_slot_start: string | null;
    max_slot_end: string | null;
  }>(
    `SELECT t.id,
            t.start_date,
            t.due_date,
            MIN(tws.start_time) AS min_slot_start,
            MAX(tws.end_time) AS max_slot_end
     FROM tasks t
     LEFT JOIN task_work_slots tws ON tws.task_id = t.id
     WHERE t.id = ANY($1::uuid[]) AND t.owner_id = $2
     GROUP BY t.id`,
    [taskIds, ownerId]
  );

  const map = new Map<string, TaskScheduleSnapshot>();
  result.rows.forEach((row) => {
    const start = toDate(row.min_slot_start) ?? toDate(row.start_date);
    const end = toDate(row.max_slot_end) ?? toDate(row.due_date);
    map.set(row.id, { start, end });
  });

  return map;
};

export const shiftTaskWithDependents = async (
  taskId: string,
  ownerId: string,
  deltaDays: number,
  cascade: boolean,
  shiftBlock = false
): Promise<ShiftResult> => {
  if (shiftBlock) {
    const blockIds = await getConnectedTaskIds(taskId, ownerId);
    await shiftTaskSchedule(blockIds, ownerId, deltaDays);
    return {
      shiftedTaskIds: blockIds,
      deltaDays,
      shiftedTasks: blockIds.map((id) => ({ taskId: id, deltaDays })),
    };
  }

  const shiftMap = new Map<string, number>();
  shiftMap.set(taskId, deltaDays);

  if (cascade) {
    const edges = await getDependentEdges(taskId, ownerId);
    if (edges.length > 0) {
      const dependentsByParent = new Map<string, DependencyEdge[]>();
      const taskIds = new Set<string>([taskId]);

      edges.forEach((edge) => {
        taskIds.add(edge.task_id);
        taskIds.add(edge.depends_on_task_id);
        const list = dependentsByParent.get(edge.depends_on_task_id);
        if (list) {
          list.push(edge);
        } else {
          dependentsByParent.set(edge.depends_on_task_id, [edge]);
        }
      });

      const scheduleMap = await getTaskScheduleSnapshots(Array.from(taskIds), ownerId);
      const queue: string[] = [taskId];

      // Walk dependency graph to compute minimal forward shifts that satisfy type-specific constraints.
      while (queue.length > 0) {
        const currentId = queue.shift() as string;
        const currentShift = shiftMap.get(currentId) ?? 0;
        const currentSchedule = scheduleMap.get(currentId);
        const edgesForParent = dependentsByParent.get(currentId) ?? [];

        edgesForParent.forEach((edge) => {
          const childId = edge.task_id;
          const existingShift = shiftMap.get(childId) ?? 0;
          const childSchedule = scheduleMap.get(childId);

          const parentAnchor =
            edge.dependency_type === 'start_start' ? currentSchedule?.start ?? null : currentSchedule?.end ?? null;
          const childAnchor =
            edge.dependency_type === 'finish_finish' ? childSchedule?.end ?? null : childSchedule?.start ?? null;

          let nextShift = existingShift;
          if (parentAnchor && childAnchor) {
            const parentShifted = shiftDate(parentAnchor, currentShift);
            const childShifted = shiftDate(childAnchor, existingShift);
            const diffMs = parentShifted.getTime() - childShifted.getTime();
            if (diffMs > 0) {
              const diffDays = Math.ceil(diffMs / MS_PER_DAY);
              nextShift = existingShift + diffDays;
            }
          } else if (currentShift > 0) {
            nextShift = Math.max(existingShift, currentShift);
          }

          if (nextShift > existingShift) {
            shiftMap.set(childId, nextShift);
            queue.push(childId);
          }
        });
      }
    }
  }

  const shiftsByDays = new Map<number, string[]>();
  shiftMap.forEach((days, id) => {
    if (days === 0) return;
    const list = shiftsByDays.get(days);
    if (list) {
      list.push(id);
    } else {
      shiftsByDays.set(days, [id]);
    }
  });

  for (const [days, ids] of shiftsByDays.entries()) {
    await shiftTaskSchedule(ids, ownerId, days);
  }

  const shiftedTasks = Array.from(shiftMap.entries())
    .filter(([, days]) => days !== 0)
    .map(([id, days]) => ({ taskId: id, deltaDays: days }));

  return {
    shiftedTaskIds: shiftedTasks.map((task) => task.taskId),
    deltaDays,
    shiftedTasks,
  };
};
