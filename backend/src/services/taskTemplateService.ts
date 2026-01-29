import { pool } from '../config/database';
import type { TaskTemplate, TemplateTask } from '../models/taskTemplate';

export async function listTaskTemplates(options?: {
  productTypeId?: string;
  ownerId?: string;
  includeSystem?: boolean;
}): Promise<TaskTemplate[]> {
  const conditions: string[] = [];
  const values: string[] = [];
  let paramIndex = 1;

  if (options?.productTypeId) {
    conditions.push(`product_type_id = $${paramIndex++}`);
    values.push(options.productTypeId);
  }

  if (options?.ownerId && options?.includeSystem !== false) {
    conditions.push(`(is_system = true OR owner_id = $${paramIndex++})`);
    values.push(options.ownerId);
  } else if (options?.ownerId) {
    conditions.push(`owner_id = $${paramIndex++}`);
    values.push(options.ownerId);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await pool.query<TaskTemplate>(
    `SELECT * FROM task_templates ${where} ORDER BY is_system DESC, name ASC`,
    values
  );
  return result.rows;
}

export async function getTaskTemplateById(id: string): Promise<TaskTemplate | null> {
  const result = await pool.query<TaskTemplate>(
    `SELECT * FROM task_templates WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

export interface CreateTaskTemplateDTO {
  product_type_id: string;
  name: string;
  description?: string;
  tasks: TemplateTask[];
  is_default?: boolean;
  is_system?: boolean;
  owner_id?: string | null;
}

export async function createTaskTemplate(data: CreateTaskTemplateDTO): Promise<TaskTemplate> {
  const result = await pool.query<TaskTemplate>(
    `INSERT INTO task_templates (product_type_id, name, description, tasks, is_default, is_system, owner_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      data.product_type_id,
      data.name,
      data.description || null,
      JSON.stringify(data.tasks),
      data.is_default ?? false,
      data.is_system ?? false,
      data.owner_id ?? null,
    ]
  );
  return result.rows[0];
}

export interface UpdateTaskTemplateDTO {
  name?: string;
  description?: string | null;
  tasks?: TemplateTask[];
  is_default?: boolean;
}

export async function updateTaskTemplate(id: string, data: UpdateTaskTemplateDTO): Promise<TaskTemplate | null> {
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
  if (data.tasks !== undefined) {
    fields.push(`tasks = $${paramIndex++}`);
    values.push(JSON.stringify(data.tasks));
  }
  if (data.is_default !== undefined) {
    fields.push(`is_default = $${paramIndex++}`);
    values.push(data.is_default);
  }

  if (fields.length === 0) {
    return getTaskTemplateById(id);
  }

  fields.push(`updated_at = NOW()`);
  values.push(id);

  const result = await pool.query<TaskTemplate>(
    `UPDATE task_templates SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );
  return result.rows[0] || null;
}

export async function deleteTaskTemplate(id: string): Promise<boolean> {
  const result = await pool.query(
    `DELETE FROM task_templates WHERE id = $1`,
    [id]
  );
  return result.rowCount !== null && result.rowCount > 0;
}
