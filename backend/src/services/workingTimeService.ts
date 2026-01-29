import { pool } from '../config/database';
import type {
  WorkingTimeTemplate,
  WorkingTimeSlot,
  CreateTemplateDTO,
} from '../models/workingTimeTemplate';

export async function createTemplate(
  userId: string,
  dto: CreateTemplateDTO
): Promise<{ template: WorkingTimeTemplate; slots: WorkingTimeSlot[] }> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // If this template is default, unset other defaults for this user
    if (dto.isDefault) {
      await client.query(
        `UPDATE working_time_templates SET is_default = FALSE, updated_at = NOW() WHERE user_id = $1 AND is_default = TRUE`,
        [userId]
      );
    }

    const templateResult = await client.query<WorkingTimeTemplate>(
      `INSERT INTO working_time_templates (name, user_id, is_default)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [dto.name, userId, dto.isDefault ?? false]
    );
    const template = templateResult.rows[0];

    const slots: WorkingTimeSlot[] = [];
    for (const slot of dto.slots) {
      const slotResult = await client.query<WorkingTimeSlot>(
        `INSERT INTO working_time_slots (template_id, day_of_week, start_time, end_time)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [template.id, slot.dayOfWeek, slot.startTime, slot.endTime]
      );
      slots.push(slotResult.rows[0]);
    }

    await client.query('COMMIT');
    return { template, slots };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function getTemplates(
  userId: string
): Promise<{ template: WorkingTimeTemplate; slots: WorkingTimeSlot[] }[]> {
  const templatesResult = await pool.query<WorkingTimeTemplate>(
    `SELECT * FROM working_time_templates WHERE user_id = $1 ORDER BY created_at ASC`,
    [userId]
  );

  const results: { template: WorkingTimeTemplate; slots: WorkingTimeSlot[] }[] = [];
  for (const template of templatesResult.rows) {
    const slotsResult = await pool.query<WorkingTimeSlot>(
      `SELECT * FROM working_time_slots WHERE template_id = $1 ORDER BY day_of_week, start_time`,
      [template.id]
    );
    results.push({ template, slots: slotsResult.rows });
  }

  return results;
}

export async function getTemplate(
  id: string,
  userId: string
): Promise<{ template: WorkingTimeTemplate; slots: WorkingTimeSlot[] } | null> {
  const templateResult = await pool.query<WorkingTimeTemplate>(
    `SELECT * FROM working_time_templates WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );

  if (templateResult.rows.length === 0) {
    return null;
  }

  const template = templateResult.rows[0];
  const slotsResult = await pool.query<WorkingTimeSlot>(
    `SELECT * FROM working_time_slots WHERE template_id = $1 ORDER BY day_of_week, start_time`,
    [template.id]
  );

  return { template, slots: slotsResult.rows };
}

export async function updateTemplate(
  id: string,
  userId: string,
  dto: CreateTemplateDTO
): Promise<{ template: WorkingTimeTemplate; slots: WorkingTimeSlot[] } | null> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check template exists and belongs to user
    const existing = await client.query<WorkingTimeTemplate>(
      `SELECT * FROM working_time_templates WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      return null;
    }

    // If this template is default, unset other defaults
    if (dto.isDefault) {
      await client.query(
        `UPDATE working_time_templates SET is_default = FALSE, updated_at = NOW() WHERE user_id = $1 AND is_default = TRUE AND id != $2`,
        [userId, id]
      );
    }

    // Update template
    const templateResult = await client.query<WorkingTimeTemplate>(
      `UPDATE working_time_templates SET name = $1, is_default = $2, updated_at = NOW()
       WHERE id = $3 AND user_id = $4
       RETURNING *`,
      [dto.name, dto.isDefault ?? false, id, userId]
    );
    const template = templateResult.rows[0];

    // Delete old slots and insert new ones
    await client.query(`DELETE FROM working_time_slots WHERE template_id = $1`, [id]);

    const slots: WorkingTimeSlot[] = [];
    for (const slot of dto.slots) {
      const slotResult = await client.query<WorkingTimeSlot>(
        `INSERT INTO working_time_slots (template_id, day_of_week, start_time, end_time)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [template.id, slot.dayOfWeek, slot.startTime, slot.endTime]
      );
      slots.push(slotResult.rows[0]);
    }

    await client.query('COMMIT');
    return { template, slots };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteTemplate(id: string, userId: string): Promise<boolean> {
  const result = await pool.query(
    `DELETE FROM working_time_templates WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
  return result.rowCount !== null && result.rowCount > 0;
}

export async function getDefaultTemplate(
  userId: string
): Promise<{ template: WorkingTimeTemplate; slots: WorkingTimeSlot[] } | null> {
  const templateResult = await pool.query<WorkingTimeTemplate>(
    `SELECT * FROM working_time_templates WHERE user_id = $1 AND is_default = TRUE LIMIT 1`,
    [userId]
  );

  if (templateResult.rows.length === 0) {
    return null;
  }

  const template = templateResult.rows[0];
  const slotsResult = await pool.query<WorkingTimeSlot>(
    `SELECT * FROM working_time_slots WHERE template_id = $1 ORDER BY day_of_week, start_time`,
    [template.id]
  );

  return { template, slots: slotsResult.rows };
}

export async function createDefaultTemplates(
  userId: string
): Promise<{ template: WorkingTimeTemplate; slots: WorkingTimeSlot[] }[]> {
  const results: { template: WorkingTimeTemplate; slots: WorkingTimeSlot[] }[] = [];

  // Standard (Mo-Fr 07:00-17:00) with lunch break
  const standard = await createTemplate(userId, {
    name: 'Standard (Mo-Fr 07:00-17:00)',
    isDefault: true,
    slots: [1, 2, 3, 4, 5].flatMap((day) => [
      { dayOfWeek: day, startTime: '07:00', endTime: '12:00' },
      { dayOfWeek: day, startTime: '13:00', endTime: '17:00' },
    ]),
  });
  results.push(standard);

  // Extended (Mo-Fr 06:00-18:00, Sa 07:00-12:00)
  const extended = await createTemplate(userId, {
    name: 'Erweitert (Mo-Fr 06:00-18:00, Sa 07:00-12:00)',
    isDefault: false,
    slots: [
      ...[1, 2, 3, 4, 5].flatMap((day) => [
        { dayOfWeek: day, startTime: '06:00', endTime: '12:00' },
        { dayOfWeek: day, startTime: '13:00', endTime: '18:00' },
      ]),
      { dayOfWeek: 6, startTime: '07:00', endTime: '12:00' },
    ],
  });
  results.push(extended);

  return results;
}
