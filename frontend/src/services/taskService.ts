import type {
  CreateDependencyDTO,
  CreateTaskDTO,
  CreateWorkSlotDTO,
  Task,
  TaskDependency,
  TaskWorkSlot,
  TaskWorkSlotCalendar,
} from '../types';
import api from './api';

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export const taskService = {
  async createInProject(projectId: string, data: CreateTaskDTO): Promise<Task> {
    const response = await api.post<ApiResponse<Task>>(`/projects/${projectId}/tasks`, data);
    return response.data.data;
  },

  async getByProject(projectId: string): Promise<Task[]> {
    const response = await api.get<ApiResponse<Task[]>>(`/projects/${projectId}/tasks`);
    return response.data.data;
  },

  async getById(id: string): Promise<Task> {
    const response = await api.get<ApiResponse<Task>>(`/tasks/${id}`);
    return response.data.data;
  },

  async update(id: string, data: Partial<CreateTaskDTO>): Promise<Task> {
    const response = await api.put<ApiResponse<Task>>(`/tasks/${id}`, data);
    return response.data.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/tasks/${id}`);
  },

  async listDependencies(taskId: string): Promise<TaskDependency[]> {
    const response = await api.get<ApiResponse<TaskDependency[]>>(`/tasks/${taskId}/dependencies`);
    return response.data.data;
  },

  async createDependency(taskId: string, data: CreateDependencyDTO): Promise<TaskDependency> {
    const response = await api.post<ApiResponse<TaskDependency>>(`/tasks/${taskId}/dependencies`, data);
    return response.data.data;
  },

  async deleteDependency(taskId: string, dependencyId: string): Promise<void> {
    await api.delete(`/tasks/${taskId}/dependencies/${dependencyId}`);
  },

  async listWorkSlots(taskId: string): Promise<TaskWorkSlot[]> {
    const response = await api.get<ApiResponse<TaskWorkSlot[]>>(`/tasks/${taskId}/work-slots`);
    return response.data.data;
  },

  async createWorkSlot(taskId: string, data: CreateWorkSlotDTO): Promise<TaskWorkSlot> {
    const response = await api.post<ApiResponse<TaskWorkSlot>>(`/tasks/${taskId}/work-slots`, data);
    return response.data.data;
  },

  async deleteWorkSlot(taskId: string, slotId: string): Promise<void> {
    await api.delete(`/tasks/${taskId}/work-slots/${slotId}`);
  },

  async shiftSchedule(
    taskId: string,
    data: { deltaDays: number; cascade?: boolean; shiftBlock?: boolean }
  ): Promise<{ shiftedTaskIds: string[]; deltaDays: number; shiftedTasks?: { taskId: string; deltaDays: number }[] }> {
    const response = await api.post<
      ApiResponse<{ shiftedTaskIds: string[]; deltaDays: number; shiftedTasks?: { taskId: string; deltaDays: number }[] }>
    >(`/tasks/${taskId}/shift`, data);
    return response.data.data;
  },

  async getWorkSlotsForCalendar(): Promise<TaskWorkSlotCalendar[]> {
    const response = await api.get<ApiResponse<TaskWorkSlotCalendar[]>>('/tasks/work-slots');
    return response.data.data;
  },
};
