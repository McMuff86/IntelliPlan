import { pool } from '../config/database';
import { Appointment, CreateAppointmentDTO } from '../models/appointment';

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
