import type { Industry } from '../types';
import api from './api';

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export const industryService = {
  async getAll(): Promise<Industry[]> {
    const response = await api.get<ApiResponse<Industry[]>>('/industries');
    return response.data.data;
  },

  async getById(id: string): Promise<Industry> {
    const response = await api.get<ApiResponse<Industry>>(`/industries/${id}`);
    return response.data.data;
  },
};
