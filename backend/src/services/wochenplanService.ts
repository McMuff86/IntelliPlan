import { pool } from '../config/database';

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

// ─── Helpers ───────────────────────────────────────────

const DEPARTMENTS = [
  { key: 'zuschnitt', label: 'Zuschnitt' },
  { key: 'cnc', label: 'CNC' },
  { key: 'produktion', label: 'Produktion' },
  { key: 'behandlung', label: 'Behandlung' },
  { key: 'beschlaege', label: 'Beschläge' },
  { key: 'transport', label: 'Transport' },
  { key: 'montage', label: 'Montage' },
  { key: 'buero', label: 'Büro' },
] as const;

const PHASE_ORDER = ['zuschnitt', 'cnc', 'produktion', 'behandlung', 'beschlaege', 'transport', 'montage'] as const;

const DAY_NAMES = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'];

/**
 * Get the Monday–Friday date range for an ISO week number.
 */
function getWeekDateRange(kw: number, year: number): { from: string; to: string; dates: string[] } {
  // ISO week date: Jan 4 is always in week 1
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dayOfWeek = jan4.getUTCDay() || 7; // 1=Mon … 7=Sun
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - (dayOfWeek - 1) + (kw - 1) * 7);

  const dates: string[] = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date(monday);
    d.setUTCDate(monday.getUTCDate() + i);
    dates.push(d.toISOString().slice(0, 10));
  }

  return {
    from: dates[0],
    to: dates[4],
    dates,
  };
}

// ─── Main Service ──────────────────────────────────────

