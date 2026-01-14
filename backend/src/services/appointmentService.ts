import { pool } from '../config/database';
import { Appointment, CreateAppointmentDTO } from '../models/appointment';

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
