import type {
  CreateProjectDTO,
  DefaultReadinessCheckTemplate,
  Project,
  ProjectActivity,
  ProjectPhasePlan,
  ProjectPhasePlanInput,
  ProjectReadinessCheck,
  ProjectReadinessCheckInput,
  ProjectReadinessSummary,
  SyncProjectPhasePlanResult,
} from '../types';
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

  async autoSchedule(
    id: string,
    data: { taskIds: string[]; endDate: string }
  ): Promise<{ scheduledTaskIds: string[]; skippedTaskIds: string[]; warnings: string[] }> {
    const response = await api.post<
      ApiResponse<{ scheduledTaskIds: string[]; skippedTaskIds: string[]; warnings: string[] }>
    >(`/projects/${id}/auto-schedule`, data);
    return response.data.data;
  },

  async applyTemplate(
    id: string,
    templateId: string,
    mode: 'replace' | 'append',
    durationOverrides?: Record<string, number>,
    multiplier?: number
  ): Promise<{ taskCount: number }> {
    const response = await api.post<ApiResponse<{ taskCount: number }>>(`/projects/${id}/apply-template`, {
      templateId,
      mode,
      durationOverrides,
      multiplier: multiplier && multiplier !== 1 ? multiplier : undefined,
    });
    return response.data.data;
  },

  async resetToTemplate(id: string): Promise<{ taskCount: number }> {
    const response = await api.post<ApiResponse<{ taskCount: number }>>(`/projects/${id}/reset-template`);
    return response.data.data;
  },

  async getTrashed(): Promise<Project[]> {
    const response = await api.get<ApiResponse<Project[]>>('/projects/trash');
    return response.data.data;
  },

  async restore(id: string): Promise<Project> {
    const response = await api.post<ApiResponse<Project>>(`/projects/${id}/restore`);
    return response.data.data;
  },

  async permanentDelete(id: string): Promise<void> {
    await api.delete(`/projects/${id}/permanent`);
  },

  async getDefaultPhasePlan(): Promise<ProjectPhasePlanInput[]> {
    const response = await api.get<ApiResponse<ProjectPhasePlanInput[]>>('/projects/phase-plan/default');
    return response.data.data;
  },

  async getPhasePlan(projectId: string): Promise<ProjectPhasePlan[]> {
    const response = await api.get<ApiResponse<ProjectPhasePlan[]>>(`/projects/${projectId}/phase-plan`);
    return response.data.data;
  },

  async updatePhasePlan(projectId: string, phases: ProjectPhasePlanInput[]): Promise<ProjectPhasePlan[]> {
    const response = await api.put<ApiResponse<ProjectPhasePlan[]>>(`/projects/${projectId}/phase-plan`, {
      phases,
    });
    return response.data.data;
  },

  async syncPhasePlanToTasks(
    projectId: string,
    options?: { replaceExistingPhaseTasks?: boolean }
  ): Promise<SyncProjectPhasePlanResult> {
    const response = await api.post<ApiResponse<SyncProjectPhasePlanResult>>(
      `/projects/${projectId}/phase-plan/sync-tasks`,
      {
        replaceExistingPhaseTasks: options?.replaceExistingPhaseTasks ?? false,
      }
    );
    return response.data.data;
  },

  async getDefaultReadinessChecks(): Promise<DefaultReadinessCheckTemplate[]> {
    const response = await api.get<ApiResponse<DefaultReadinessCheckTemplate[]>>('/projects/readiness/default');
    return response.data.data;
  },

  async getReadiness(projectId: string): Promise<ProjectReadinessCheck[]> {
    const response = await api.get<ApiResponse<ProjectReadinessCheck[]>>(`/projects/${projectId}/readiness`);
    return response.data.data;
  },

  async updateReadiness(
    projectId: string,
    checks: ProjectReadinessCheckInput[]
  ): Promise<{ checks: ProjectReadinessCheck[]; summary: ProjectReadinessSummary }> {
    const response = await api.put<ApiResponse<{ checks: ProjectReadinessCheck[]; summary: ProjectReadinessSummary }>>(
      `/projects/${projectId}/readiness`,
      { checks }
    );
    return response.data.data;
  },

  async getReadinessSummary(projectId: string): Promise<ProjectReadinessSummary> {
    const response = await api.get<ApiResponse<ProjectReadinessSummary>>(`/projects/${projectId}/readiness/summary`);
    return response.data.data;
  },
};
