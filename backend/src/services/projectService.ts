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
}

export interface UpdateProjectDTO {
  name?: string;
  description?: string | null;
  include_weekends?: boolean;
  workday_start?: string;
  workday_end?: string;
  work_template?: string;
}

export async function createProject(data: CreateProjectDTO): Promise<Project> {
  const result = await pool.query<Project>(
    `INSERT INTO projects (name, description, owner_id, include_weekends, workday_start, workday_end, work_template)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      data.name,
      data.description || null,
      data.owner_id,
      data.include_weekends ?? true,
      data.workday_start || '08:00',
      data.workday_end || '17:00',
      data.work_template || 'weekday_8_17',
    ]
  );

  return result.rows[0];
}

export async function listProjects(ownerId: string): Promise<Project[]> {
  const result = await pool.query<Project>(
    `SELECT * FROM projects WHERE owner_id = $1 ORDER BY created_at DESC`,
    [ownerId]
  );

  return result.rows;
}

export async function getProjectById(id: string, ownerId: string): Promise<Project | null> {
  const result = await pool.query<Project>(
    `SELECT * FROM projects WHERE id = $1 AND owner_id = $2`,
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
  const values: (string | boolean | null)[] = [];
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

  if (fields.length === 0) {
    return getProjectById(id, ownerId);
  }

  fields.push(`updated_at = NOW()`);
  values.push(id, ownerId);

  const result = await pool.query<Project>(
    `UPDATE projects SET ${fields.join(', ')} WHERE id = $${paramIndex} AND owner_id = $${paramIndex + 1} RETURNING *`,
    values
  );

  return result.rows[0] || null;
}

export async function deleteProject(id: string, ownerId: string): Promise<boolean> {
  const result = await pool.query(`DELETE FROM projects WHERE id = $1 AND owner_id = $2`, [
    id,
    ownerId,
  ]);

  return result.rowCount !== null && result.rowCount > 0;
}
