import type { CreateResourceDTO, Resource } from '../types';
import api from './api';

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export const resourceService = {
  async create(data: CreateResourceDTO): Promise<Resource> {
    const response = await api.post<ApiResponse<Resource>>('/resources', data);
    return response.data.data;
  },

  async getAll(): Promise<Resource[]> {
    const response = await api.get<ApiResponse<Resource[]>>('/resources');
    return response.data.data;
  },

  async getById(id: string): Promise<Resource> {
    const response = await api.get<ApiResponse<Resource>>(`/resources/${id}`);
    return response.data.data;
  },

  async update(id: string, data: Partial<CreateResourceDTO>): Promise<Resource> {
    const response = await api.put<ApiResponse<Resource>>(`/resources/${id}`, data);
    return response.data.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/resources/${id}`);
  },
};