export async function getWeekPlan(kw: number, year: number): Promise<WeekPlanResponse> {
  const { from, to, dates } = getWeekDateRange(kw, year);

  // 1. Load tasks that have phase_schedules for this KW (or assignments in this week)
  const tasksResult = await pool.query<{
    task_id: string;
    task_title: string;
    task_description: string | null;
    project_id: string;
    order_number: string | null;
    sachbearbeiter: string | null;
    customer_name: string | null;
    installation_location: string | null;
    worker_count: number | null;
    color: string | null;
    contact_name: string | null;
    needs_callback: boolean;
    remarks: string | null;
  }>(
    `SELECT DISTINCT
       t.id AS task_id,
       t.title AS task_title,
       t.description AS task_description,
       t.project_id,
       p.order_number,
       p.sachbearbeiter,
       p.customer_name,
       p.installation_location,
       p.worker_count,
       p.color,
       p.contact_name,
       p.needs_callback,
       p.remarks
     FROM tasks t
     JOIN projects p ON p.id = t.project_id
     LEFT JOIN task_phase_schedules tps ON tps.task_id = t.id
     LEFT JOIN task_assignments ta ON ta.task_id = t.id AND ta.deleted_at IS NULL
     WHERE t.deleted_at IS NULL
       AND p.deleted_at IS NULL
       AND (
         (tps.planned_year = $1 AND tps.planned_kw = $2)
         OR (ta.assignment_date >= $3 AND ta.assignment_date <= $4)
       )
     ORDER BY p.order_number ASC NULLS LAST, t.title ASC`,
    [year, kw, from, to]
  );

  // 2. Load all phase_schedules for the found tasks
  const taskIds = tasksResult.rows.map((r) => r.task_id);
  let phasesMap = new Map<string, { phase: string; plannedKw: number | null }[]>();

  if (taskIds.length > 0) {
    const phasesResult = await pool.query<{
      task_id: string;
      phase: string;
      planned_kw: number | null;
    }>(
      `SELECT task_id, phase::text, planned_kw
       FROM task_phase_schedules
       WHERE task_id = ANY($1)
       ORDER BY
         CASE phase::text
           WHEN 'zuschnitt' THEN 0
           WHEN 'cnc' THEN 1
           WHEN 'produktion' THEN 2
           WHEN 'vorbehandlung' THEN 3
           WHEN 'behandlung' THEN 4
           WHEN 'nachbehandlung' THEN 5
           WHEN 'beschlaege' THEN 6
           WHEN 'transport' THEN 7
           WHEN 'montage' THEN 8
           ELSE 9
         END`,
      [taskIds]
    );

    for (const row of phasesResult.rows) {
      if (!phasesMap.has(row.task_id)) {
        phasesMap.set(row.task_id, []);
      }
      phasesMap.get(row.task_id)!.push({
        phase: row.phase,
        plannedKw: row.planned_kw,
      });
    }
  }

  // 3. Load task_assignments for the week
  let assignmentsMap = new Map<
    string,
    { id: string; date: string; half_day: string; resource_id: string; resource_short_code: string | null; resource_name: string; is_fixed: boolean; notes: string | null; status_code: string | null }[]
  >();

  if (taskIds.length > 0) {
    const assignmentsResult = await pool.query<{
      id: string;
      task_id: string;
      assignment_date: string;
      half_day: string;
      resource_id: string;
      resource_short_code: string | null;
      resource_name: string;
      is_fixed: boolean;
      notes: string | null;
      status_code: string | null;
    }>(
      `SELECT
         ta.id,
         ta.task_id,
         ta.assignment_date::text AS assignment_date,
         ta.half_day,
         ta.resource_id,
         r.short_code AS resource_short_code,
         r.name AS resource_name,
         ta.is_fixed,
         ta.notes,
         ta.status_code
       FROM task_assignments ta
       JOIN resources r ON r.id = ta.resource_id
       WHERE ta.task_id = ANY($1)
         AND ta.assignment_date >= $2
         AND ta.assignment_date <= $3
         AND ta.deleted_at IS NULL
       ORDER BY ta.assignment_date ASC, ta.half_day ASC`,
      [taskIds, from, to]
    );

    for (const row of assignmentsResult.rows) {
      if (!assignmentsMap.has(row.task_id)) {
        assignmentsMap.set(row.task_id, []);
      }
      assignmentsMap.get(row.task_id)!.push({
        id: row.id,
        date: row.assignment_date,
        half_day: row.half_day,
        resource_id: row.resource_id,
        resource_short_code: row.resource_short_code,
        resource_name: row.resource_name,
        is_fixed: row.is_fixed,
        notes: row.notes,
        status_code: row.status_code,
      });
    }
  }

  // 4. Load resources grouped by department
  const resourcesResult = await pool.query<{
    id: string;
    name: string;
    short_code: string | null;
    department: string | null;
    employee_type: string | null;
    weekly_hours: number | null;
  }>(
    `SELECT id, name, short_code, department, employee_type, weekly_hours
     FROM resources
     WHERE is_active = true
       AND resource_type = 'person'
     ORDER BY department ASC NULLS LAST, short_code ASC NULLS LAST, name ASC`
  );

  const resourcesByDept = new Map<string, WeekPlanResource[]>();
  for (const r of resourcesResult.rows) {
    const dept = r.department || 'unassigned';
    if (!resourcesByDept.has(dept)) {
      resourcesByDept.set(dept, []);
    }
    resourcesByDept.get(dept)!.push({
      id: r.id,
      name: r.name,
      shortCode: r.short_code,
      department: r.department,
      employeeType: r.employee_type,
      weeklyHours: Number(r.weekly_hours) || 42.5,
    });
  }

  // 5. Determine which department each task belongs to (based on phases scheduled for this KW)
  function getTaskDepartment(taskId: string): string {
    const phases = phasesMap.get(taskId) || [];
    for (const p of phases) {
      if (p.plannedKw === kw) {
        return p.phase;
      }
    }
    // If no phase matches this KW, check assignments
    const assignments = assignmentsMap.get(taskId) || [];
    if (assignments.length > 0) {
      // Try to infer from resource department
      // Fall back to 'produktion' as default
      return 'produktion';
    }
    return 'produktion';
  }

  // 6. Build day assignments for each task
  function buildDayAssignments(taskId: string): DayAssignment[] {
    const taskAssignments = assignmentsMap.get(taskId) || [];

    return dates.map((date, idx) => {
      const dayAssignments = taskAssignments.filter((a) => a.date === date);
      const morningAssignment = dayAssignments.find(
        (a) => a.half_day === 'morning' || a.half_day === 'full_day'
      );
      const afternoonAssignment = dayAssignments.find(
        (a) => a.half_day === 'afternoon' || a.half_day === 'full_day'
      );

      const isFixed = dayAssignments.some((a) => a.is_fixed);
      const notes = dayAssignments
        .filter((a) => a.notes)
        .map((a) => a.notes)
        .join('; ') || null;

      // Prefer short_code over name for KW-View display
      const getDisplayName = (a: typeof morningAssignment) =>
        a ? (a.resource_short_code || a.resource_name) : null;

      const buildDetail = (a: typeof morningAssignment): DayAssignmentDetail | null => {
        if (!a) return null;
        return {
          assignmentId: a.id,
          resourceId: a.resource_id,
          resourceName: a.resource_name,
          halfDay: a.half_day,
          isFixed: a.is_fixed,
          notes: a.notes,
          statusCode: a.status_code,
        };
      };

      return {
        date,
        dayName: DAY_NAMES[idx],
        morning: getDisplayName(morningAssignment),
        afternoon: getDisplayName(afternoonAssignment),
        morningStatusCode: morningAssignment?.status_code ?? null,
        afternoonStatusCode: afternoonAssignment?.status_code ?? null,
        morningDetail: buildDetail(morningAssignment),
        afternoonDetail: buildDetail(afternoonAssignment),
        isFixed,
        notes,
      };
    });
  }

  // 7. Group tasks into sections
  const tasksByDept = new Map<string, WeekPlanTask[]>();

  for (const row of tasksResult.rows) {
    const dept = getTaskDepartment(row.task_id);
    if (!tasksByDept.has(dept)) {
      tasksByDept.set(dept, []);
    }

    // Build all phases (always include all 6, even if not scheduled)
    const taskPhases = phasesMap.get(row.task_id) || [];
    const allPhases = PHASE_ORDER.map((phase) => {
      const found = taskPhases.find((p) => p.phase === phase);
      return { phase, plannedKw: found?.plannedKw ?? null };
    });

    tasksByDept.get(dept)!.push({
      taskId: row.task_id,
      projectOrderNumber: row.order_number || '',
      sachbearbeiter: row.sachbearbeiter || '',
      customerName: row.customer_name || '',
      description: row.task_title || '',
      installationLocation: row.installation_location || '',
      phases: allPhases,
      workerCount: Number(row.worker_count) || 0,
      color: row.color || '',
      contactName: row.contact_name || '',
      needsCallback: row.needs_callback ?? false,
      assignments: buildDayAssignments(row.task_id),
      remarks: row.remarks || '',
    });
  }

  // 8. Build sections
  const sections: Section[] = DEPARTMENTS.map(({ key, label }) => {
    const tasks = tasksByDept.get(key) || [];
    const resources = resourcesByDept.get(key) || [];
    const availableHours = resources.reduce((sum, r) => sum + r.weeklyHours, 0);

    // Count planned hours from assignments
    let plannedHalfDays = 0;
    for (const task of tasks) {
      for (const day of task.assignments) {
        if (day.morning) plannedHalfDays++;
        if (day.afternoon) plannedHalfDays++;
      }
    }
    // Each half-day = ~4.25 hours (42.5h / 5 days / 2 halves)
    const plannedHours = plannedHalfDays * 4.25;

    return {
      department: key,
      label,
      tasks,
      resources,
      totalHours: {
        planned: Math.round(plannedHours * 10) / 10,
        available: Math.round(availableHours * 10) / 10,
      },
    };
  });

  // 9. Capacity summary
  const totalAvailable = sections.reduce((s, sec) => s + sec.totalHours.available, 0);
  const totalPlanned = sections.reduce((s, sec) => s + sec.totalHours.planned, 0);

  const capacitySummary: CapacitySummary = {
    totalAvailableHours: Math.round(totalAvailable * 10) / 10,
    totalPlannedHours: Math.round(totalPlanned * 10) / 10,
    utilizationPercent: totalAvailable > 0 ? Math.round((totalPlanned / totalAvailable) * 1000) / 10 : 0,
    byDepartment: sections.map((sec) => ({
      department: sec.department,
      label: sec.label,
      availableHours: sec.totalHours.available,
      plannedHours: sec.totalHours.planned,
      utilizationPercent:
        sec.totalHours.available > 0
          ? Math.round((sec.totalHours.planned / sec.totalHours.available) * 1000) / 10
          : 0,
    })),
  };

  return {
    kw,
    year,
    dateRange: { from, to },
    sections,
    capacitySummary,
  };
}
