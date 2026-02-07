import api from './api';

// ─── Types ─────────────────────────────────────────────

export interface WeekPlanResponse {
  kw: number;
  year: number;
  dateRange: { from: string; to: string };
  sections: Section[];
  capacitySummary: CapacitySummary;
}

export interface Section {
  department: string;
  label: string;
  tasks: WeekPlanTask[];
  resources: WeekPlanResource[];
  totalHours: { planned: number; available: number };
}

export interface WeekPlanTask {
  taskId: string;
  projectOrderNumber: string;
  sachbearbeiter: string;
  customerName: string;
  description: string;
  installationLocation: string;
  phases: { phase: string; plannedKw: number | null }[];
  workerCount: number;
  helperCount: number;
  color: string;
  contactName: string;
  needsCallback: boolean;
  assignments: DayAssignment[];
  remarks: string;
}

export interface DayAssignmentDetail {
  assignmentId: string;
  resourceId: string;
  resourceName: string;
  halfDay: string;
  isFixed: boolean;
  notes: string | null;
  statusCode: string | null;
}

export interface DayAssignment {
  date: string;
  dayName: string;
  morning: string | null;
  afternoon: string | null;
  morningStatusCode: string | null;
  afternoonStatusCode: string | null;
  morningDetail: DayAssignmentDetail | null;
  afternoonDetail: DayAssignmentDetail | null;
  isFixed: boolean;
  notes: string | null;
}

export interface WeekPlanResource {
  id: string;
  name: string;
  shortCode: string | null;
  department: string | null;
  employeeType: string | null;
  weeklyHours: number;
  workRole: string;
}

export interface CapacitySummary {
  totalAvailableHours: number;
  totalPlannedHours: number;
  utilizationPercent: number;
  byDepartment: {
    department: string;
    label: string;
    availableHours: number;
    plannedHours: number;
    utilizationPercent: number;
  }[];
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

// ─── Conflict Types ────────────────────────────────────

export interface ConflictAssignment {
  taskId: string;
  projectOrderNumber: string;
  description: string;
}

export interface ResourceConflict {
  resourceId: string;
  resourceName: string;
  shortCode: string;
  date: string;
  halfDay: string;
  assignments: ConflictAssignment[];
}

export interface ConflictResponse {
  conflicts: ResourceConflict[];
}

// ─── Service ───────────────────────────────────────────

export const wochenplanService = {
  async getWeekPlan(kw: number, year: number): Promise<WeekPlanResponse> {
    const response = await api.get<ApiResponse<WeekPlanResponse>>(
      `/wochenplan?kw=${kw}&year=${year}`
    );
    return response.data.data;
  },

  async getConflicts(kw: number, year: number): Promise<ConflictResponse> {
    try {
      const response = await api.get<ApiResponse<ConflictResponse>>(
        `/wochenplan/conflicts?kw=${kw}&year=${year}`
      );
      return response.data.data;
    } catch {
      // TODO: API endpoint may not exist yet – return empty conflicts
      return { conflicts: [] };
    }
  },
};
