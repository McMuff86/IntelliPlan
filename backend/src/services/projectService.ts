import { pool } from '../config/database';
import { Project } from '../models/project';

export interface CreateProjectDTO {
  name: string;
  description?: string;
  owner_id: string;
  include_weekends?: boolean;
  workday_start?: string;
  workday_end?: string;
  work_template?: string;
  task_template_id?: string | null;
  order_number?: string | null;
  customer_name?: string | null;
  installation_location?: string | null;
  color?: string | null;
  contact_name?: string | null;
  contact_phone?: string | null;
  needs_callback?: boolean;
  sachbearbeiter?: string | null;
  worker_count?: number | null;
  helper_count?: number | null;
  remarks?: string | null;
}

export interface UpdateProjectDTO {
  name?: string;
  description?: string | null;
  include_weekends?: boolean;
  workday_start?: string;
  workday_end?: string;
  work_template?: string;
  order_number?: string | null;
  customer_name?: string | null;
  installation_location?: string | null;
  color?: string | null;
  contact_name?: string | null;
  contact_phone?: string | null;
  needs_callback?: boolean;
  sachbearbeiter?: string | null;
  worker_count?: number | null;
  helper_count?: number | null;
  remarks?: string | null;
}

export async function createProject(data: CreateProjectDTO): Promise<Project> {
  const result = await pool.query<Project>(
    `INSERT INTO projects (
       name, description, owner_id, include_weekends, workday_start, workday_end,
       work_template, task_template_id, order_number, customer_name,
       installation_location, color, contact_name, contact_phone,
       needs_callback, sachbearbeiter, worker_count, helper_count, remarks
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
     RETURNING *`,
    [
      data.name,
      data.description || null,
      data.owner_id,
      data.include_weekends ?? true,
      data.workday_start || '08:00',
      data.workday_end || '17:00',
      data.work_template || 'weekday_8_17',
      data.task_template_id || null,
      data.order_number ?? null,
      data.customer_name ?? null,
      data.installation_location ?? null,
      data.color ?? null,
      data.contact_name ?? null,
      data.contact_phone ?? null,
      data.needs_callback ?? false,
      data.sachbearbeiter ?? null,
      data.worker_count ?? null,
      data.helper_count ?? null,
      data.remarks ?? null,
    ]
  );

  return result.rows[0];
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface ListProjectsOptions {
  ownerId: string;
  limit?: number;
  offset?: number;
}

export async function listProjects(options: ListProjectsOptions): Promise<PaginatedResult<Project>> {
  const { ownerId, limit = 50, offset = 0 } = options;

  const countResult = await pool.query<{ count: string }>(
    `SELECT COUNT(*) as count FROM projects WHERE owner_id = $1 AND deleted_at IS NULL`,
    [ownerId]
  );

  const result = await pool.query<Project>(
    `SELECT * FROM projects WHERE owner_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
    [ownerId, limit, offset]
  );

  return {
    data: result.rows,
    total: parseInt(countResult.rows[0].count, 10),
    limit,
    offset,
  };
}

export async function getProjectById(id: string, ownerId: string): Promise<Project | null> {
  const result = await pool.query<Project>(
    `SELECT * FROM projects WHERE id = $1 AND owner_id = $2 AND deleted_at IS NULL`,
    [id, ownerId]
  );

  return result.rows[0] || null;
}

export async function updateProject(
  id: string,
  ownerId: string,
  data: UpdateProjectDTO
): Promise<Project | null> {
  const fields: string[] = [];
  const values: (string | boolean | number | null)[] = [];
  let paramIndex = 1;

  if (data.name !== undefined) {
    fields.push(`name = $${paramIndex++}`);
    values.push(data.name);
  }
  if (data.description !== undefined) {
    fields.push(`description = $${paramIndex++}`);
    values.push(data.description);
  }
  if (data.include_weekends !== undefined) {
    fields.push(`include_weekends = $${paramIndex++}`);
    values.push(data.include_weekends);
  }
  if (data.workday_start !== undefined) {
    fields.push(`workday_start = $${paramIndex++}`);
    values.push(data.workday_start);
  }
  if (data.workday_end !== undefined) {
    fields.push(`workday_end = $${paramIndex++}`);
    values.push(data.workday_end);
  }
  if (data.work_template !== undefined) {
    fields.push(`work_template = $${paramIndex++}`);
    values.push(data.work_template);
  }
  if (data.order_number !== undefined) {
    fields.push(`order_number = $${paramIndex++}`);
    values.push(data.order_number);
  }
  if (data.customer_name !== undefined) {
    fields.push(`customer_name = $${paramIndex++}`);
    values.push(data.customer_name);
  }
  if (data.installation_location !== undefined) {
    fields.push(`installation_location = $${paramIndex++}`);
    values.push(data.installation_location);
  }
  if (data.color !== undefined) {
    fields.push(`color = $${paramIndex++}`);
    values.push(data.color);
  }
  if (data.contact_name !== undefined) {
    fields.push(`contact_name = $${paramIndex++}`);
    values.push(data.contact_name);
  }
  if (data.contact_phone !== undefined) {
    fields.push(`contact_phone = $${paramIndex++}`);
    values.push(data.contact_phone);
  }
  if (data.needs_callback !== undefined) {
    fields.push(`needs_callback = $${paramIndex++}`);
    values.push(data.needs_callback);
  }
  if (data.sachbearbeiter !== undefined) {
    fields.push(`sachbearbeiter = $${paramIndex++}`);
    values.push(data.sachbearbeiter);
  }
  if (data.worker_count !== undefined) {
    fields.push(`worker_count = $${paramIndex++}`);
    values.push(data.worker_count);
  }
  if (data.helper_count !== undefined) {
    fields.push(`helper_count = $${paramIndex++}`);
    values.push(data.helper_count);
  }
  if (data.remarks !== undefined) {
    fields.push(`remarks = $${paramIndex++}`);
    values.push(data.remarks);
  }

  if (fields.length === 0) {
    return getProjectById(id, ownerId);
  }

  fields.push(`updated_at = NOW()`);
  values.push(id, ownerId);

  const result = await pool.query<Project>(
    `UPDATE projects SET ${fields.join(', ')} WHERE id = $${paramIndex} AND owner_id = $${paramIndex + 1} AND deleted_at IS NULL RETURNING *`,
    values
  );

  return result.rows[0] || null;
}

export async function deleteProject(id: string, ownerId: string): Promise<boolean> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `UPDATE projects SET deleted_at = NOW() WHERE id = $1 AND owner_id = $2 AND deleted_at IS NULL`,
      [id, ownerId]
    );
    if (result.rowCount === null || result.rowCount === 0) {
      await client.query('ROLLBACK');
      return false;
    }
    await client.query(
      `UPDATE tasks SET deleted_at = NOW() WHERE project_id = $1 AND deleted_at IS NULL`,
      [id]
    );
    await client.query('COMMIT');
    return true;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function listTrashedProjects(ownerId: string): Promise<Project[]> {
  const result = await pool.query<Project>(
    `SELECT * FROM projects WHERE owner_id = $1 AND deleted_at IS NOT NULL ORDER BY deleted_at DESC`,
    [ownerId]
  );
  return result.rows;
}

export async function restoreProject(id: string, ownerId: string): Promise<Project | null> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query<Project>(
      `UPDATE projects SET deleted_at = NULL WHERE id = $1 AND owner_id = $2 AND deleted_at IS NOT NULL RETURNING *`,
      [id, ownerId]
    );
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return null;
    }
    await client.query(
      `UPDATE tasks SET deleted_at = NULL WHERE project_id = $1 AND deleted_at IS NOT NULL`,
      [id]
    );
    await client.query('COMMIT');
    return result.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function permanentDeleteProject(id: string, ownerId: string): Promise<boolean> {
  const check = await pool.query(
    `SELECT id FROM projects WHERE id = $1 AND owner_id = $2 AND deleted_at IS NOT NULL`,
    [id, ownerId]
  );
  if (check.rows.length === 0) return false;

  const result = await pool.query(
    `DELETE FROM projects WHERE id = $1`,
    [id]
  );
  return result.rowCount !== null && result.rowCount > 0;
}

export async function updateProjectTaskTemplateId(
  projectId: string,
  ownerId: string,
  taskTemplateId: string
): Promise<void> {
  await pool.query(
    `UPDATE projects SET task_template_id = $1, updated_at = NOW() WHERE id = $2 AND owner_id = $3 AND deleted_at IS NULL`,
    [taskTemplateId, projectId, ownerId]
  );
}

export async function cleanupExpiredTrash(): Promise<number> {
  const result = await pool.query(
    `DELETE FROM projects WHERE deleted_at < NOW() - INTERVAL '5 days'`
  );
  return result.rowCount ?? 0;
}
