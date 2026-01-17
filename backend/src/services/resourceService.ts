import { pool } from '../config/database';
import type { CreateResourceDTO, Resource, UpdateResourceDTO } from '../models/resource';

export async function createResource(data: CreateResourceDTO): Promise<Resource> {
  const result = await pool.query<Resource>(
    `INSERT INTO resources (
        owner_id,
        name,
        resource_type,
        description,
        is_active,
        availability_enabled
     ) VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      data.owner_id,
      data.name,
      data.resource_type,
      data.description ?? null,
      data.is_active ?? true,
      data.availability_enabled ?? false,
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

export async function updateResource(
  resourceId: string,
  ownerId: string,
  data: UpdateResourceDTO
): Promise<Resource | null> {
  const fields: string[] = [];
  const values: (string | boolean | null)[] = [];
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
