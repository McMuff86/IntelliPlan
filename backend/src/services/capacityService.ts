import { pool } from '../config/database';
import type { Department } from '../models/resource';

// ─── Types ─────────────────────────────────────────────

export interface CapacityQuery {
  from: string;       // ISO date
  to: string;         // ISO date
  department?: string; // Filter
  resourceId?: string; // Filter einzelner MA
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

export interface PeriodCapacity {
  date: string;
  dayName: string;
  availableHours: number;
  assignedHours: number;
  utilizationPercent: number;
  assignments: PeriodAssignment[];
  isOverbooked: boolean;
}

export interface PeriodAssignment {
  taskId: string;
  projectName: string;
  halfDay: string;
  statusCode: string;
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

export interface CapacityOverview {
  from: string;
  to: string;
  totalAvailableHours: number;
  totalAssignedHours: number;
  utilizationPercent: number;
  overbookedResources: OverbookedResource[];
  departments: DepartmentCapacity[];
}

export interface OverbookedResource {
  resourceId: string;
  resourceName: string;
  shortCode: string;
  department: string;
  utilizationPercent: number;
}

// ─── Constants ─────────────────────────────────────────

const DEPARTMENTS: { key: string; label: string }[] = [
  { key: 'zuschnitt', label: 'Zuschnitt' },
  { key: 'cnc', label: 'CNC' },
  { key: 'produktion', label: 'Produktion' },
  { key: 'behandlung', label: 'Behandlung' },
  { key: 'beschlaege', label: 'Beschläge' },
  { key: 'transport', label: 'Transport' },
  { key: 'montage', label: 'Montage' },
  { key: 'buero', label: 'Büro' },
];

const DAY_NAMES: Record<number, string> = {
  0: 'Sonntag',
  1: 'Montag',
  2: 'Dienstag',
  3: 'Mittwoch',
  4: 'Donnerstag',
  5: 'Freitag',
  6: 'Samstag',
};

// ─── Helpers ───────────────────────────────────────────

function getDepartmentLabel(dept: string): string {
  return DEPARTMENTS.find((d) => d.key === dept)?.label ?? dept;
}

/**
 * Calculate the dates (as ISO strings) between from and to inclusive.
 * Only weekdays (Mon-Fri) are returned.
 */
export function getWeekdaysBetween(from: string, to: string): string[] {
  const dates: string[] = [];
  const start = new Date(from + 'T00:00:00Z');
  const end = new Date(to + 'T00:00:00Z');

  const current = new Date(start);
  while (current <= end) {
    const day = current.getUTCDay();
    if (day >= 1 && day <= 5) {
      dates.push(current.toISOString().slice(0, 10));
    }
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return dates;
}

/**
 * Calculate half-day to hours conversion.
 * morning = 0.5 day, afternoon = 0.5 day, full_day = 1 day
 * Hours = fraction * dailyHours
 */
export function halfDayToHours(halfDay: string, dailyHours: number): number {
  switch (halfDay) {
    case 'morning':
    case 'afternoon':
      return dailyHours * 0.5;
    case 'full_day':
      return dailyHours;
    default:
      return 0;
  }
}

/**
 * Build a ResourceCapacity from resource data + assignments.
 */
function buildResourceCapacity(
  resource: {
    id: string;
    name: string;
    short_code: string | null;
    department: string | null;
    employee_type: string | null;
    weekly_hours: number | null;
  },
  dates: string[],
  assignments: {
    assignment_date: string;
    half_day: string;
    task_id: string;
    project_name: string;
    status_code: string | null;
  }[]
): ResourceCapacity {
  const weeklyHours = Number(resource.weekly_hours) || 42.5;
  const dailyHours = weeklyHours / 5;

  const periods: PeriodCapacity[] = dates.map((date) => {
    const dateObj = new Date(date + 'T00:00:00Z');
    const dayName = DAY_NAMES[dateObj.getUTCDay()] || '';
    const dayAssignments = assignments.filter((a) => a.assignment_date === date);

    let assignedHours = 0;
    const periodAssignments: PeriodAssignment[] = [];

    for (const a of dayAssignments) {
      assignedHours += halfDayToHours(a.half_day, dailyHours);
      periodAssignments.push({
        taskId: a.task_id,
        projectName: a.project_name,
        halfDay: a.half_day,
        statusCode: a.status_code || 'assigned',
      });
    }

    const utilizationPercent =
      dailyHours > 0 ? Math.round((assignedHours / dailyHours) * 1000) / 10 : 0;

    return {
      date,
      dayName,
      availableHours: Math.round(dailyHours * 100) / 100,
      assignedHours: Math.round(assignedHours * 100) / 100,
      utilizationPercent,
      assignments: periodAssignments,
      isOverbooked: assignedHours > dailyHours,
    };
  });

  return {
    resourceId: resource.id,
    resourceName: resource.name,
    shortCode: resource.short_code || '',
    department: resource.department || '',
    employeeType: resource.employee_type || '',
    weeklyHours,
    periods,
  };
}

// ─── Service Functions ─────────────────────────────────

/**
 * Get capacity overview for all departments.
 */
export async function getCapacityOverview(query: CapacityQuery): Promise<CapacityOverview> {
  const { from, to, department } = query;
  const dates = getWeekdaysBetween(from, to);

  // 1. Load resources (optionally filtered by department)
  const resourceConditions = [`r.is_active = true`, `r.resource_type = 'person'`, `r.deleted_at IS NULL`];
  const resourceParams: unknown[] = [];

  if (department) {
    resourceParams.push(department);
    resourceConditions.push(`r.department = $${resourceParams.length}`);
  }

  const resourcesResult = await pool.query<{
    id: string;
    name: string;
    short_code: string | null;
    department: string | null;
    employee_type: string | null;
    weekly_hours: number | null;
  }>(
    `SELECT id, name, short_code, department, employee_type, weekly_hours
     FROM resources r
     WHERE ${resourceConditions.join(' AND ')}
     ORDER BY department ASC NULLS LAST, short_code ASC NULLS LAST, name ASC`
    , resourceParams
  );

  if (resourcesResult.rows.length === 0 || dates.length === 0) {
    const depts = department
      ? [{ department, label: getDepartmentLabel(department), resourceCount: 0, totalAvailableHours: 0, totalAssignedHours: 0, utilizationPercent: 0, overbookedCount: 0, resources: [] }]
      : DEPARTMENTS.map((d) => ({
          department: d.key,
          label: d.label,
          resourceCount: 0,
          totalAvailableHours: 0,
          totalAssignedHours: 0,
          utilizationPercent: 0,
          overbookedCount: 0,
          resources: [],
        }));

    return {
      from,
      to,
      totalAvailableHours: 0,
      totalAssignedHours: 0,
      utilizationPercent: 0,
      overbookedResources: [],
      departments: depts,
    };
  }

  // 2. Load all assignments for these resources in the date range
  const resourceIds = resourcesResult.rows.map((r) => r.id);

  const assignmentsResult = await pool.query<{
    resource_id: string;
    assignment_date: string;
    half_day: string;
    task_id: string;
    project_name: string;
    status_code: string | null;
  }>(
    `SELECT
       ta.resource_id,
       ta.assignment_date::text AS assignment_date,
       ta.half_day,
       ta.task_id,
       p.name AS project_name,
       ta.status_code
     FROM task_assignments ta
     JOIN tasks t ON t.id = ta.task_id
     JOIN projects p ON p.id = t.project_id
     WHERE ta.resource_id = ANY($1)
       AND ta.assignment_date >= $2
       AND ta.assignment_date <= $3
       AND ta.deleted_at IS NULL
     ORDER BY ta.assignment_date ASC, ta.half_day ASC`,
    [resourceIds, from, to]
  );

  // Group assignments by resource_id
  const assignmentsByResource = new Map<string, typeof assignmentsResult.rows>();
  for (const a of assignmentsResult.rows) {
    if (!assignmentsByResource.has(a.resource_id)) {
      assignmentsByResource.set(a.resource_id, []);
    }
    assignmentsByResource.get(a.resource_id)!.push(a);
  }

  // 3. Build ResourceCapacity for each resource
  const resourceCapacities: ResourceCapacity[] = resourcesResult.rows.map((r) => {
    return buildResourceCapacity(
      r,
      dates,
      assignmentsByResource.get(r.id) || []
    );
  });

  // 4. Group by department
  const deptMap = new Map<string, ResourceCapacity[]>();
  for (const rc of resourceCapacities) {
    const dept = rc.department || 'unassigned';
    if (!deptMap.has(dept)) {
      deptMap.set(dept, []);
    }
    deptMap.get(dept)!.push(rc);
  }

  // 5. Build DepartmentCapacity
  const departmentsToShow = department
    ? [{ key: department, label: getDepartmentLabel(department) }]
    : DEPARTMENTS;

  const departments: DepartmentCapacity[] = departmentsToShow.map(({ key, label }) => {
    const resources = deptMap.get(key) || [];
    const totalAvailableHours = resources.reduce(
      (sum, r) => sum + r.periods.reduce((s, p) => s + p.availableHours, 0),
      0
    );
    const totalAssignedHours = resources.reduce(
      (sum, r) => sum + r.periods.reduce((s, p) => s + p.assignedHours, 0),
      0
    );

    // A resource is overbooked if any of its periods is overbooked
    const overbookedCount = resources.filter((r) =>
      r.periods.some((p) => p.isOverbooked)
    ).length;

    return {
      department: key,
      label,
      resourceCount: resources.length,
      totalAvailableHours: Math.round(totalAvailableHours * 100) / 100,
      totalAssignedHours: Math.round(totalAssignedHours * 100) / 100,
      utilizationPercent:
        totalAvailableHours > 0
          ? Math.round((totalAssignedHours / totalAvailableHours) * 1000) / 10
          : 0,
      overbookedCount,
      resources,
    };
  });

  // 6. Build overview totals
  const totalAvailableHours = departments.reduce((s, d) => s + d.totalAvailableHours, 0);
  const totalAssignedHours = departments.reduce((s, d) => s + d.totalAssignedHours, 0);

  // Top overbooked resources
  const overbookedResources: OverbookedResource[] = resourceCapacities
    .map((r) => {
      const totalAvail = r.periods.reduce((s, p) => s + p.availableHours, 0);
      const totalAssigned = r.periods.reduce((s, p) => s + p.assignedHours, 0);
      const utilPct = totalAvail > 0 ? Math.round((totalAssigned / totalAvail) * 1000) / 10 : 0;
      return {
        resourceId: r.resourceId,
        resourceName: r.resourceName,
        shortCode: r.shortCode,
        department: r.department,
        utilizationPercent: utilPct,
      };
    })
    .filter((r) => r.utilizationPercent > 100)
    .sort((a, b) => b.utilizationPercent - a.utilizationPercent)
    .slice(0, 5);

  return {
    from,
    to,
    totalAvailableHours: Math.round(totalAvailableHours * 100) / 100,
    totalAssignedHours: Math.round(totalAssignedHours * 100) / 100,
    utilizationPercent:
      totalAvailableHours > 0
        ? Math.round((totalAssignedHours / totalAvailableHours) * 1000) / 10
        : 0,
    overbookedResources,
    departments,
  };
}

/**
 * Get capacity for a single department.
 */
export async function getDepartmentCapacity(
  dept: string,
  query: CapacityQuery
): Promise<DepartmentCapacity> {
  const overview = await getCapacityOverview({ ...query, department: dept });
  return (
    overview.departments.find((d) => d.department === dept) ?? {
      department: dept,
      label: getDepartmentLabel(dept),
      resourceCount: 0,
      totalAvailableHours: 0,
      totalAssignedHours: 0,
      utilizationPercent: 0,
      overbookedCount: 0,
      resources: [],
    }
  );
}

/**
 * Get capacity for a single resource.
 */
export async function getResourceCapacity(
  resourceId: string,
  query: CapacityQuery
): Promise<ResourceCapacity | null> {
  const { from, to } = query;
  const dates = getWeekdaysBetween(from, to);

  if (dates.length === 0) return null;

  // Load resource
  const resourceResult = await pool.query<{
    id: string;
    name: string;
    short_code: string | null;
    department: string | null;
    employee_type: string | null;
    weekly_hours: number | null;
  }>(
    `SELECT id, name, short_code, department, employee_type, weekly_hours
     FROM resources
     WHERE id = $1 AND deleted_at IS NULL`,
    [resourceId]
  );

  if (resourceResult.rows.length === 0) return null;

  // Load assignments
  const assignmentsResult = await pool.query<{
    resource_id: string;
    assignment_date: string;
    half_day: string;
    task_id: string;
    project_name: string;
    status_code: string | null;
  }>(
    `SELECT
       ta.resource_id,
       ta.assignment_date::text AS assignment_date,
       ta.half_day,
       ta.task_id,
       p.name AS project_name,
       ta.status_code
     FROM task_assignments ta
     JOIN tasks t ON t.id = ta.task_id
     JOIN projects p ON p.id = t.project_id
     WHERE ta.resource_id = $1
       AND ta.assignment_date >= $2
       AND ta.assignment_date <= $3
       AND ta.deleted_at IS NULL
     ORDER BY ta.assignment_date ASC, ta.half_day ASC`,
    [resourceId, from, to]
  );

  return buildResourceCapacity(
    resourceResult.rows[0],
    dates,
    assignmentsResult.rows
  );
}
