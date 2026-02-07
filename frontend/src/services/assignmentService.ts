import api from './api';
import type { WeekPlanResource } from './wochenplanService';

// ─── Types ─────────────────────────────────────────────

export type HalfDay = 'morning' | 'afternoon' | 'full_day';
export type StatusCode = 'assigned' | 'available' | 'sick' | 'vacation' | 'training' | 'other';

export interface AssignmentResponse {
  id: string;
  taskId: string;
  resourceId: string;
  assignmentDate: string;
  halfDay: HalfDay;
  notes: string | null;
  isFixed: boolean;
  startTime: string | null;
  statusCode: StatusCode;
  resourceName: string;
  resourceShortCode: string | null;
  taskTitle: string;
  projectId: string;
  projectName: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAssignmentData {
  resourceId: string;
  assignmentDate: string;
  halfDay: HalfDay;
  notes?: string | null;
  isFixed?: boolean;
  startTime?: string | null;
  statusCode?: StatusCode;
}

export interface UpdateAssignmentData {
  resourceId?: string;
  assignmentDate?: string;
  halfDay?: HalfDay;
  notes?: string | null;
  isFixed?: boolean;
  startTime?: string | null;
  statusCode?: StatusCode;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

// ─── Service ───────────────────────────────────────────

export const assignmentService = {
  async createAssignment(
    taskId: string,
    data: CreateAssignmentData
  ): Promise<AssignmentResponse> {
    const response = await api.post<ApiResponse<AssignmentResponse>>(
      `/tasks/${taskId}/assignments`,
      data
    );
    return response.data.data;
  },

  async updateAssignment(
    id: string,
    data: UpdateAssignmentData
  ): Promise<AssignmentResponse> {
    const response = await api.put<ApiResponse<AssignmentResponse>>(
      `/assignments/${id}`,
      data
    );
    return response.data.data;
  },

  async deleteAssignment(id: string): Promise<void> {
    await api.delete(`/assignments/${id}`);
  },

  async getResourcesByDepartment(
    department?: string
  ): Promise<WeekPlanResource[]> {
    const params = department ? `?department=${department}` : '';
    const response = await api.get<ApiResponse<WeekPlanResource[]>>(
      `/resources${params}`
    );
    // Map from API response format to WeekPlanResource
    const resources = response.data.data as unknown[];
    return (resources as Array<Record<string, unknown>>).map((r) => ({
      id: r.id as string,
      name: r.name as string,
      shortCode: (r.shortCode as string) || null,
      department: (r.department as string) || null,
      employeeType: (r.employeeType as string) || null,
      weeklyHours: (r.weeklyHours as number) || 42.5,
    }));
  },
};
