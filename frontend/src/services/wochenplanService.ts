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

// ─── Batch Assign Types ────────────────────────────────

export interface QuickAssignInput {
  taskId: string;
  resourceId: string;
  date: string;
  halfDay: string;
  isFixed?: boolean;
  statusCode?: string;
  notes?: string;
}

export interface QuickAssignResponse {
  created: number;
  conflicts: ResourceConflict[];
  assignments: {
    id: string;
    taskId: string;
    resourceId: string;
    date: string;
    halfDay: string;
    isFixed: boolean;
    statusCode: string;
  }[];
}

// ─── Copy Week Types ──────────────────────────────────

export interface CopyWeekRequest {
  sourceKw: number;
  sourceYear: number;
  targetKw: number;
  targetYear: number;
  options?: { includeAssignments?: boolean };
}

export interface CopyWeekResponse {
  copiedPhaseSchedules: number;
  copiedAssignments: number;
  targetKw: number;
  targetYear: number;
}

// ─── Unassigned Types ─────────────────────────────────

export interface UnassignedTask {
  taskId: string;
  projectOrderNumber: string;
  customerName: string;
  description: string;
  installationLocation: string;
  phases: { phase: string; plannedKw: number | null }[];
}

export interface UnassignedByDepartment {
  department: string;
  label: string;
  tasks: UnassignedTask[];
}

export interface UnassignedResponse {
  kw: number;
  year: number;
  totalUnassigned: number;
  departments: UnassignedByDepartment[];
}

// ─── Phase Matrix Types ───────────────────────────────

export interface PhaseMatrixEntry {
  taskId: string;
  projectOrderNumber: string;
  customerName: string;
  description: string;
  weeks: { kw: number; phases: string[] }[];
}

export interface PhaseMatrixResponse {
  fromKw: number;
  toKw: number;
  year: number;
  kwRange: number[];
  tasks: PhaseMatrixEntry[];
}

// ─── Batch Assign Error Response ──────────────────────

export interface BatchAssignConflictResponse {
  success: false;
  error: string;
  data: { conflicts: ResourceConflict[] };
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
    const response = await api.get<ApiResponse<ConflictResponse>>(
      `/wochenplan/conflicts?kw=${kw}&year=${year}`
    );
    return response.data.data;
  },

  async assignBatch(assignments: QuickAssignInput[]): Promise<QuickAssignResponse> {
    const response = await api.post<ApiResponse<QuickAssignResponse>>(
      '/wochenplan/assign',
      { assignments }
    );
    return response.data.data;
  },

  async copyWeek(request: CopyWeekRequest): Promise<CopyWeekResponse> {
    const response = await api.post<ApiResponse<CopyWeekResponse>>(
      '/wochenplan/copy',
      request
    );
    return response.data.data;
  },

  async getUnassigned(kw: number, year: number): Promise<UnassignedResponse> {
    const response = await api.get<ApiResponse<UnassignedResponse>>(
      `/wochenplan/unassigned?kw=${kw}&year=${year}`
    );
    return response.data.data;
  },

  async getPhaseMatrix(fromKw: number, toKw: number, year: number): Promise<PhaseMatrixResponse> {
    const response = await api.get<ApiResponse<PhaseMatrixResponse>>(
      `/wochenplan/phase-matrix?from_kw=${fromKw}&to_kw=${toKw}&year=${year}`
    );
    return response.data.data;
  },

  getExportCsvUrl(kw: number, year: number, department?: string): string {
    let url = `/api/export/wochenplan/csv?kw=${kw}&year=${year}`;
    if (department) url += `&department=${encodeURIComponent(department)}`;
    return url;
  },
};
