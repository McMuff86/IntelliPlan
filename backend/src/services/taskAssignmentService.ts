import { pool } from '../config/database';
import type {
  BulkCreateAssignmentDTO,
  CreateTaskAssignmentDTO,
  TaskAssignment,
  TaskAssignmentWithNames,
  UpdateTaskAssignmentDTO,
} from '../models/taskAssignment';

// ─── Helpers ───────────────────────────────────────────

const SELECT_WITH_NAMES = `
  SELECT
    ta.*,
    r.name AS resource_name,
    r.short_code AS resource_short_code,
    t.title AS task_title,
    t.project_id AS project_id,
    p.name AS project_name
  FROM task_assignments ta
  JOIN resources r ON r.id = ta.resource_id
  JOIN tasks t ON t.id = ta.task_id
  JOIN projects p ON p.id = t.project_id
`;

// ─── CRUD ──────────────────────────────────────────────

export async function createTaskAssignment(data: CreateTaskAssignmentDTO): Promise<TaskAssignmentWithNames> {
  const result = await pool.query<TaskAssignment>(
    `INSERT INTO task_assignments (
      task_id, resource_id, assignment_date, half_day,
      notes, is_fixed, start_time, status_code
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *`,
    [
      data.task_id,
      data.resource_id,
      data.assignment_date,
      data.half_day,
      data.notes ?? null,
      data.is_fixed ?? false,
      data.start_time ?? null,
      data.status_code ?? 'assigned',
    ]
  );

  return getTaskAssignmentById(result.rows[0].id) as Promise<TaskAssignmentWithNames>;
}

export async function getTaskAssignmentById(id: string): Promise<TaskAssignmentWithNames | null> {
  const result = await pool.query<TaskAssignmentWithNames>(
    `${SELECT_WITH_NAMES} WHERE ta.id = $1 AND ta.deleted_at IS NULL`,
    [id]
  );
  return result.rows[0] ?? null;
}

export async function updateTaskAssignment(
  id: string,
  data: UpdateTaskAssignmentDTO
): Promise<TaskAssignmentWithNames | null> {
  const fields: string[] = [];
  const params: unknown[] = [];
  let paramIdx = 1;

  const mappings: [keyof UpdateTaskAssignmentDTO, string][] = [
    ['resource_id', 'resource_id'],
    ['assignment_date', 'assignment_date'],
    ['half_day', 'half_day'],
    ['notes', 'notes'],
    ['is_fixed', 'is_fixed'],
    ['start_time', 'start_time'],
    ['status_code', 'status_code'],
  ];

  for (const [key, col] of mappings) {
    if (data[key] !== undefined) {
      fields.push(`${col} = $${paramIdx}`);
      params.push(data[key]);
      paramIdx++;
    }
  }

  if (fields.length === 0) {
    return getTaskAssignmentById(id);
  }

  const result = await pool.query<TaskAssignment>(
    `UPDATE task_assignments SET ${fields.join(', ')} WHERE id = $${paramIdx} AND deleted_at IS NULL RETURNING *`,
    [...params, id]
  );

  if (result.rowCount === 0) return null;

  return getTaskAssignmentById(id);
}

export async function deleteTaskAssignment(id: string): Promise<boolean> {
  const result = await pool.query(
    `UPDATE task_assignments SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL`,
    [id]
  );
  return (result.rowCount ?? 0) > 0;
}

// ─── Bulk Create ───────────────────────────────────────

export async function bulkCreateAssignments(data: BulkCreateAssignmentDTO): Promise<TaskAssignmentWithNames[]> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const createdIds: string[] = [];

    for (const date of data.dates) {
      const result = await client.query<TaskAssignment>(
        `INSERT INTO task_assignments (
          task_id, resource_id, assignment_date, half_day,
          is_fixed, status_code
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id`,
        [
          data.task_id,
          data.resource_id,
          date,
          data.half_day,
          data.is_fixed ?? false,
          data.status_code ?? 'assigned',
        ]
      );
      createdIds.push(result.rows[0].id);
    }

    await client.query('COMMIT');

    // Fetch all created assignments with names
    const result = await pool.query<TaskAssignmentWithNames>(
      `${SELECT_WITH_NAMES} WHERE ta.id = ANY($1) AND ta.deleted_at IS NULL ORDER BY ta.assignment_date ASC`,
      [createdIds]
    );

    return result.rows;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// ─── Queries ───────────────────────────────────────────

export interface ListAssignmentsOptions {
  from?: string;
  to?: string;
  resourceId?: string;
  taskId?: string;
  statusCode?: string;
  limit?: number;
  offset?: number;
}

export interface PaginatedAssignments {
  data: TaskAssignmentWithNames[];
  total: number;
  limit: number;
  offset: number;
}

export async function listAssignments(opts: ListAssignmentsOptions): Promise<PaginatedAssignments> {
  const conditions: string[] = ['ta.deleted_at IS NULL'];
  const params: unknown[] = [];
  let paramIdx = 1;

  if (opts.from) {
    conditions.push(`ta.assignment_date >= $${paramIdx}`);
    params.push(opts.from);
    paramIdx++;
  }

  if (opts.to) {
    conditions.push(`ta.assignment_date <= $${paramIdx}`);
    params.push(opts.to);
    paramIdx++;
  }

  if (opts.resourceId) {
    conditions.push(`ta.resource_id = $${paramIdx}`);
    params.push(opts.resourceId);
    paramIdx++;
  }

  if (opts.taskId) {
    conditions.push(`ta.task_id = $${paramIdx}`);
    params.push(opts.taskId);
    paramIdx++;
  }

  if (opts.statusCode) {
    conditions.push(`ta.status_code = $${paramIdx}`);
    params.push(opts.statusCode);
    paramIdx++;
  }

  const whereClause = conditions.join(' AND ');
  const limit = opts.limit ?? 100;
  const offset = opts.offset ?? 0;

  // Count
  const countResult = await pool.query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM task_assignments ta WHERE ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].count, 10);

  // Data
  const dataResult = await pool.query<TaskAssignmentWithNames>(
    `${SELECT_WITH_NAMES} WHERE ${whereClause} ORDER BY ta.assignment_date ASC, ta.half_day ASC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
    [...params, limit, offset]
  );

  return { data: dataResult.rows, total, limit, offset };
}

export async function getAssignmentsByTask(taskId: string): Promise<TaskAssignmentWithNames[]> {
  const result = await pool.query<TaskAssignmentWithNames>(
    `${SELECT_WITH_NAMES} WHERE ta.task_id = $1 AND ta.deleted_at IS NULL ORDER BY ta.assignment_date ASC, ta.half_day ASC`,
    [taskId]
  );
  return result.rows;
}

export async function getAssignmentsByResource(
  resourceId: string,
  from: string,
  to: string
): Promise<TaskAssignmentWithNames[]> {
  const result = await pool.query<TaskAssignmentWithNames>(
    `${SELECT_WITH_NAMES} WHERE ta.resource_id = $1 AND ta.assignment_date >= $2 AND ta.assignment_date <= $3 AND ta.deleted_at IS NULL ORDER BY ta.assignment_date ASC, ta.half_day ASC`,
    [resourceId, from, to]
  );
  return result.rows;
}
