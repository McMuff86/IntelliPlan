import { pool } from '../config/database';
import type { Industry } from '../models/industry';

export async function listIndustries(): Promise<Industry[]> {
  const result = await pool.query<Industry>(
    `SELECT * FROM industries ORDER BY name ASC`
  );
  return result.rows;
}

export async function getIndustryById(id: string): Promise<Industry | null> {
  const result = await pool.query<Industry>(
    `SELECT * FROM industries WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

export interface CreateIndustryDTO {
  name: string;
  description?: string;
  icon?: string;
  settings?: Record<string, unknown>;
}

export async function createIndustry(data: CreateIndustryDTO): Promise<Industry> {
  const result = await pool.query<Industry>(
    `INSERT INTO industries (name, description, icon, settings)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [
      data.name,
      data.description || null,
      data.icon || null,
      JSON.stringify(data.settings || {}),
    ]
  );
  return result.rows[0];
}

export interface UpdateIndustryDTO {
  name?: string;
  description?: string | null;
  icon?: string | null;
  settings?: Record<string, unknown>;
}

export async function updateIndustry(id: string, data: UpdateIndustryDTO): Promise<Industry | null> {
  const fields: string[] = [];
  const values: (string | null)[] = [];
  let paramIndex = 1;

  if (data.name !== undefined) {
    fields.push(`name = $${paramIndex++}`);
    values.push(data.name);
  }
  if (data.description !== undefined) {
    fields.push(`description = $${paramIndex++}`);
    values.push(data.description);
  }
  if (data.icon !== undefined) {
    fields.push(`icon = $${paramIndex++}`);
    values.push(data.icon);
  }
  if (data.settings !== undefined) {
    fields.push(`settings = $${paramIndex++}`);
    values.push(JSON.stringify(data.settings));
  }

  if (fields.length === 0) {
    return getIndustryById(id);
  }

  fields.push(`updated_at = NOW()`);
  values.push(id);

  const result = await pool.query<Industry>(
    `UPDATE industries SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );
  return result.rows[0] || null;
}

export async function deleteIndustry(id: string): Promise<boolean> {
  const result = await pool.query(
    `DELETE FROM industries WHERE id = $1`,
    [id]
  );
  return result.rowCount !== null && result.rowCount > 0;
}
