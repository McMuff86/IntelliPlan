import { pool } from '../config/database';
import { Appointment, CreateAppointmentDTO, UpdateAppointmentDTO, OverlapResult, toAppointmentResponse } from '../models/appointment';

export interface ListAppointmentsOptions {
  userId: string;
  start?: string;
  end?: string;
  limit?: number;
  offset?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

export async function createAppointment(data: CreateAppointmentDTO): Promise<Appointment> {
  const { title, description, start_time, end_time, timezone = 'UTC', user_id } = data;

  const result = await pool.query<Appointment>(
    `INSERT INTO appointments (title, description, start_time, end_time, timezone, user_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [title, description || null, start_time, end_time, timezone, user_id]
  );

  return result.rows[0];
}

export async function getAppointments(options: ListAppointmentsOptions): Promise<PaginatedResult<Appointment>> {
  const { userId, start, end, limit = 50, offset = 0 } = options;
  const params: (string | number)[] = [userId];
  let whereClause = 'WHERE user_id = $1 AND deleted_at IS NULL';
  let paramIndex = 2;

  if (start) {
    whereClause += ` AND start_time >= $${paramIndex}`;
    params.push(start);
    paramIndex++;
  }

  if (end) {
    whereClause += ` AND end_time <= $${paramIndex}`;
    params.push(end);
    paramIndex++;
  }

  const countResult = await pool.query<{ count: string }>(
    `SELECT COUNT(*) as count FROM appointments ${whereClause}`,
    params
  );

  params.push(limit, offset);
  const result = await pool.query<Appointment>(
    `SELECT * FROM appointments ${whereClause} ORDER BY start_time ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    params
  );

  return {
    data: result.rows,
    total: parseInt(countResult.rows[0].count, 10),
    limit,
    offset,
  };
}

export async function getAppointmentById(id: string, userId: string): Promise<Appointment | null> {
  const result = await pool.query<Appointment>(
    `SELECT * FROM appointments WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
    [id, userId]
  );

  return result.rows[0] || null;
}

export async function getAppointmentOwner(id: string): Promise<string | null> {
  const result = await pool.query<{ user_id: string }>(
    `SELECT user_id FROM appointments WHERE id = $1 AND deleted_at IS NULL`,
    [id]
  );

  return result.rows[0]?.user_id || null;
}

export async function updateAppointment(
  id: string,
  data: UpdateAppointmentDTO
): Promise<Appointment | null> {
  const fields: string[] = [];
  const values: (string | undefined)[] = [];
  let paramIndex = 1;

  if (data.title !== undefined) {
    fields.push(`title = $${paramIndex++}`);
    values.push(data.title);
  }
  if (data.description !== undefined) {
    fields.push(`description = $${paramIndex++}`);
    values.push(data.description);
  }
  if (data.start_time !== undefined) {
    fields.push(`start_time = $${paramIndex++}`);
    values.push(data.start_time);
  }
  if (data.end_time !== undefined) {
    fields.push(`end_time = $${paramIndex++}`);
    values.push(data.end_time);
  }
  if (data.timezone !== undefined) {
    fields.push(`timezone = $${paramIndex++}`);
    values.push(data.timezone);
  }

  if (fields.length === 0) {
    return getAppointmentById(id, '');
  }

  fields.push(`updated_at = NOW()`);
  values.push(id);

  const result = await pool.query<Appointment>(
    `UPDATE appointments SET ${fields.join(', ')} WHERE id = $${paramIndex} AND deleted_at IS NULL RETURNING *`,
    values
  );

  return result.rows[0] || null;
}

export async function deleteAppointment(id: string): Promise<boolean> {
  const result = await pool.query(
    `UPDATE appointments SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL`,
    [id]
  );

  return result.rowCount !== null && result.rowCount > 0;
}

export interface CheckOverlapOptions {
  userId: string;
  startTime: string;
  endTime: string;
  excludeId?: string;
}

export async function checkOverlap(options: CheckOverlapOptions): Promise<OverlapResult> {
  const { userId, startTime, endTime, excludeId } = options;
  
  const params: string[] = [userId, startTime, endTime];
  let excludeClause = '';
  
  if (excludeId) {
    excludeClause = ' AND id != $4';
    params.push(excludeId);
  }

  const result = await pool.query<Appointment>(
    `SELECT * FROM appointments 
     WHERE user_id = $1 
       AND deleted_at IS NULL
       AND start_time < $3 
       AND end_time > $2
       ${excludeClause}
     ORDER BY start_time ASC`,
    params
  );

  return {
    hasOverlap: result.rows.length > 0,
    conflicts: result.rows.map(toAppointmentResponse),
  };
}
