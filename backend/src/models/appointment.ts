export interface Appointment {
  id: string;
  title: string;
  description: string | null;
  start_time: Date;
  end_time: Date;
  timezone: string;
  user_id: string;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface CreateAppointmentDTO {
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  timezone?: string;
  user_id: string;
}

export interface UpdateAppointmentDTO {
  title?: string;
  description?: string;
  start_time?: string;
  end_time?: string;
  timezone?: string;
}

export interface AppointmentResponse {
  id: string;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
  timezone: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface OverlapResult {
  hasOverlap: boolean;
  conflicts: AppointmentResponse[];
}

export function toAppointmentResponse(appointment: Appointment): AppointmentResponse {
  return {
    id: appointment.id,
    title: appointment.title,
    description: appointment.description,
    startTime: appointment.start_time.toISOString(),
    endTime: appointment.end_time.toISOString(),
    timezone: appointment.timezone,
    userId: appointment.user_id,
    createdAt: appointment.created_at.toISOString(),
    updatedAt: appointment.updated_at.toISOString(),
  };
}
