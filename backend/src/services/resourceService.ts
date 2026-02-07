import { pool } from '../config/database';
import type { CreateResourceDTO, Resource, UpdateResourceDTO } from '../models/resource';

export async function createResource(data: CreateResourceDTO): Promise<Resource> {
  const result = await pool.query<Resource>(
    `INSERT INTO resources (
        owner_id, name, resource_type, description,
        is_active, availability_enabled,
        department, employee_type, short_code,
        default_location, weekly_hours, skills
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING *`,
    [
      data.owner_id,
      data.name,
      data.resource_type,
      data.description ?? null,
      data.is_active ?? true,
      data.availability_enabled ?? false,
      data.department ?? null,
      data.employee_type ?? null,
      data.short_code ?? null,
      data.default_location ?? null,
      data.weekly_hours ?? null,
      data.skills ?? null,
    ]
  );

  return result.rows[0];
}

export async function listResources(ownerId: string): Promise<Resource[]> {
  const result = await pool.query<Resource>(
    `SELECT * FROM resources WHERE owner_id = $1 ORDER BY created_at DESC`,
    [ownerId]
  );

  return result.rows;
}

export async function getResourceById(resourceId: string, ownerId: string): Promise<Resource | null> {
  const result = await pool.query<Resource>(
    `SELECT * FROM resources WHERE id = $1 AND owner_id = $2`,
    [resourceId, ownerId]
  );

  return result.rows[0] || null;
}

export async function getResourceByShortCode(shortCode: string): Promise<Resource | null> {
  const result = await pool.query<Resource>(
    `SELECT * FROM resources WHERE short_code = $1 AND deleted_at IS NULL`,
    [shortCode]
  );
  return result.rows[0] || null;
}

export async function getResourcesByDepartment(department: string): Promise<Resource[]> {
  const result = await pool.query<Resource>(
    `SELECT * FROM resources WHERE department = $1 AND is_active = true AND deleted_at IS NULL ORDER BY short_code ASC NULLS LAST, name ASC`,
    [department]
  );
  return result.rows;
}

export async function updateResource(
  resourceId: string,
  ownerId: string,
  data: UpdateResourceDTO
): Promise<Resource | null> {
  const fields: string[] = [];
  const values: (string | boolean | number | string[] | null)[] = [];
  let paramIndex = 1;

  if (data.name !== undefined) {
    fields.push(`name = $${paramIndex++}`);
    values.push(data.name);
  }
  if (data.resource_type !== undefined) {
    fields.push(`resource_type = $${paramIndex++}`);
    values.push(data.resource_type);
  }
  if (data.description !== undefined) {
    fields.push(`description = $${paramIndex++}`);
    values.push(data.description);
  }
  if (data.is_active !== undefined) {
    fields.push(`is_active = $${paramIndex++}`);
    values.push(data.is_active);
  }
  if (data.availability_enabled !== undefined) {
    fields.push(`availability_enabled = $${paramIndex++}`);
    values.push(data.availability_enabled);
  }
  if (data.department !== undefined) {
    fields.push(`department = $${paramIndex++}`);
    values.push(data.department);
  }
  if (data.employee_type !== undefined) {
    fields.push(`employee_type = $${paramIndex++}`);
    values.push(data.employee_type);
  }
  if (data.short_code !== undefined) {
    fields.push(`short_code = $${paramIndex++}`);
    values.push(data.short_code);
  }
  if (data.default_location !== undefined) {
    fields.push(`default_location = $${paramIndex++}`);
    values.push(data.default_location);
  }
  if (data.weekly_hours !== undefined) {
    fields.push(`weekly_hours = $${paramIndex++}`);
    values.push(data.weekly_hours);
  }
  if (data.skills !== undefined) {
    fields.push(`skills = $${paramIndex++}`);
    values.push(data.skills);
  }

  if (fields.length === 0) {
    return getResourceById(resourceId, ownerId);
  }

  fields.push(`updated_at = NOW()`);
  values.push(resourceId, ownerId);

  const result = await pool.query<Resource>(
    `UPDATE resources SET ${fields.join(', ')}
     WHERE id = $${paramIndex} AND owner_id = $${paramIndex + 1}
     RETURNING *`,
    values
  );

  return result.rows[0] || null;
}

export async function deleteResource(resourceId: string, ownerId: string): Promise<boolean> {
  const result = await pool.query(
    `DELETE FROM resources WHERE id = $1 AND owner_id = $2`,
    [resourceId, ownerId]
  );

  return result.rowCount !== null && result.rowCount > 0;
}
