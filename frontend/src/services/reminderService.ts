import api from './api';

export interface Reminder {
  id: string;
  appointmentId: string;
  remindAt: string;
  reminderType: 'relative' | 'absolute';
  offsetMinutes: number | null;
  status: 'pending' | 'sent' | 'dismissed';
  createdAt: string;
}

export const reminderService = {
  create: (appointmentId: string, offsetMinutes: number) =>
    api.post('/reminders', { appointmentId, offsetMinutes }).then(r => r.data.data),

  getForAppointment: (appointmentId: string) =>
    api.get(`/appointments/${appointmentId}/reminders`).then(r => r.data.data),

  getUpcoming: () =>
    api.get('/reminders/upcoming').then(r => r.data.data),

  dismiss: (id: string) =>
    api.put(`/reminders/${id}/dismiss`).then(r => r.data),

  remove: (id: string) =>
    api.delete(`/reminders/${id}`).then(r => r.data),
};
