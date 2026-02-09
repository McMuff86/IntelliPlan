import api from './api';

export interface ResourceOverviewSlot {
  taskId: string | null;
  shortLabel: string;
  statusCode: string;
}

export interface ResourceOverviewDay {
  date: string;
  dayName: string;
  morning: ResourceOverviewSlot | null;
  afternoon: ResourceOverviewSlot | null;
  availableHours: number;
  assignedHours: number;
}

export interface ResourceOverviewEntry {
  resourceId: string;
  resourceName: string;
  shortCode: string | null;
  department: string | null;
  employeeType: string | null;
  weeklyHours: number;
  workRole: string;
  days: ResourceOverviewDay[];
  weekSummary: {
    totalAssigned: number;
    totalAvailable: number;
    utilizationPercent: number;
  };
}

export interface ResourcesOverviewResponse {
  kw: number;
  year: number;
  dateRange: { from: string; to: string };
  resources: ResourceOverviewEntry[];
}

export interface ResourceScheduleSlot {
  taskId: string | null;
  projectOrderNumber: string | null;
  customerName: string | null;
  description: string | null;
  installationLocation: string | null;
  isFixed: boolean;
  notes: string | null;
  statusCode: string;
}

export interface ResourceScheduleDay {
  date: string;
  dayName: string;
  morning: ResourceScheduleSlot | null;
  afternoon: ResourceScheduleSlot | null;
  availableHours: number;
  assignedHours: number;
}

export interface ResourceWeekSchedule {
  resource: {
    id: string;
    name: string;
    shortCode: string | null;
    department: string | null;
    employeeType: string | null;
    weeklyHours: number;
    workRole: string;
    skills: string[];
  };
  kw: number;
  year: number;
  dateRange: { from: string; to: string };
  days: ResourceScheduleDay[];
  weekSummary: {
    totalAssigned: number;
    totalAvailable: number;
    utilizationPercent: number;
  };
}

interface BackendResourceOverviewSlot {
  taskId: string | null;
  shortLabel: string;
  statusCode: string;
}

interface BackendResourceOverviewDay {
  date: string;
  morning: BackendResourceOverviewSlot | null;
  afternoon: BackendResourceOverviewSlot | null;
}

interface BackendResourceOverviewEntry {
  resourceId: string;
  resourceName: string;
  shortCode: string | null;
  department: string | null;
  employeeType: string | null;
  weeklyHours: number;
  workRole: string;
  utilizationPercent: number;
  days: BackendResourceOverviewDay[];
}

interface BackendResourcesOverviewResponse {
  kw: number;
  year: number;
  dateRange: { from: string; to: string };
  resources: BackendResourceOverviewEntry[];
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

const DAY_NAMES: Record<number, string> = {
  0: 'So',
  1: 'Mo',
  2: 'Di',
  3: 'Mi',
  4: 'Do',
  5: 'Fr',
  6: 'Sa',
};

function roundToSingleDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

function getDayName(date: string): string {
  const parsed = new Date(`${date}T00:00:00Z`);
  return DAY_NAMES[parsed.getUTCDay()] ?? '';
}

function mapOverviewSlot(
  slot: BackendResourceOverviewSlot | null
): ResourceOverviewSlot | null {
  if (!slot) {
    return null;
  }

  return {
    taskId: slot.taskId,
    shortLabel: slot.shortLabel,
    statusCode: slot.statusCode,
  };
}

function mapResourcesOverviewResponse(
  data: BackendResourcesOverviewResponse
): ResourcesOverviewResponse {
  return {
    kw: data.kw,
    year: data.year,
    dateRange: data.dateRange,
    resources: data.resources.map((resource) => {
      const weeklyHours = Number(resource.weeklyHours) || 42.5;
      const dailyHours = weeklyHours / 5;
      const roundedDailyHours = roundToSingleDecimal(dailyHours);

      const days: ResourceOverviewDay[] = resource.days.map((day) => {
        const morning = mapOverviewSlot(day.morning);
        const afternoon = mapOverviewSlot(day.afternoon);
        const assignedHalfDays = (morning ? 1 : 0) + (afternoon ? 1 : 0);

        return {
          date: day.date,
          dayName: getDayName(day.date),
          morning,
          afternoon,
          availableHours: roundedDailyHours,
          assignedHours: roundToSingleDecimal((dailyHours / 2) * assignedHalfDays),
        };
      });

      const totalAssigned = roundToSingleDecimal(
        days.reduce((sum, day) => sum + day.assignedHours, 0)
      );
      const totalAvailable = roundToSingleDecimal(
        days.reduce((sum, day) => sum + day.availableHours, 0)
      );

      return {
        resourceId: resource.resourceId,
        resourceName: resource.resourceName,
        shortCode: resource.shortCode,
        department: resource.department,
        employeeType: resource.employeeType,
        weeklyHours,
        workRole: resource.workRole || 'arbeiter',
        days,
        weekSummary: {
          totalAssigned,
          totalAvailable,
          utilizationPercent: resource.utilizationPercent,
        },
      };
    }),
  };
}

function mapResourceWeekSchedule(data: ResourceWeekSchedule): ResourceWeekSchedule {
  return {
    ...data,
    resource: {
      ...data.resource,
      weeklyHours: Number(data.resource.weeklyHours) || 42.5,
      workRole: data.resource.workRole || 'arbeiter',
      skills: Array.isArray(data.resource.skills) ? data.resource.skills : [],
    },
    days: data.days.map((day) => ({
      ...day,
      dayName: day.dayName || getDayName(day.date),
      availableHours: Number(day.availableHours) || 0,
      assignedHours: Number(day.assignedHours) || 0,
    })),
  };
}

export const mitarbeiterService = {
  async getResourcesOverview(
    kw: number,
    year: number,
    department?: string
  ): Promise<ResourcesOverviewResponse> {
    const params = new URLSearchParams({ kw: String(kw), year: String(year) });
    if (department && department !== 'alle') {
      params.append('department', department);
    }

    const response = await api.get<ApiResponse<BackendResourcesOverviewResponse>>(
      `/wochenplan/resources?${params.toString()}`
    );

    return mapResourcesOverviewResponse(response.data.data);
  },

  async getResourceSchedule(
    resourceId: string,
    kw: number,
    year: number
  ): Promise<ResourceWeekSchedule> {
    const params = new URLSearchParams({ kw: String(kw), year: String(year) });
    const response = await api.get<ApiResponse<ResourceWeekSchedule>>(
      `/wochenplan/resource/${resourceId}?${params.toString()}`
    );
    return mapResourceWeekSchedule(response.data.data);
  },
};
