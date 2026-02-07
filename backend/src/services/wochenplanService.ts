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

// ─── WP3 + WP4 Types ──────────────────────────────────

export interface ConflictDetail {
  assignmentId: string;
  taskId: string;
  projectOrderNumber: string;
  customerName: string;
  description: string;
}

export interface ConflictEntry {
  resourceId: string;
  resourceName: string;
  shortCode: string;
  date: string;
  halfDay: string;
  assignments: ConflictDetail[];
}

export interface ConflictsResponse {
  kw: number;
  year: number;
  conflicts: ConflictEntry[];
}

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
  conflicts: ConflictEntry[];
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

export interface CopyWeekOptions {
  includeAssignments: boolean;
}

export interface CopyWeekResponse {
  copiedPhaseSchedules: number;
  copiedAssignments: number;
  targetKw: number;
  targetYear: number;
}

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

export interface ResourceSlot {
  taskId: string | null;
  projectOrderNumber: string;
  customerName: string;
  description: string;
  installationLocation: string;
  isFixed: boolean;
  notes: string | null;
  statusCode: string;
}

export interface ResourceDaySchedule {
  date: string;
  dayName: string;
  morning: ResourceSlot | null;
  afternoon: ResourceSlot | null;
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

export interface ResourceOverviewSlot {
  taskId: string | null;
  shortLabel: string;
  statusCode: string;
}

export interface ResourceOverviewEntry {
  resourceId: string;
  resourceName: string;
  shortCode: string | null;
  department: string | null;
  employeeType: string | null;
  weeklyHours: number;
  utilizationPercent: number;
  days: {
    date: string;
    morning: ResourceOverviewSlot | null;
    afternoon: ResourceOverviewSlot | null;
  }[];
}

export interface ResourcesOverviewResponse {
  kw: number;
  year: number;
  dateRange: { from: string; to: string };
  resources: ResourceOverviewEntry[];
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

// ─── WP3: Intelligent KW-View API ─────────────────────

/**
 * 3.1 Conflict Detection
 * Find resources assigned to multiple tasks in the same half-day slot.
 */
export async function getWeekConflicts(kw: number, year: number): Promise<ConflictsResponse> {
  const { from, to } = getWeekDateRange(kw, year);

  // Find all (resource_id, assignment_date, effective_half_day) combos with >1 assignment
  // full_day counts as both morning and afternoon
  const conflictsResult = await pool.query<{
    resource_id: string;
    resource_name: string;
    short_code: string | null;
    assignment_date: string;
    effective_half: string;
  }>(
    `WITH expanded AS (
       SELECT
         ta.id AS assignment_id,
         ta.resource_id,
         ta.task_id,
         ta.assignment_date,
         ta.half_day,
         unnest(
           CASE ta.half_day
             WHEN 'full_day' THEN ARRAY['morning', 'afternoon']
             ELSE ARRAY[ta.half_day]
           END
         ) AS effective_half
       FROM task_assignments ta
       WHERE ta.assignment_date >= $1
         AND ta.assignment_date <= $2
         AND ta.deleted_at IS NULL
     ),
     conflicts AS (
       SELECT resource_id, assignment_date, effective_half
       FROM expanded
       GROUP BY resource_id, assignment_date, effective_half
       HAVING COUNT(*) > 1
     )
     SELECT DISTINCT c.resource_id, r.name AS resource_name, r.short_code,
            c.assignment_date::text AS assignment_date, c.effective_half
     FROM conflicts c
     JOIN resources r ON r.id = c.resource_id
     ORDER BY c.assignment_date, r.short_code, c.effective_half`,
    [from, to]
  );

  if (conflictsResult.rows.length === 0) {
    return { kw, year, conflicts: [] };
  }

  // For each conflict, load the assignment details
  const conflictKeys = conflictsResult.rows.map((r) => ({
    resourceId: r.resource_id,
    resourceName: r.resource_name,
    shortCode: r.short_code || '',
    date: r.assignment_date,
    halfDay: r.effective_half,
  }));

  // Load all assignments in the week to build detail
  const assignmentsResult = await pool.query<{
    id: string;
    task_id: string;
    resource_id: string;
    assignment_date: string;
    half_day: string;
    order_number: string | null;
    customer_name: string | null;
    task_title: string;
  }>(
    `SELECT
       ta.id,
       ta.task_id,
       ta.resource_id,
       ta.assignment_date::text AS assignment_date,
       ta.half_day,
       p.order_number,
       p.customer_name,
       t.title AS task_title
     FROM task_assignments ta
     JOIN tasks t ON t.id = ta.task_id
     JOIN projects p ON p.id = t.project_id
     WHERE ta.assignment_date >= $1
       AND ta.assignment_date <= $2
       AND ta.deleted_at IS NULL
     ORDER BY ta.assignment_date ASC`,
    [from, to]
  );

  // Build conflict entries
  const conflicts: ConflictEntry[] = conflictKeys.map((ck) => {
    const matchingAssignments = assignmentsResult.rows.filter((a) => {
      if (a.resource_id !== ck.resourceId || a.assignment_date !== ck.date) return false;
      // Check if assignment covers this half-day
      return a.half_day === ck.halfDay || a.half_day === 'full_day';
    });

    return {
      resourceId: ck.resourceId,
      resourceName: ck.resourceName,
      shortCode: ck.shortCode,
      date: ck.date,
      halfDay: ck.halfDay,
      assignments: matchingAssignments.map((a) => ({
        assignmentId: a.id,
        taskId: a.task_id,
        projectOrderNumber: a.order_number || '',
        customerName: a.customer_name || '',
        description: a.task_title || '',
      })),
    };
  });

  return { kw, year, conflicts };
}

/**
 * 3.2 Quick-Assign Batch
 * Create multiple assignments with conflict pre-check.
 */
export async function quickAssign(assignments: QuickAssignInput[]): Promise<QuickAssignResponse> {
  // Pre-check: detect conflicts by looking for existing assignments on the same slots
  const conflictChecks: { resourceId: string; date: string; halfDay: string }[] = [];
  for (const a of assignments) {
    if (a.halfDay === 'full_day') {
      conflictChecks.push({ resourceId: a.resourceId, date: a.date, halfDay: 'morning' });
      conflictChecks.push({ resourceId: a.resourceId, date: a.date, halfDay: 'afternoon' });
    } else {
      conflictChecks.push({ resourceId: a.resourceId, date: a.date, halfDay: a.halfDay });
    }
  }

  // Check for conflicts with existing assignments
  const conflicts: ConflictEntry[] = [];
  if (conflictChecks.length > 0) {
    const dates = [...new Set(conflictChecks.map((c) => c.date))];
    const resourceIds = [...new Set(conflictChecks.map((c) => c.resourceId))];

    const existingResult = await pool.query<{
      id: string;
      task_id: string;
      resource_id: string;
      assignment_date: string;
      half_day: string;
      order_number: string | null;
      customer_name: string | null;
      task_title: string;
      resource_name: string;
      short_code: string | null;
    }>(
      `SELECT
         ta.id, ta.task_id, ta.resource_id,
         ta.assignment_date::text AS assignment_date, ta.half_day,
         p.order_number, p.customer_name, t.title AS task_title,
         r.name AS resource_name, r.short_code
       FROM task_assignments ta
       JOIN tasks t ON t.id = ta.task_id
       JOIN projects p ON p.id = t.project_id
       JOIN resources r ON r.id = ta.resource_id
       WHERE ta.resource_id = ANY($1)
         AND ta.assignment_date = ANY($2)
         AND ta.deleted_at IS NULL`,
      [resourceIds, dates]
    );

    for (const check of conflictChecks) {
      const existing = existingResult.rows.filter((e) => {
        if (e.resource_id !== check.resourceId || e.assignment_date !== check.date) return false;
        return e.half_day === check.halfDay || e.half_day === 'full_day';
      });
      if (existing.length > 0) {
        conflicts.push({
          resourceId: check.resourceId,
          resourceName: existing[0].resource_name,
          shortCode: existing[0].short_code || '',
          date: check.date,
          halfDay: check.halfDay,
          assignments: existing.map((e) => ({
            assignmentId: e.id,
            taskId: e.task_id,
            projectOrderNumber: e.order_number || '',
            customerName: e.customer_name || '',
            description: e.task_title || '',
          })),
        });
      }
    }
  }

  if (conflicts.length > 0) {
    return { created: 0, conflicts, assignments: [] };
  }

  // No conflicts → create assignments in a transaction
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const createdAssignments: QuickAssignResponse['assignments'] = [];

    for (const a of assignments) {
      const result = await client.query<{
        id: string;
        task_id: string;
        resource_id: string;
        assignment_date: string;
        half_day: string;
        is_fixed: boolean;
        status_code: string;
      }>(
        `INSERT INTO task_assignments (task_id, resource_id, assignment_date, half_day, is_fixed, status_code, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, task_id, resource_id, assignment_date::text AS assignment_date, half_day, is_fixed, status_code`,
        [
          a.taskId,
          a.resourceId,
          a.date,
          a.halfDay,
          a.isFixed ?? false,
          a.statusCode ?? 'assigned',
          a.notes ?? null,
        ]
      );

      const row = result.rows[0];
      createdAssignments.push({
        id: row.id,
        taskId: row.task_id,
        resourceId: row.resource_id,
        date: row.assignment_date,
        halfDay: row.half_day,
        isFixed: row.is_fixed,
        statusCode: row.status_code,
      });
    }

    await client.query('COMMIT');

    return {
      created: createdAssignments.length,
      conflicts: [],
      assignments: createdAssignments,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * 3.3 Copy-Week
 * Copy task_phase_schedules + task_assignments from source KW to target KW.
 */
export async function copyWeek(
  sourceKw: number,
  sourceYear: number,
  targetKw: number,
  targetYear: number,
  options: CopyWeekOptions
): Promise<CopyWeekResponse> {
  const source = getWeekDateRange(sourceKw, sourceYear);
  const target = getWeekDateRange(targetKw, targetYear);

  // Check if target already has data
  const existingCheck = await pool.query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM task_phase_schedules
     WHERE planned_kw = $1 AND planned_year = $2`,
    [targetKw, targetYear]
  );

  if (parseInt(existingCheck.rows[0].count, 10) > 0) {
    throw new Error(`Target KW ${targetKw}/${targetYear} already has phase schedules. Cannot copy.`);
  }

  if (options.includeAssignments) {
    const existingAssignments = await pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM task_assignments
       WHERE assignment_date >= $1 AND assignment_date <= $2 AND deleted_at IS NULL`,
      [target.from, target.to]
    );

    if (parseInt(existingAssignments.rows[0].count, 10) > 0) {
      throw new Error(`Target KW ${targetKw}/${targetYear} already has assignments. Cannot copy.`);
    }
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Copy phase schedules: update planned_kw/planned_year for the new week
    const phaseResult = await client.query<{ count: string }>(
      `INSERT INTO task_phase_schedules (task_id, phase, planned_kw, planned_year, status)
       SELECT task_id, phase, $3, $4, 'planned'
       FROM task_phase_schedules
       WHERE planned_kw = $1 AND planned_year = $2
       ON CONFLICT (task_id, phase) DO NOTHING`,
      [sourceKw, sourceYear, targetKw, targetYear]
    );

    const copiedPhaseSchedules = phaseResult.rowCount ?? 0;
    let copiedAssignments = 0;

    if (options.includeAssignments) {
      // Calculate day offset between source and target weeks
      const sourceMonday = new Date(source.from + 'T00:00:00Z');
      const targetMonday = new Date(target.from + 'T00:00:00Z');
      const dayOffsetMs = targetMonday.getTime() - sourceMonday.getTime();
      const dayOffset = dayOffsetMs / (1000 * 60 * 60 * 24);

      const assignResult = await client.query<{ count: string }>(
        `INSERT INTO task_assignments (task_id, resource_id, assignment_date, half_day, is_fixed, status_code, notes)
         SELECT task_id, resource_id,
                (assignment_date + ($3 || ' days')::interval)::date,
                half_day, is_fixed, status_code, notes
         FROM task_assignments
         WHERE assignment_date >= $1
           AND assignment_date <= $2
           AND deleted_at IS NULL`,
        [source.from, source.to, String(dayOffset)]
      );

      copiedAssignments = assignResult.rowCount ?? 0;
    }

    await client.query('COMMIT');

    return {
      copiedPhaseSchedules,
      copiedAssignments,
      targetKw,
      targetYear,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * 3.4 Unassigned Tasks
 * Find tasks with phase_schedules for this KW but zero assignments.
 */
export async function getUnassignedTasks(kw: number, year: number): Promise<UnassignedResponse> {
  const { from, to } = getWeekDateRange(kw, year);

  const result = await pool.query<{
    task_id: string;
    order_number: string | null;
    customer_name: string | null;
    task_title: string;
    installation_location: string | null;
    phase: string;
    planned_kw: number | null;
  }>(
    `SELECT
       t.id AS task_id,
       p.order_number,
       p.customer_name,
       t.title AS task_title,
       p.installation_location,
       tps.phase::text AS phase,
       tps.planned_kw
     FROM tasks t
     JOIN projects p ON p.id = t.project_id
     JOIN task_phase_schedules tps ON tps.task_id = t.id
     WHERE t.deleted_at IS NULL
       AND p.deleted_at IS NULL
       AND tps.planned_year = $1
       AND tps.planned_kw = $2
       AND NOT EXISTS (
         SELECT 1 FROM task_assignments ta
         WHERE ta.task_id = t.id
           AND ta.assignment_date >= $3
           AND ta.assignment_date <= $4
           AND ta.deleted_at IS NULL
       )
     ORDER BY tps.phase, p.order_number ASC NULLS LAST`,
    [year, kw, from, to]
  );

  // Group by department (phase → department mapping)
  const taskMap = new Map<string, UnassignedTask>();
  const taskDept = new Map<string, string>();

  for (const row of result.rows) {
    if (!taskMap.has(row.task_id)) {
      taskMap.set(row.task_id, {
        taskId: row.task_id,
        projectOrderNumber: row.order_number || '',
        customerName: row.customer_name || '',
        description: row.task_title || '',
        installationLocation: row.installation_location || '',
        phases: [],
      });
    }
    taskMap.get(row.task_id)!.phases.push({
      phase: row.phase,
      plannedKw: row.planned_kw,
    });
    // Use the phase that matches this KW as the department
    if (row.planned_kw === kw) {
      taskDept.set(row.task_id, row.phase);
    }
  }

  // Group into departments
  const deptMap = new Map<string, UnassignedTask[]>();
  for (const [taskId, task] of taskMap) {
    const dept = taskDept.get(taskId) || 'produktion';
    if (!deptMap.has(dept)) {
      deptMap.set(dept, []);
    }
    deptMap.get(dept)!.push(task);
  }

  const departments: UnassignedByDepartment[] = DEPARTMENTS
    .filter(({ key }) => deptMap.has(key))
    .map(({ key, label }) => ({
      department: key,
      label,
      tasks: deptMap.get(key) || [],
    }));

  const totalUnassigned = taskMap.size;

  return { kw, year, totalUnassigned, departments };
}

/**
 * 3.5 KW-Phase-Matrix
 * Multi-week view: which tasks are in which phase across KWs.
 */
export async function getPhaseMatrix(
  fromKw: number,
  toKw: number,
  year: number
): Promise<PhaseMatrixResponse> {
  const kwRange: number[] = [];
  for (let kw = fromKw; kw <= toKw; kw++) {
    kwRange.push(kw);
  }

  const result = await pool.query<{
    task_id: string;
    order_number: string | null;
    customer_name: string | null;
    task_title: string;
    phase: string;
    planned_kw: number;
  }>(
    `SELECT
       t.id AS task_id,
       p.order_number,
       p.customer_name,
       t.title AS task_title,
       tps.phase::text AS phase,
       tps.planned_kw
     FROM tasks t
     JOIN projects p ON p.id = t.project_id
     JOIN task_phase_schedules tps ON tps.task_id = t.id
     WHERE t.deleted_at IS NULL
       AND p.deleted_at IS NULL
       AND tps.planned_year = $1
       AND tps.planned_kw >= $2
       AND tps.planned_kw <= $3
     ORDER BY p.order_number ASC NULLS LAST, t.title ASC, tps.planned_kw ASC`,
    [year, fromKw, toKw]
  );

  // Group by task
  const taskMap = new Map<string, {
    taskId: string;
    projectOrderNumber: string;
    customerName: string;
    description: string;
    phasesByKw: Map<number, string[]>;
  }>();

  for (const row of result.rows) {
    if (!taskMap.has(row.task_id)) {
      taskMap.set(row.task_id, {
        taskId: row.task_id,
        projectOrderNumber: row.order_number || '',
        customerName: row.customer_name || '',
        description: row.task_title || '',
        phasesByKw: new Map(),
      });
    }
    const entry = taskMap.get(row.task_id)!;
    if (!entry.phasesByKw.has(row.planned_kw)) {
      entry.phasesByKw.set(row.planned_kw, []);
    }
    entry.phasesByKw.get(row.planned_kw)!.push(row.phase);
  }

  // Build matrix entries
  const tasks: PhaseMatrixEntry[] = Array.from(taskMap.values()).map((t) => ({
    taskId: t.taskId,
    projectOrderNumber: t.projectOrderNumber,
    customerName: t.customerName,
    description: t.description,
    weeks: kwRange.map((kw) => ({
      kw,
      phases: t.phasesByKw.get(kw) || [],
    })),
  }));

  return { fromKw, toKw, year, kwRange, tasks };
}

// ─── WP4: Mitarbeiter-View API ────────────────────────

/**
 * 4.1 Resource Weekly Schedule
 * Returns resource info + days array with morning/afternoon slots.
 */
export async function getResourceSchedule(
  resourceId: string,
  kw: number,
  year: number
): Promise<ResourceWeekSchedule | null> {
  const { from, to, dates } = getWeekDateRange(kw, year);

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
     WHERE id = $1 AND is_active = true AND resource_type = 'person'`,
    [resourceId]
  );

  if (resourceResult.rows.length === 0) return null;

  const resource = resourceResult.rows[0];
  const weeklyHours = Number(resource.weekly_hours) || 42.5;
  const dailyHours = weeklyHours / 5;

  // Load assignments for this resource in the week
  const assignmentsResult = await pool.query<{
    id: string;
    task_id: string;
    assignment_date: string;
    half_day: string;
    is_fixed: boolean;
    notes: string | null;
    status_code: string | null;
    order_number: string | null;
    customer_name: string | null;
    task_title: string;
    installation_location: string | null;
  }>(
    `SELECT
       ta.id,
       ta.task_id,
       ta.assignment_date::text AS assignment_date,
       ta.half_day,
       ta.is_fixed,
       ta.notes,
       ta.status_code,
       p.order_number,
       p.customer_name,
       t.title AS task_title,
       p.installation_location
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

  // Build days
  const days: ResourceDaySchedule[] = dates.map((date, idx) => {
    const dayAssignments = assignmentsResult.rows.filter((a) => a.assignment_date === date);

    const buildSlot = (halfDay: 'morning' | 'afternoon'): ResourceSlot | null => {
      const assignment = dayAssignments.find(
        (a) => a.half_day === halfDay || a.half_day === 'full_day'
      );
      if (!assignment) return null;
      return {
        taskId: assignment.task_id,
        projectOrderNumber: assignment.order_number || '',
        customerName: assignment.customer_name || '',
        description: assignment.task_title || '',
        installationLocation: assignment.installation_location || '',
        isFixed: assignment.is_fixed,
        notes: assignment.notes,
        statusCode: assignment.status_code || 'assigned',
      };
    };

    const morning = buildSlot('morning');
    const afternoon = buildSlot('afternoon');

    let assignedHalfDays = 0;
    if (morning) assignedHalfDays++;
    if (afternoon) assignedHalfDays++;

    return {
      date,
      dayName: DAY_NAMES[idx],
      morning,
      afternoon,
      availableHours: Math.round(dailyHours * 100) / 100,
      assignedHours: Math.round(assignedHalfDays * (dailyHours / 2) * 100) / 100,
    };
  });

  const totalAssigned = days.reduce((s, d) => s + d.assignedHours, 0);
  const totalAvailable = days.reduce((s, d) => s + d.availableHours, 0);

  return {
    resource: {
      id: resource.id,
      name: resource.name,
      shortCode: resource.short_code,
      department: resource.department,
      employeeType: resource.employee_type,
      weeklyHours,
    },
    kw,
    year,
    dateRange: { from, to },
    days,
    weekSummary: {
      totalAssigned: Math.round(totalAssigned * 100) / 100,
      totalAvailable: Math.round(totalAvailable * 100) / 100,
      utilizationPercent:
        totalAvailable > 0
          ? Math.round((totalAssigned / totalAvailable) * 1000) / 10
          : 0,
    },
  };
}

/**
 * 4.2 All-Resources Week Overview
 * Compact matrix: all resources × 5 days × 2 half-days.
 */
export async function getResourcesOverview(
  kw: number,
  year: number,
  department?: string
): Promise<ResourcesOverviewResponse> {
  const { from, to, dates } = getWeekDateRange(kw, year);

  // Load resources
  const conditions = [`r.is_active = true`, `r.resource_type = 'person'`];
  const params: unknown[] = [];

  if (department) {
    params.push(department);
    conditions.push(`r.department = $${params.length}`);
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
     WHERE ${conditions.join(' AND ')}
     ORDER BY r.department ASC NULLS LAST, r.short_code ASC NULLS LAST, r.name ASC`,
    params
  );

  if (resourcesResult.rows.length === 0) {
    return { kw, year, dateRange: { from, to }, resources: [] };
  }

  // Load all assignments for these resources
  const resourceIds = resourcesResult.rows.map((r) => r.id);

  const assignmentsResult = await pool.query<{
    resource_id: string;
    task_id: string;
    assignment_date: string;
    half_day: string;
    status_code: string | null;
    order_number: string | null;
    task_title: string;
  }>(
    `SELECT
       ta.resource_id,
       ta.task_id,
       ta.assignment_date::text AS assignment_date,
       ta.half_day,
       ta.status_code,
       p.order_number,
       t.title AS task_title
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

  // Group assignments by resource
  const assignmentsByResource = new Map<string, typeof assignmentsResult.rows>();
  for (const a of assignmentsResult.rows) {
    if (!assignmentsByResource.has(a.resource_id)) {
      assignmentsByResource.set(a.resource_id, []);
    }
    assignmentsByResource.get(a.resource_id)!.push(a);
  }

  // Build overview entries
  const resources: ResourceOverviewEntry[] = resourcesResult.rows.map((r) => {
    const weeklyHours = Number(r.weekly_hours) || 42.5;
    const dailyHours = weeklyHours / 5;
    const resAssignments = assignmentsByResource.get(r.id) || [];

    let totalAssignedHalfDays = 0;

    const days = dates.map((date) => {
      const dayAssignments = resAssignments.filter((a) => a.assignment_date === date);

      const buildSlot = (halfDay: 'morning' | 'afternoon'): ResourceOverviewSlot | null => {
        const a = dayAssignments.find(
          (da) => da.half_day === halfDay || da.half_day === 'full_day'
        );
        if (!a) return null;
        totalAssignedHalfDays++;
        return {
          taskId: a.task_id,
          shortLabel: a.order_number || a.task_title || '',
          statusCode: a.status_code || 'assigned',
        };
      };

      return {
        date,
        morning: buildSlot('morning'),
        afternoon: buildSlot('afternoon'),
      };
    });

    const totalAssignedHours = totalAssignedHalfDays * (dailyHours / 2);
    const utilizationPercent =
      weeklyHours > 0
        ? Math.round((totalAssignedHours / weeklyHours) * 1000) / 10
        : 0;

    return {
      resourceId: r.id,
      resourceName: r.name,
      shortCode: r.short_code,
      department: r.department,
      employeeType: r.employee_type,
      weeklyHours,
      utilizationPercent,
      days,
    };
  });

  return { kw, year, dateRange: { from, to }, resources };
}
