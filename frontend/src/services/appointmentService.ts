import type {
  Appointment,
  CreateAppointmentDTO,
  ReversePlanRequest,
  ReversePlanResult,
} from "../types";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  pagination?: {
    total: number;
    limit: number;
    offset: number;
  };
}
import api from "./api";

export interface AppointmentsListResponse {
  appointments: Appointment[];
  total: number;
  limit: number;
  offset: number;
}

export const appointmentService = {
  async create(
    data: CreateAppointmentDTO,
    force = false,
  ): Promise<Appointment> {
    const url = force ? "/appointments?force=true" : "/appointments";
    const response = await api.post<ApiResponse<Appointment>>(url, data);
    return response.data.data;
  },

  async getAll(params?: {
    start?: string;
    end?: string;
    limit?: number;
    offset?: number;
  }): Promise<AppointmentsListResponse> {
    const response = await api.get<ApiResponse<Appointment[]>>(
      "/appointments",
      { params },
    );
    const { data, pagination } = response.data;
    return {
      appointments: data,
      total: pagination?.total ?? data.length,
      limit: pagination?.limit ?? data.length,
      offset: pagination?.offset ?? 0,
    };
  },

  async getById(id: string): Promise<Appointment> {
    const response = await api.get<ApiResponse<Appointment>>(
      `/appointments/${id}`,
    );
    return response.data.data;
  },

  async update(
    id: string,
    data: Partial<CreateAppointmentDTO>,
    force = false,
  ): Promise<Appointment> {
    const url = force
      ? `/appointments/${id}?force=true`
      : `/appointments/${id}`;
    const response = await api.put<ApiResponse<Appointment>>(url, data);
    return response.data.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/appointments/${id}`);
  },

  async reversePlan(data: ReversePlanRequest): Promise<ReversePlanResult> {
    const response = await api.post<ApiResponse<ReversePlanResult>>(
      "/appointments/reverse-plan",
      data,
    );
    return response.data.data;
  },
};
