import api from './api';

// ─── Types ─────────────────────────────────────────────

export interface PeriodAssignment {
  taskId: string;
  projectName: string;
  halfDay: string;
  statusCode: string;
}

export interface PeriodCapacity {
  date: string;
  dayName: string;
  availableHours: number;
  assignedHours: number;
  utilizationPercent: number;
  assignments: PeriodAssignment[];
  isOverbooked: boolean;
}

export interface ResourceCapacity {
  resourceId: string;
  resourceName: string;
  shortCode: string;
  department: string;
  employeeType: string;
  weeklyHours: number;
  periods: PeriodCapacity[];
}

export interface DepartmentCapacity {
  department: string;
  label: string;
  resourceCount: number;
  totalAvailableHours: number;
  totalAssignedHours: number;
  utilizationPercent: number;
  overbookedCount: number;
  resources: ResourceCapacity[];
}

export interface OverbookedResource {
  resourceId: string;
  resourceName: string;
  shortCode: string;
  department: string;
  utilizationPercent: number;
}

export interface CapacityOverview {
  from: string;
  to: string;
  totalAvailableHours: number;
  totalAssignedHours: number;
  utilizationPercent: number;
  overbookedResources: OverbookedResource[];
  departments: DepartmentCapacity[];
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

// ─── Service ───────────────────────────────────────────

export const capacityService = {
  async getOverview(from: string, to: string): Promise<CapacityOverview> {
    const response = await api.get<ApiResponse<CapacityOverview>>(
      `/capacity?from=${from}&to=${to}`
    );
    return response.data.data;
  },

  async getDepartment(dept: string, from: string, to: string): Promise<DepartmentCapacity> {
    const response = await api.get<ApiResponse<DepartmentCapacity>>(
      `/capacity/department/${dept}?from=${from}&to=${to}`
    );
    return response.data.data;
  },

  async getResource(resourceId: string, from: string, to: string): Promise<ResourceCapacity> {
    const response = await api.get<ApiResponse<ResourceCapacity>>(
      `/capacity/resource/${resourceId}?from=${from}&to=${to}`
    );
    return response.data.data;
  },
};
