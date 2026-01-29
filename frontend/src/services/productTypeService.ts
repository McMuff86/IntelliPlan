import type { ProductType } from '../types';
import api from './api';

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export const productTypeService = {
  async getAll(industryId?: string): Promise<ProductType[]> {
    const params = industryId ? { industryId } : {};
    const response = await api.get<ApiResponse<ProductType[]>>('/product-types', { params });
    return response.data.data;
  },

  async getById(id: string): Promise<ProductType> {
    const response = await api.get<ApiResponse<ProductType>>(`/product-types/${id}`);
    return response.data.data;
  },
};
