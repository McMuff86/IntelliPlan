import api from './api';

export interface WorkingTimeSlotResponse {
  id: string;
  templateId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface WorkingTimeTemplateResponse {
  id: string;
  name: string;
  userId: string;
  isDefault: boolean;
  slots: WorkingTimeSlotResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkingTimeSlotInput {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface CreateTemplateDTO {
  name: string;
  isDefault?: boolean;
  slots: WorkingTimeSlotInput[];
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export const workingTimeService = {
  async getAll(): Promise<WorkingTimeTemplateResponse[]> {
    const response = await api.get<ApiResponse<WorkingTimeTemplateResponse[]>>(
      '/working-time-templates'
    );
    return response.data.data;
  },

  async getById(id: string): Promise<WorkingTimeTemplateResponse> {
    const response = await api.get<ApiResponse<WorkingTimeTemplateResponse>>(
      `/working-time-templates/${id}`
    );
    return response.data.data;
  },

  async create(data: CreateTemplateDTO): Promise<WorkingTimeTemplateResponse> {
    const response = await api.post<ApiResponse<WorkingTimeTemplateResponse>>(
      '/working-time-templates',
      data
    );
    return response.data.data;
  },

  async update(id: string, data: CreateTemplateDTO): Promise<WorkingTimeTemplateResponse> {
    const response = await api.put<ApiResponse<WorkingTimeTemplateResponse>>(
      `/working-time-templates/${id}`,
      data
    );
    return response.data.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/working-time-templates/${id}`);
  },

  async createDefaults(): Promise<WorkingTimeTemplateResponse[]> {
    const response = await api.post<ApiResponse<WorkingTimeTemplateResponse[]>>(
      '/working-time-templates/defaults'
    );
    return response.data.data;
  },
};
