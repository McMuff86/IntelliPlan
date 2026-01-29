import type { TaskTemplate, CreateTaskTemplateDTO } from '../types';
import api from './api';

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export const taskTemplateService = {
  async getAll(productTypeId?: string): Promise<TaskTemplate[]> {
    const params = productTypeId ? { productTypeId } : {};
    const response = await api.get<ApiResponse<TaskTemplate[]>>('/task-templates', { params });
    return response.data.data;
  },

  async getById(id: string): Promise<TaskTemplate> {
    const response = await api.get<ApiResponse<TaskTemplate>>(`/task-templates/${id}`);
    return response.data.data;
  },

  async create(data: CreateTaskTemplateDTO): Promise<TaskTemplate> {
    const response = await api.post<ApiResponse<TaskTemplate>>('/task-templates', data);
    return response.data.data;
  },

  async update(id: string, data: Partial<CreateTaskTemplateDTO>): Promise<TaskTemplate> {
    const response = await api.put<ApiResponse<TaskTemplate>>(`/task-templates/${id}`, data);
    return response.data.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/task-templates/${id}`);
  },
};
