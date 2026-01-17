import api from './api';
import type { User } from '../types';

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

interface AuthResponse {
  token: string | null;
  user: User;
  verificationLink?: string;
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

  async verifyEmail(token: string): Promise<{ message: string }> {
    const response = await api.post<ApiResponse<{ message: string }>>('/auth/verify', { token });
    return response.data.data;
  },

  async requestPasswordReset(email: string): Promise<{ message: string }> {
    const response = await api.post<ApiResponse<{ message: string }>>('/auth/password-reset', { email });
    return response.data.data;
  },

  async resetPassword(token: string, password: string): Promise<{ message: string }> {
    const response = await api.post<ApiResponse<{ message: string }>>('/auth/password-reset/confirm', {
      token,
      password,
    });
    return response.data.data;
  },
};
