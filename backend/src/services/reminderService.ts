import { pool } from '../config/database';
import { Reminder, CreateReminderDTO } from '../models/reminder';

export async function createReminder(userId: string, dto: CreateReminderDTO): Promise<Reminder> {
  const { appointmentId, offsetMinutes, remindAt } = dto;

  let reminderType: string;
  let computedRemindAt: string;
  let computedOffset: number | null;

  if (remindAt) {
    // Absolute reminder
    reminderType = 'absolute';
    computedRemindAt = remindAt;
    computedOffset = null;
  } else if (offsetMinutes !== undefined) {
    // Relative reminder — compute remind_at from appointment start_time
    reminderType = 'relative';
    computedOffset = offsetMinutes;

    const appointmentResult = await pool.query<{ start_time: Date }>(
      `SELECT start_time FROM appointments WHERE id = $1 AND deleted_at IS NULL`,
      [appointmentId]
    );

    if (appointmentResult.rows.length === 0) {
      throw new Error('Appointment not found');
    }

    const startTime = appointmentResult.rows[0].start_time;
    const remindDate = new Date(startTime.getTime() - offsetMinutes * 60 * 1000);
    computedRemindAt = remindDate.toISOString();
  } else {
    throw new Error('Either offsetMinutes or remindAt must be provided');
  }

  const result = await pool.query<Reminder>(
    `INSERT INTO reminders (appointment_id, user_id, remind_at, reminder_type, offset_minutes)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [appointmentId, userId, computedRemindAt, reminderType, computedOffset]
  );

  return result.rows[0];
}

export async function getRemindersForAppointment(
  appointmentId: string,
  userId: string
): Promise<Reminder[]> {
  const result = await pool.query<Reminder>(
    `SELECT * FROM reminders
     WHERE appointment_id = $1 AND user_id = $2
     ORDER BY remind_at ASC`,
    [appointmentId, userId]
  );

  return result.rows;
}

export async function getUpcomingReminders(userId: string): Promise<Reminder[]> {
  const result = await pool.query<Reminder>(
    `SELECT * FROM reminders
     WHERE user_id = $1
       AND status = 'pending'
       AND remind_at <= NOW() + INTERVAL '24 hours'
     ORDER BY remind_at ASC`,
    [userId]
  );

  return result.rows;
}

export async function dismissReminder(id: string, userId: string): Promise<Reminder | null> {
  const result = await pool.query<Reminder>(
    `UPDATE reminders
     SET status = 'dismissed', updated_at = NOW()
     WHERE id = $1 AND user_id = $2
     RETURNING *`,
    [id, userId]
  );

  return result.rows[0] || null;
}

export async function deleteReminder(id: string, userId: string): Promise<boolean> {
  const result = await pool.query(
    `DELETE FROM reminders WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );

  return result.rowCount !== null && result.rowCount > 0;
}

export async function getDueReminders(): Promise<Reminder[]> {
  const result = await pool.query<Reminder>(
    `SELECT * FROM reminders
     WHERE status = 'pending'
       AND remind_at <= NOW()
     ORDER BY remind_at ASC`
  );

  return result.rows;
}
