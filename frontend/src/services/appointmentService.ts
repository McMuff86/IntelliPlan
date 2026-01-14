import type { Appointment, CreateAppointmentDTO } from '../types';
import api from './api';

export const appointmentService = {
  async create(data: CreateAppointmentDTO, force = false): Promise<Appointment> {
    const url = force ? '/appointments?force=true' : '/appointments';
    const response = await api.post<Appointment>(url, data);
    return response.data;
  },

  async getById(id: string): Promise<Appointment> {
    const response = await api.get<Appointment>(`/appointments/${id}`);
    return response.data;
  },

  async update(id: string, data: Partial<CreateAppointmentDTO>, force = false): Promise<Appointment> {
    const url = force ? `/appointments/${id}?force=true` : `/appointments/${id}`;
    const response = await api.put<Appointment>(url, data);
    return response.data;
  },
};
