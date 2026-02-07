import type { CreateResourceDTO, Resource } from '../types';
import api from './api';

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export interface ResourceFilters {
  department?: string;
  employeeType?: string;
  active?: boolean;
}

export const resourceService = {
  async create(data: CreateResourceDTO): Promise<Resource> {
    const response = await api.post<ApiResponse<Resource>>('/resources', data);
    return response.data.data;
  },

  async getAll(filters?: ResourceFilters): Promise<Resource[]> {
    const params = new URLSearchParams();
    if (filters?.department) params.append('department', filters.department);
    if (filters?.employeeType) params.append('employee_type', filters.employeeType);
    if (filters?.active !== undefined) params.append('active', String(filters.active));
    const query = params.toString();
    const url = query ? `/resources?${query}` : '/resources';
    const response = await api.get<ApiResponse<Resource[]>>(url);
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
