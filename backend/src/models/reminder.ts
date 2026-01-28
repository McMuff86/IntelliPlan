export interface Reminder {
  id: string;
  appointment_id: string;
  user_id: string;
  remind_at: Date;
  reminder_type: string;
  offset_minutes: number | null;
  status: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateReminderDTO {
  appointmentId: string;
  offsetMinutes?: number;
  remindAt?: string;
}

export interface ReminderResponse {
  id: string;
  appointmentId: string;
  userId: string;
  remindAt: string;
  reminderType: string;
  offsetMinutes: number | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export function toReminderResponse(reminder: Reminder): ReminderResponse {
  return {
    id: reminder.id,
    appointmentId: reminder.appointment_id,
    userId: reminder.user_id,
    remindAt: reminder.remind_at.toISOString(),
    reminderType: reminder.reminder_type,
    offsetMinutes: reminder.offset_minutes,
    status: reminder.status,
    createdAt: reminder.created_at.toISOString(),
    updatedAt: reminder.updated_at.toISOString(),
  };
}
