import { pool } from '../config/database';
import type { CreateResourceDTO, Department, EmployeeType, Resource, ResourceType, UpdateResourceDTO } from '../models/resource';

export interface ListResourcesFilters {
  department?: Department;
  employee_type?: EmployeeType;
  is_active?: boolean;
  resource_type?: ResourceType;
}

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

export async function listResources(ownerId: string, filters?: ListResourcesFilters): Promise<Resource[]> {
  const conditions: string[] = ['owner_id = $1'];
  const values: (string | boolean)[] = [ownerId];
  let paramIndex = 2;

  if (filters?.department !== undefined) {
    conditions.push(`department = $${paramIndex++}`);
    values.push(filters.department);
  }
  if (filters?.employee_type !== undefined) {
    conditions.push(`employee_type = $${paramIndex++}`);
    values.push(filters.employee_type);
  }
  if (filters?.is_active !== undefined) {
    conditions.push(`is_active = $${paramIndex++}`);
    values.push(filters.is_active);
  }
  if (filters?.resource_type !== undefined) {
    conditions.push(`resource_type = $${paramIndex++}`);
    values.push(filters.resource_type);
  }

  const result = await pool.query<Resource>(
    `SELECT * FROM resources WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC`,
    values
  );

  return result.rows;
}

export type HalfDay = 'morning' | 'afternoon' | 'full_day';

export async function getAvailableResourcesForDate(
  ownerId: string,
  date: string,
  halfDay: HalfDay,
): Promise<Resource[]> {
  // A resource is "unavailable" for a slot if it has an assignment for that date
  // with the same half_day or full_day (full_day blocks both morning and afternoon).
  const halfDayConditions = halfDay === 'full_day'
    ? `ta.half_day IN ('morning', 'afternoon', 'full_day')`
    : `ta.half_day IN ($4, 'full_day')`;

  const params: (string | boolean)[] = [ownerId, date, date];
  if (halfDay !== 'full_day') {
    params.push(halfDay);
  }

  const result = await pool.query<Resource>(
    `SELECT r.* FROM resources r
     WHERE r.owner_id = $1
       AND r.is_active = true
       AND r.resource_type = 'person'
       AND r.id NOT IN (
         SELECT ta.resource_id FROM task_assignments ta
         WHERE ta.assignment_date = $2
           AND ta.deleted_at IS NULL
           AND ${halfDayConditions}
       )
     ORDER BY r.short_code ASC NULLS LAST, r.name ASC`,
    params
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
