import api from './api';

// ─── Types ─────────────────────────────────────────────

export interface ResourceSlot {
  taskId: string | null;
  projectOrderNumber: string | null;
  customerName: string | null;
  description: string | null;
  installationLocation: string | null;
  isFixed: boolean;
  notes: string | null;
  statusCode: string; // 'assigned' | 'available' | 'sick' | 'vacation' | 'training' | 'other'
}

export interface ResourceDaySchedule {
  date: string;
  dayName: string;
  morning: ResourceSlot | null;
  afternoon: ResourceSlot | null;
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
  days: ResourceDaySchedule[];
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

export interface ResourceWeekSchedule {
  resource: {
    id: string;
    name: string;
    shortCode: string | null;
    department: string | null;
    employeeType: string | null;
    weeklyHours: number;
    skills: string[];
  };
  kw: number;
  year: number;
  dateRange: { from: string; to: string };
  days: ResourceDaySchedule[];
  weekSummary: {
    totalAssigned: number;
    totalAvailable: number;
    utilizationPercent: number;
  };
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

// ─── Service ───────────────────────────────────────────

export const mitarbeiterService = {
  /**
   * Get overview of all resources for a given KW/year, optionally filtered by department.
   * Calls GET /api/wochenplan/resources?kw=&year=&department=
   */
  async getResourcesOverview(
    kw: number,
    year: number,
    department?: string
  ): Promise<ResourcesOverviewResponse> {
    const params = new URLSearchParams({ kw: String(kw), year: String(year) });
    if (department && department !== 'alle') {
      params.append('department', department);
    }
    try {
      const response = await api.get<ApiResponse<ResourcesOverviewResponse>>(
        `/wochenplan/resources?${params.toString()}`
      );
      return response.data.data;
    } catch {
      // TODO: Backend endpoint GET /api/wochenplan/resources may not exist yet.
      // Fall back to building the overview from existing APIs.
      return buildOverviewFromExistingAPIs(kw, year, department);
    }
  },

  /**
   * Get detailed schedule for a single resource in a given KW.
   * Calls GET /api/wochenplan/resource/:id?kw=&year=
   */
  async getResourceSchedule(
    resourceId: string,
    kw: number,
    year: number
  ): Promise<ResourceWeekSchedule> {
    const params = new URLSearchParams({ kw: String(kw), year: String(year) });
    try {
      const response = await api.get<ApiResponse<ResourceWeekSchedule>>(
        `/wochenplan/resource/${resourceId}?${params.toString()}`
      );
      return response.data.data;
    } catch {
      // TODO: Backend endpoint GET /api/wochenplan/resource/:id may not exist yet.
      // Return mock data for development.
      return getMockResourceSchedule(resourceId, kw, year);
    }
  },
};

// ─── Fallback: Build overview from wochenplan + capacity APIs ───

async function buildOverviewFromExistingAPIs(
  kw: number,
  year: number,
  department?: string
): Promise<ResourcesOverviewResponse> {
  // Import dynamically to avoid circular deps
  const { wochenplanService } = await import('./wochenplanService');
  const { capacityService } = await import('./capacityService');

  try {
    const weekPlan = await wochenplanService.getWeekPlan(kw, year);

    // Also fetch capacity for the same date range to get per-resource data
    let capacityData;
    try {
      capacityData = await capacityService.getOverview(
        weekPlan.dateRange.from,
        weekPlan.dateRange.to
      );
    } catch {
      capacityData = null;
    }

    // Build a map of resource assignments from the weekplan
    const resourceAssignments = new Map<
      string,
      Map<string, { morning: ResourceSlot | null; afternoon: ResourceSlot | null }>
    >();

    // Collect all resources from sections
    const resourceMap = new Map<
      string,
      { id: string; name: string; shortCode: string | null; department: string | null; employeeType: string | null; weeklyHours: number }
    >();

    for (const section of weekPlan.sections) {
      for (const r of section.resources) {
        resourceMap.set(r.id, {
          id: r.id,
          name: r.name,
          shortCode: r.shortCode,
          department: r.department,
          employeeType: r.employeeType,
          weeklyHours: r.weeklyHours,
        });
      }

      for (const task of section.tasks) {
        for (const day of task.assignments) {
          if (day.morningDetail) {
            const resId = day.morningDetail.resourceId;
            if (!resourceAssignments.has(resId)) {
              resourceAssignments.set(resId, new Map());
            }
            const dayMap = resourceAssignments.get(resId)!;
            if (!dayMap.has(day.date)) {
              dayMap.set(day.date, { morning: null, afternoon: null });
            }
            const slot: ResourceSlot = {
              taskId: task.taskId,
              projectOrderNumber: task.projectOrderNumber,
              customerName: task.customerName,
              description: task.description,
              installationLocation: task.installationLocation,
              isFixed: day.morningDetail.isFixed,
              notes: day.morningDetail.notes,
              statusCode: day.morningDetail.statusCode || 'assigned',
            };
            if (day.morningDetail.halfDay === 'full_day') {
              dayMap.get(day.date)!.morning = slot;
              dayMap.get(day.date)!.afternoon = slot;
            } else {
              dayMap.get(day.date)!.morning = slot;
            }
          }
          if (day.afternoonDetail && day.afternoonDetail.halfDay !== 'full_day') {
            const resId = day.afternoonDetail.resourceId;
            if (!resourceAssignments.has(resId)) {
              resourceAssignments.set(resId, new Map());
            }
            const dayMap = resourceAssignments.get(resId)!;
            if (!dayMap.has(day.date)) {
              dayMap.set(day.date, { morning: null, afternoon: null });
            }
            const slot: ResourceSlot = {
              taskId: task.taskId,
              projectOrderNumber: task.projectOrderNumber,
              customerName: task.customerName,
              description: task.description,
              installationLocation: task.installationLocation,
              isFixed: day.afternoonDetail.isFixed,
              notes: day.afternoonDetail.notes,
              statusCode: day.afternoonDetail.statusCode || 'assigned',
            };
            dayMap.get(day.date)!.afternoon = slot;
          }
        }
      }
    }

    // Also integrate capacity data for resources not visible in wochenplan
    if (capacityData) {
      for (const dept of capacityData.departments) {
        for (const res of dept.resources) {
          if (!resourceMap.has(res.resourceId)) {
            resourceMap.set(res.resourceId, {
              id: res.resourceId,
              name: res.resourceName,
              shortCode: res.shortCode,
              department: res.department,
              employeeType: res.employeeType,
              weeklyHours: res.weeklyHours,
            });
          }
        }
      }
    }

    // Build the dates array from the week plan
    const dates = getDatesInRange(weekPlan.dateRange.from, weekPlan.dateRange.to);
    const dayNames = ['Mo', 'Di', 'Mi', 'Do', 'Fr'];

    // Build resource entries
    const resources: ResourceOverviewEntry[] = [];
    for (const [, res] of resourceMap) {
      // Apply department filter
      if (department && department !== 'alle' && res.department !== department) {
        continue;
      }

      const dailyHours = res.weeklyHours / 5;
      const days: ResourceDaySchedule[] = dates.map((date, idx) => {
        const dayAssignment = resourceAssignments.get(res.id)?.get(date);
        const morning = dayAssignment?.morning ?? null;
        const afternoon = dayAssignment?.afternoon ?? null;
        const assignedHours =
          (morning ? dailyHours / 2 : 0) + (afternoon ? dailyHours / 2 : 0);
        return {
          date,
          dayName: dayNames[idx] || '',
          morning,
          afternoon,
          availableHours: dailyHours,
          assignedHours,
        };
      });

      const totalAssigned = days.reduce((s, d) => s + d.assignedHours, 0);
      const totalAvailable = days.reduce((s, d) => s + d.availableHours, 0);

      resources.push({
        resourceId: res.id,
        resourceName: res.name,
        shortCode: res.shortCode,
        department: res.department,
        employeeType: res.employeeType,
        weeklyHours: res.weeklyHours,
        days,
        weekSummary: {
          totalAssigned: Math.round(totalAssigned * 10) / 10,
          totalAvailable: Math.round(totalAvailable * 10) / 10,
          utilizationPercent:
            totalAvailable > 0
              ? Math.round((totalAssigned / totalAvailable) * 1000) / 10
              : 0,
        },
      });
    }

    // Sort: by department then by name
    resources.sort((a, b) => {
      const deptCmp = (a.department || '').localeCompare(b.department || '');
      if (deptCmp !== 0) return deptCmp;
      return a.resourceName.localeCompare(b.resourceName);
    });

    return {
      kw,
      year,
      dateRange: weekPlan.dateRange,
      resources,
    };
  } catch {
    // If even the fallback fails, return empty data
    return getEmptyOverview(kw, year);
  }
}

function getEmptyOverview(kw: number, year: number): ResourcesOverviewResponse {
  const monday = getISOWeekMonday(kw, year);
  const dates = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
  return {
    kw,
    year,
    dateRange: { from: dates[0], to: dates[4] },
    resources: [],
  };
}

function getMockResourceSchedule(
  resourceId: string,
  kw: number,
  year: number
): ResourceWeekSchedule {
  const monday = getISOWeekMonday(kw, year);
  const dayNames = ['Mo', 'Di', 'Mi', 'Do', 'Fr'];
  const dates = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return d.toISOString().slice(0, 10);
  });

  return {
    resource: {
      id: resourceId,
      name: 'Mitarbeiter',
      shortCode: null,
      department: null,
      employeeType: 'internal',
      weeklyHours: 42.5,
      skills: [],
    },
    kw,
    year,
    dateRange: { from: dates[0], to: dates[4] },
    days: dates.map((date, idx) => ({
      date,
      dayName: dayNames[idx],
      morning: null,
      afternoon: null,
      availableHours: 8.5,
      assignedHours: 0,
    })),
    weekSummary: {
      totalAssigned: 0,
      totalAvailable: 42.5,
      utilizationPercent: 0,
    },
  };
}

function getISOWeekMonday(kw: number, year: number): Date {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dayOfWeek = jan4.getUTCDay() || 7;
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - (dayOfWeek - 1) + (kw - 1) * 7);
  return monday;
}

function getDatesInRange(from: string, to: string): string[] {
  const dates: string[] = [];
  const start = new Date(from + 'T00:00:00Z');
  const end = new Date(to + 'T00:00:00Z');
  const current = new Date(start);
  while (current <= end) {
    dates.push(current.toISOString().slice(0, 10));
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates;
}
