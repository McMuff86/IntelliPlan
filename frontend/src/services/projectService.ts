import type { CreateProjectDTO, Project, ProjectActivity } from '../types';
import api from './api';

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export const projectService = {
  async create(data: CreateProjectDTO): Promise<Project> {
    const response = await api.post<ApiResponse<Project>>('/projects', data);
    return response.data.data;
  },

  async getAll(): Promise<Project[]> {
    const response = await api.get<ApiResponse<Project[]>>('/projects');
    return response.data.data;
  },

  async getById(id: string): Promise<Project> {
    const response = await api.get<ApiResponse<Project>>(`/projects/${id}`);
    return response.data.data;
  },

  async update(id: string, data: Partial<CreateProjectDTO>): Promise<Project> {
    const response = await api.put<ApiResponse<Project>>(`/projects/${id}`, data);
    return response.data.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/projects/${id}`);
  },

  async shiftSchedule(
    id: string,
    data: { deltaDays: number }
  ): Promise<{ shiftedTaskIds: string[]; deltaDays: number; shiftedTasks?: { taskId: string; deltaDays: number }[] }> {
    const response = await api.post<
      ApiResponse<{ shiftedTaskIds: string[]; deltaDays: number; shiftedTasks?: { taskId: string; deltaDays: number }[] }>
    >(`/projects/${id}/shift`, data);
    return response.data.data;
  },

  async getActivity(id: string): Promise<ProjectActivity[]> {
    const response = await api.get<ApiResponse<ProjectActivity[]>>(`/projects/${id}/activity`);
    return response.data.data;
  },
};
