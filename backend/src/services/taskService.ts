import { pool } from '../config/database';
import type { CreateTaskDTO, Task, TaskDependency, TaskWorkSlot, UpdateTaskDTO, DependencyType } from '../models/task';

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
        start_date,
        due_date
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      data.project_id,
      data.owner_id,
      data.title,
      data.description || null,
      data.status || 'planned',
      data.scheduling_mode || 'manual',
      data.duration_minutes ?? null,
      data.start_date ?? null,
      data.due_date ?? null,
    ]
  );

  return result.rows[0];
}

export async function listTasksByProject(projectId: string, ownerId: string): Promise<Task[]> {
  const result = await pool.query<Task>(
    `SELECT * FROM tasks WHERE project_id = $1 AND owner_id = $2 ORDER BY created_at DESC`,
    [projectId, ownerId]
  );

  return result.rows;
}

export async function getTaskById(taskId: string, ownerId: string): Promise<Task | null> {
  const result = await pool.query<Task>(
    `SELECT * FROM tasks WHERE id = $1 AND owner_id = $2`,
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
  isFixed = false
): Promise<TaskWorkSlot | null> {
  const result = await pool.query<TaskWorkSlot>(
    `INSERT INTO task_work_slots (task_id, start_time, end_time, is_fixed)
     SELECT $1, $2, $3, $4
     WHERE EXISTS (SELECT 1 FROM tasks WHERE id = $1 AND owner_id = $5)
     RETURNING *`,
    [taskId, startTime, endTime, isFixed, ownerId]
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

export async function deleteWorkSlot(slotId: string, ownerId: string): Promise<boolean> {
  const result = await pool.query(
    `DELETE FROM task_work_slots
     WHERE id = $1 AND task_id IN (SELECT id FROM tasks WHERE owner_id = $2)`,
    [slotId, ownerId]
  );

  return result.rowCount !== null && result.rowCount > 0;
}

export interface ShiftResult {
  shiftedTaskIds: string[];
  deltaDays: number;
}

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

const getDependentTaskIds = async (taskId: string, ownerId: string): Promise<string[]> => {
  const result = await pool.query<{ task_id: string }>(
    `WITH RECURSIVE deps AS (
        SELECT td.task_id
        FROM task_dependencies td
        JOIN tasks t ON td.task_id = t.id
        WHERE td.depends_on_task_id = $1 AND t.owner_id = $2
      UNION
        SELECT td.task_id
        FROM task_dependencies td
        JOIN tasks t ON td.task_id = t.id
        JOIN deps d ON td.depends_on_task_id = d.task_id
        WHERE t.owner_id = $2
     )
     SELECT DISTINCT task_id FROM deps`,
    [taskId, ownerId]
  );

  return result.rows.map((row) => row.task_id);
};

export const shiftTaskWithDependents = async (
  taskId: string,
  ownerId: string,
  deltaDays: number,
  cascade: boolean
): Promise<ShiftResult> => {
  const shiftedIds = new Set<string>();
  shiftedIds.add(taskId);

  if (cascade) {
    const dependentIds = await getDependentTaskIds(taskId, ownerId);
    dependentIds.forEach((id) => shiftedIds.add(id));
  }

  const ids = Array.from(shiftedIds);
  await shiftTaskSchedule(ids, ownerId, deltaDays);

  return {
    shiftedTaskIds: ids,
    deltaDays,
  };
};
