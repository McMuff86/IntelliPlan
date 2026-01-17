import api from './api';
import type { User } from '../types';

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

interface AuthResponse {
  token: string;
  user: User;
}

export const authService = {
  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/login', { email, password });
    return response.data.data;
  },

  async register(payload: { name: string; email: string; password: string; timezone?: string }): Promise<AuthResponse> {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/register', payload);
    return response.data.data;
  },
};
