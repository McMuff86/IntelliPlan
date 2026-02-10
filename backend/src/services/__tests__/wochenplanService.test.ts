import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database pool
vi.mock('../../config/database', () => ({
  pool: {
    query: vi.fn(),
  },
}));

import { getWeekPlan as getWeekPlanRaw } from '../wochenplanService';
import type { WeekPlanResponse } from '../wochenplanService';
import { pool } from '../../config/database';

const mockedPool = vi.mocked(pool);
const OWNER_ID = 'owner-1';
const getWeekPlan = (kw: number, year: number) => getWeekPlanRaw(kw, year, OWNER_ID);

// ─── Helpers ───────────────────────────────────────────

/**
 * getWeekPlan makes 4 queries in order:
 *   Q0: tasks query (with joins to projects, phase_schedules, task_assignments)
 *   Q1: phase_schedules for found task IDs (only if tasks > 0)
 *   Q2: task_assignments for found task IDs (only if tasks > 0)
 *   Q3: resources by department (always)
 *
 * When no tasks are found, Q1 & Q2 are skipped:
 *   Q0: tasks → empty
 *   Q1: resources
 */

function mockEmptyWeek() {
  // Q0: tasks → empty
  mockedPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);
  // Q1: resources → empty
  mockedPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);
}

function mockResourcesOnly(resources: any[] = []) {
  // Q0: tasks → empty
  mockedPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);
  // Q1: resources
  mockedPool.query.mockResolvedValueOnce({ rows: resources, rowCount: resources.length } as any);
}

const makeTask = (overrides: Partial<Record<string, any>> = {}) => ({
  task_id: 'task-1',
  task_title: 'Montage Küche',
  task_description: 'Einbauküche montieren',
  project_description: 'Einbauküche montieren',
  project_id: 'proj-1',
  order_number: '2026-001',
  sachbearbeiter: 'MH',
  customer_name: 'Familie Müller',
  installation_location: 'Zürich',
  worker_count: 2,
  color: '#ff0000',
  contact_name: 'Hans Müller',
  needs_callback: false,
  remarks: 'Parkplatz beachten',
  ...overrides,
});

const makePhase = (overrides: Partial<Record<string, any>> = {}) => ({
  task_id: 'task-1',
  phase: 'produktion',
  planned_kw: 6,
  ...overrides,
});

const makeAssignment = (overrides: Partial<Record<string, any>> = {}) => ({
  task_id: 'task-1',
  assignment_date: '2026-02-02',
  half_day: 'morning',
  resource_short_code: 'MA_14',
  resource_name: 'Hans Müller',
  is_fixed: false,
  notes: null,
  status_code: 'assigned',
  ...overrides,
});

const makeResource = (overrides: Partial<Record<string, any>> = {}) => ({
  id: 'res-1',
  name: 'Hans Müller',
  short_code: 'MA_14',
  department: 'produktion',
  employee_type: 'internal',
  weekly_hours: 42.5,
  ...overrides,
});

/**
 * Sets up mock for a week with tasks, phases, assignments, and resources.
 */
function mockFullWeek(opts: {
  tasks?: any[];
  phases?: any[];
  assignments?: any[];
  resources?: any[];
}) {
  const tasks = opts.tasks ?? [makeTask()];
  const phases = opts.phases ?? [];
  const assignments = opts.assignments ?? [];
  const resources = opts.resources ?? [];

  // Q0: tasks
  mockedPool.query.mockResolvedValueOnce({ rows: tasks, rowCount: tasks.length } as any);

  if (tasks.length > 0) {
    // Q1: phases
    mockedPool.query.mockResolvedValueOnce({ rows: phases, rowCount: phases.length } as any);
    // Q2: assignments
    mockedPool.query.mockResolvedValueOnce({ rows: assignments, rowCount: assignments.length } as any);
  }

  // Q3 (or Q1 if no tasks): resources
  mockedPool.query.mockResolvedValueOnce({ rows: resources, rowCount: resources.length } as any);
}

// ─── getWeekDateRange (tested indirectly via getWeekPlan) ──

describe('wochenplanService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════
  // Date Range Tests (verified through getWeekPlan response)
  // ═══════════════════════════════════════════════════════

  describe('getWeekDateRange (via getWeekPlan)', () => {
    it('should return correct date range for a normal week (KW 6, 2026)', async () => {
      mockEmptyWeek();
      const result = await getWeekPlan(6, 2026);

      expect(result.dateRange.from).toBe('2026-02-02');
      expect(result.dateRange.to).toBe('2026-02-06');
      expect(result.kw).toBe(6);
      expect(result.year).toBe(2026);
    });

    it('should return Monday as first day (KW 10, 2026)', async () => {
      mockEmptyWeek();
      const result = await getWeekPlan(10, 2026);

      // KW 10 2026: March 2 (Monday) - March 6 (Friday)
      const fromDate = new Date(result.dateRange.from + 'T00:00:00Z');
      expect(fromDate.getUTCDay()).toBe(1); // 1 = Monday
    });

    it('should return Friday as last day (KW 10, 2026)', async () => {
      mockEmptyWeek();
      const result = await getWeekPlan(10, 2026);

      const toDate = new Date(result.dateRange.to + 'T00:00:00Z');
      expect(toDate.getUTCDay()).toBe(5); // 5 = Friday
    });

    it('should handle KW 1 (year boundary) correctly for 2026', async () => {
      mockEmptyWeek();
      const result = await getWeekPlan(1, 2026);

      // ISO KW 1 of 2026: Dec 29, 2025 (Monday) - Jan 2, 2026 (Friday)
      expect(result.dateRange.from).toBe('2025-12-29');
      expect(result.dateRange.to).toBe('2026-01-02');
    });

    it('should handle KW 53 of a long ISO year (2020 has 53 weeks)', async () => {
      mockEmptyWeek();
      const result = await getWeekPlan(53, 2020);

      // ISO KW 53 of 2020: Dec 28, 2020 (Mon) - Jan 1, 2021 (Fri)
      expect(result.dateRange.from).toBe('2020-12-28');
      expect(result.dateRange.to).toBe('2021-01-01');
    });

    it('should handle KW 52 of 2026 correctly', async () => {
      mockEmptyWeek();
      const result = await getWeekPlan(52, 2026);

      // ISO KW 52 of 2026: Dec 21, 2026 (Mon) - Dec 25, 2026 (Fri)
      expect(result.dateRange.from).toBe('2026-12-21');
      expect(result.dateRange.to).toBe('2026-12-25');
    });

    it('should handle leap year correctly (KW 9, 2024)', async () => {
      mockEmptyWeek();
      const result = await getWeekPlan(9, 2024);

      // 2024 is a leap year. KW 9 2024: Feb 26 (Mon) - Mar 1 (Fri)
      expect(result.dateRange.from).toBe('2024-02-26');
      expect(result.dateRange.to).toBe('2024-03-01');
    });

    it('should always return 5 workdays (Mon-Fri)', async () => {
      mockEmptyWeek();
      const result = await getWeekPlan(15, 2026);

      const from = new Date(result.dateRange.from + 'T00:00:00Z');
      const to = new Date(result.dateRange.to + 'T00:00:00Z');
      const diffDays = (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBe(4); // Mon to Fri = 4 day difference
    });
  });

  // ═══════════════════════════════════════════════════════
  // getWeekPlan – Empty & Basic Cases
  // ═══════════════════════════════════════════════════════

  describe('getWeekPlan – empty week', () => {
    it('should return empty sections when no tasks and no assignments exist', async () => {
      mockEmptyWeek();
      const result = await getWeekPlan(6, 2026);

      expect(result.sections).toHaveLength(8); // 8 DEPARTMENTS
      for (const section of result.sections) {
        expect(section.tasks).toHaveLength(0);
        expect(section.resources).toHaveLength(0);
      }
    });

    it('should return zero utilization for empty week', async () => {
      mockEmptyWeek();
      const result = await getWeekPlan(6, 2026);

      expect(result.capacitySummary.totalPlannedHours).toBe(0);
      expect(result.capacitySummary.totalAvailableHours).toBe(0);
      expect(result.capacitySummary.utilizationPercent).toBe(0);
    });

    it('should return all department sections in correct order', async () => {
      mockEmptyWeek();
      const result = await getWeekPlan(6, 2026);

      const deptKeys = result.sections.map((s) => s.department);
      expect(deptKeys).toEqual([
        'zuschnitt',
        'cnc',
        'produktion',
        'behandlung',
        'beschlaege',
        'transport',
        'montage',
        'buero',
      ]);
    });

    it('should return correct labels for all departments', async () => {
      mockEmptyWeek();
      const result = await getWeekPlan(6, 2026);

      const labels = result.sections.map((s) => s.label);
      expect(labels).toEqual([
        'Zuschnitt',
        'CNC',
        'Produktion',
        'Behandlung',
        'Beschläge',
        'Transport',
        'Montage',
        'Büro',
      ]);
    });
  });

  // ═══════════════════════════════════════════════════════
  // getWeekPlan – Tasks in Sections
  // ═══════════════════════════════════════════════════════

  describe('getWeekPlan – tasks with phases', () => {
    it('should place task in correct section based on phase_schedule matching KW', async () => {
      mockFullWeek({
        tasks: [makeTask()],
        phases: [makePhase({ phase: 'montage', planned_kw: 6 })],
        assignments: [],
        resources: [],
      });

      const result = await getWeekPlan(6, 2026);

      const montageSection = result.sections.find((s) => s.department === 'montage');
      expect(montageSection!.tasks).toHaveLength(1);
      expect(montageSection!.tasks[0].taskId).toBe('task-1');
    });

    it('should place task in produktion section by default when no phase matches KW', async () => {
      mockFullWeek({
        tasks: [makeTask()],
        phases: [makePhase({ phase: 'montage', planned_kw: 10 })], // KW 10, not KW 6
        assignments: [makeAssignment({ assignment_date: '2026-02-02' })], // has assignment in KW 6
        resources: [],
      });

      const result = await getWeekPlan(6, 2026);

      const produktionSection = result.sections.find((s) => s.department === 'produktion');
      expect(produktionSection!.tasks).toHaveLength(1);
    });

    it('should include tasks in multiple sections when they have different phases', async () => {
      const task1 = makeTask({ task_id: 'task-1' });
      const task2 = makeTask({ task_id: 'task-2', task_title: 'CNC Fräsen' });

      mockFullWeek({
        tasks: [task1, task2],
        phases: [
          makePhase({ task_id: 'task-1', phase: 'zuschnitt', planned_kw: 6 }),
          makePhase({ task_id: 'task-2', phase: 'cnc', planned_kw: 6 }),
        ],
        assignments: [],
        resources: [],
      });

      const result = await getWeekPlan(6, 2026);

      const zuschnitSection = result.sections.find((s) => s.department === 'zuschnitt');
      const cncSection = result.sections.find((s) => s.department === 'cnc');

      expect(zuschnitSection!.tasks).toHaveLength(1);
      expect(zuschnitSection!.tasks[0].taskId).toBe('task-1');
      expect(cncSection!.tasks).toHaveLength(1);
      expect(cncSection!.tasks[0].taskId).toBe('task-2');
    });

    it('should not show task when phase_schedules do NOT match the requested KW and no assignments', async () => {
      // This scenario: task has phase for KW 10, but the service is queried for KW 6.
      // The SQL WHERE clause filters this out at the DB level. Since the mock returns
      // no tasks, the task won't appear.
      mockFullWeek({
        tasks: [], // The DB would filter out tasks not in KW 6
        phases: [],
        assignments: [],
        resources: [],
      });

      const result = await getWeekPlan(6, 2026);
      const allTasks = result.sections.flatMap((s) => s.tasks);
      expect(allTasks).toHaveLength(0);
    });
  });

  // ═══════════════════════════════════════════════════════
  // getWeekPlan – Assignments
  // ═══════════════════════════════════════════════════════

  describe('getWeekPlan – day assignments', () => {
    it('should build 5 day assignments (Mon-Fri) for each task', async () => {
      mockFullWeek({
        tasks: [makeTask()],
        phases: [makePhase({ planned_kw: 6 })],
        assignments: [],
        resources: [],
      });

      const result = await getWeekPlan(6, 2026);
      const task = result.sections.find((s) => s.department === 'produktion')!.tasks[0];

      expect(task.assignments).toHaveLength(5);
      expect(task.assignments[0].dayName).toBe('Montag');
      expect(task.assignments[4].dayName).toBe('Freitag');
    });

    it('should show morning assignment correctly', async () => {
      mockFullWeek({
        tasks: [makeTask()],
        phases: [makePhase({ planned_kw: 6 })],
        assignments: [
          makeAssignment({
            assignment_date: '2026-02-02',
            half_day: 'morning',
            resource_short_code: 'MA_14',
            resource_name: 'Hans Müller',
          }),
        ],
        resources: [],
      });

      const result = await getWeekPlan(6, 2026);
      const task = result.sections.find((s) => s.department === 'produktion')!.tasks[0];
      const monday = task.assignments.find((a) => a.date === '2026-02-02')!;

      expect(monday.morning).toBe('MA_14');
      expect(monday.afternoon).toBeNull();
    });

    it('should show afternoon assignment correctly', async () => {
      mockFullWeek({
        tasks: [makeTask()],
        phases: [makePhase({ planned_kw: 6 })],
        assignments: [
          makeAssignment({
            assignment_date: '2026-02-02',
            half_day: 'afternoon',
            resource_short_code: 'JB',
          }),
        ],
        resources: [],
      });

      const result = await getWeekPlan(6, 2026);
      const task = result.sections.find((s) => s.department === 'produktion')!.tasks[0];
      const monday = task.assignments.find((a) => a.date === '2026-02-02')!;

      expect(monday.morning).toBeNull();
      expect(monday.afternoon).toBe('JB');
    });

    it('should show full_day assignment as both morning and afternoon', async () => {
      mockFullWeek({
        tasks: [makeTask()],
        phases: [makePhase({ planned_kw: 6 })],
        assignments: [
          makeAssignment({
            assignment_date: '2026-02-02',
            half_day: 'full_day',
            resource_short_code: 'MA_14',
          }),
        ],
        resources: [],
      });

      const result = await getWeekPlan(6, 2026);
      const task = result.sections.find((s) => s.department === 'produktion')!.tasks[0];
      const monday = task.assignments.find((a) => a.date === '2026-02-02')!;

      expect(monday.morning).toBe('MA_14');
      expect(monday.afternoon).toBe('MA_14');
    });

    it('should show null (FREI) for days without assignments', async () => {
      mockFullWeek({
        tasks: [makeTask()],
        phases: [makePhase({ planned_kw: 6 })],
        assignments: [], // No assignments at all
        resources: [],
      });

      const result = await getWeekPlan(6, 2026);
      const task = result.sections.find((s) => s.department === 'produktion')!.tasks[0];

      for (const day of task.assignments) {
        expect(day.morning).toBeNull();
        expect(day.afternoon).toBeNull();
      }
    });

    it('should prefer short_code over resource_name for display', async () => {
      mockFullWeek({
        tasks: [makeTask()],
        phases: [makePhase({ planned_kw: 6 })],
        assignments: [
          makeAssignment({
            assignment_date: '2026-02-02',
            half_day: 'morning',
            resource_short_code: 'MA_14',
            resource_name: 'Hans Müller',
          }),
        ],
        resources: [],
      });

      const result = await getWeekPlan(6, 2026);
      const task = result.sections.find((s) => s.department === 'produktion')!.tasks[0];
      const monday = task.assignments.find((a) => a.date === '2026-02-02')!;

      expect(monday.morning).toBe('MA_14');
    });

    it('should fall back to resource_name when short_code is null', async () => {
      mockFullWeek({
        tasks: [makeTask()],
        phases: [makePhase({ planned_kw: 6 })],
        assignments: [
          makeAssignment({
            assignment_date: '2026-02-02',
            half_day: 'morning',
            resource_short_code: null,
            resource_name: 'Hans Müller',
          }),
        ],
        resources: [],
      });

      const result = await getWeekPlan(6, 2026);
      const task = result.sections.find((s) => s.department === 'produktion')!.tasks[0];
      const monday = task.assignments.find((a) => a.date === '2026-02-02')!;

      expect(monday.morning).toBe('Hans Müller');
    });

    it('should include status_code in morningStatusCode and afternoonStatusCode', async () => {
      mockFullWeek({
        tasks: [makeTask()],
        phases: [makePhase({ planned_kw: 6 })],
        assignments: [
          makeAssignment({
            assignment_date: '2026-02-02',
            half_day: 'morning',
            status_code: 'sick',
          }),
          makeAssignment({
            assignment_date: '2026-02-02',
            half_day: 'afternoon',
            status_code: 'vacation',
          }),
        ],
        resources: [],
      });

      const result = await getWeekPlan(6, 2026);
      const task = result.sections.find((s) => s.department === 'produktion')!.tasks[0];
      const monday = task.assignments.find((a) => a.date === '2026-02-02')!;

      expect(monday.morningStatusCode).toBe('sick');
      expect(monday.afternoonStatusCode).toBe('vacation');
    });

    it('should set isFixed=true when any assignment on a day is fixed', async () => {
      mockFullWeek({
        tasks: [makeTask()],
        phases: [makePhase({ planned_kw: 6 })],
        assignments: [
          makeAssignment({
            assignment_date: '2026-02-02',
            half_day: 'morning',
            is_fixed: true,
          }),
          makeAssignment({
            assignment_date: '2026-02-02',
            half_day: 'afternoon',
            is_fixed: false,
          }),
        ],
        resources: [],
      });

      const result = await getWeekPlan(6, 2026);
      const task = result.sections.find((s) => s.department === 'produktion')!.tasks[0];
      const monday = task.assignments.find((a) => a.date === '2026-02-02')!;

      expect(monday.isFixed).toBe(true);
    });

    it('should concatenate notes from multiple assignments on same day', async () => {
      mockFullWeek({
        tasks: [makeTask()],
        phases: [makePhase({ planned_kw: 6 })],
        assignments: [
          makeAssignment({
            assignment_date: '2026-02-02',
            half_day: 'morning',
            notes: 'Früh da sein',
          }),
          makeAssignment({
            assignment_date: '2026-02-02',
            half_day: 'afternoon',
            notes: 'Material mitbringen',
          }),
        ],
        resources: [],
      });

      const result = await getWeekPlan(6, 2026);
      const task = result.sections.find((s) => s.department === 'produktion')!.tasks[0];
      const monday = task.assignments.find((a) => a.date === '2026-02-02')!;

      expect(monday.notes).toBe('Früh da sein; Material mitbringen');
    });

    it('should handle multiple resources assigned to the same task on different days', async () => {
      mockFullWeek({
        tasks: [makeTask()],
        phases: [makePhase({ planned_kw: 6 })],
        assignments: [
          makeAssignment({
            assignment_date: '2026-02-02',
            half_day: 'full_day',
            resource_short_code: 'MA_14',
          }),
          makeAssignment({
            assignment_date: '2026-02-03',
            half_day: 'full_day',
            resource_short_code: 'JB',
          }),
        ],
        resources: [],
      });

      const result = await getWeekPlan(6, 2026);
      const task = result.sections.find((s) => s.department === 'produktion')!.tasks[0];

      const monday = task.assignments.find((a) => a.date === '2026-02-02')!;
      const tuesday = task.assignments.find((a) => a.date === '2026-02-03')!;

      expect(monday.morning).toBe('MA_14');
      expect(tuesday.morning).toBe('JB');
    });

    it('should handle bulk assignments across entire week', async () => {
      const weekDates = ['2026-02-02', '2026-02-03', '2026-02-04', '2026-02-05', '2026-02-06'];
      const bulkAssignments = weekDates.map((date) =>
        makeAssignment({
          assignment_date: date,
          half_day: 'full_day',
          resource_short_code: 'MA_14',
        })
      );

      mockFullWeek({
        tasks: [makeTask()],
        phases: [makePhase({ planned_kw: 6 })],
        assignments: bulkAssignments,
        resources: [],
      });

      const result = await getWeekPlan(6, 2026);
      const task = result.sections.find((s) => s.department === 'produktion')!.tasks[0];

      for (const day of task.assignments) {
        expect(day.morning).toBe('MA_14');
        expect(day.afternoon).toBe('MA_14');
      }
    });
  });

  // ═══════════════════════════════════════════════════════
  // getWeekPlan – Resources & Departments
  // ═══════════════════════════════════════════════════════

  describe('getWeekPlan – resources and department grouping', () => {
    it('should group resources into their correct department sections', async () => {
      mockResourcesOnly([
        makeResource({ id: 'res-1', department: 'produktion', name: 'Hans' }),
        makeResource({ id: 'res-2', department: 'montage', name: 'Peter' }),
        makeResource({ id: 'res-3', department: 'produktion', name: 'Fritz' }),
      ]);

      const result = await getWeekPlan(6, 2026);

      const produktionSection = result.sections.find((s) => s.department === 'produktion')!;
      const montageSection = result.sections.find((s) => s.department === 'montage')!;

      expect(produktionSection.resources).toHaveLength(2);
      expect(montageSection.resources).toHaveLength(1);
    });

    it('should handle resource without department (unassigned)', async () => {
      mockResourcesOnly([
        makeResource({ id: 'res-1', department: null, name: 'Neue Person' }),
      ]);

      const result = await getWeekPlan(6, 2026);

      // Resources with null department go to 'unassigned' key,
      // which doesn't match any DEPARTMENTS section, so they don't appear in standard sections
      const allResources = result.sections.flatMap((s) => s.resources);
      expect(allResources).toHaveLength(0);
    });

    it('should map WeekPlanResource fields correctly', async () => {
      mockResourcesOnly([
        makeResource({
          id: 'res-1',
          name: 'Hans Müller',
          short_code: 'MA_14',
          department: 'produktion',
          employee_type: 'internal',
          weekly_hours: 42.5,
        }),
      ]);

      const result = await getWeekPlan(6, 2026);
      const resource = result.sections.find((s) => s.department === 'produktion')!.resources[0];

      expect(resource.id).toBe('res-1');
      expect(resource.name).toBe('Hans Müller');
      expect(resource.shortCode).toBe('MA_14');
      expect(resource.department).toBe('produktion');
      expect(resource.employeeType).toBe('internal');
      expect(resource.weeklyHours).toBe(42.5);
    });

    it('should default weeklyHours to 42.5 when null', async () => {
      mockResourcesOnly([
        makeResource({ department: 'produktion', weekly_hours: null }),
      ]);

      const result = await getWeekPlan(6, 2026);
      const resource = result.sections.find((s) => s.department === 'produktion')!.resources[0];

      expect(resource.weeklyHours).toBe(42.5);
    });
  });

  // ═══════════════════════════════════════════════════════
  // getWeekPlan – Capacity Calculation
  // ═══════════════════════════════════════════════════════

  describe('getWeekPlan – capacity calculation', () => {
    it('should calculate available hours from resources in section', async () => {
      mockResourcesOnly([
        makeResource({ department: 'produktion', weekly_hours: 42.5 }),
        makeResource({ id: 'res-2', department: 'produktion', weekly_hours: 42.5 }),
      ]);

      const result = await getWeekPlan(6, 2026);
      const produktionSection = result.sections.find((s) => s.department === 'produktion')!;

      expect(produktionSection.totalHours.available).toBe(85); // 2 × 42.5
    });

    it('should calculate planned hours from assignments (4.25h per half-day)', async () => {
      mockFullWeek({
        tasks: [makeTask()],
        phases: [makePhase({ planned_kw: 6 })],
        assignments: [
          makeAssignment({ assignment_date: '2026-02-02', half_day: 'morning' }),
          makeAssignment({ assignment_date: '2026-02-02', half_day: 'afternoon' }),
          makeAssignment({ assignment_date: '2026-02-03', half_day: 'morning' }),
        ],
        resources: [makeResource({ department: 'produktion', weekly_hours: 42.5 })],
      });

      const result = await getWeekPlan(6, 2026);
      const produktionSection = result.sections.find((s) => s.department === 'produktion')!;

      // 3 half-days × 4.25h = 12.75h (but full_day counts as 2 in display)
      // morning shows resource → 1 half-day counted
      // afternoon shows resource → 1 half-day counted
      // morning shows resource → 1 half-day counted
      // Total: 3 half-days × 4.25 = 12.75
      expect(produktionSection.totalHours.planned).toBe(12.8); // Rounded to 1 decimal
    });

    it('should calculate utilization percent correctly', async () => {
      mockFullWeek({
        tasks: [makeTask()],
        phases: [makePhase({ planned_kw: 6 })],
        assignments: [
          makeAssignment({ assignment_date: '2026-02-02', half_day: 'full_day' }),
        ],
        resources: [makeResource({ department: 'produktion', weekly_hours: 42.5 })],
      });

      const result = await getWeekPlan(6, 2026);

      // full_day shows in both morning and afternoon → 2 half-days
      // planned = 2 × 4.25 = 8.5h, available = 42.5h
      expect(result.capacitySummary.totalPlannedHours).toBe(8.5);
      expect(result.capacitySummary.totalAvailableHours).toBe(42.5);
      expect(result.capacitySummary.utilizationPercent).toBe(20);
    });

    it('should return 0% utilization when no resources exist', async () => {
      mockEmptyWeek();
      const result = await getWeekPlan(6, 2026);

      expect(result.capacitySummary.utilizationPercent).toBe(0);
    });

    it('should include per-department capacity breakdown', async () => {
      mockResourcesOnly([
        makeResource({ department: 'produktion', weekly_hours: 42.5 }),
        makeResource({ id: 'res-2', department: 'montage', weekly_hours: 42.5 }),
      ]);

      const result = await getWeekPlan(6, 2026);

      const prodCap = result.capacitySummary.byDepartment.find((d) => d.department === 'produktion')!;
      expect(prodCap.availableHours).toBe(42.5);
      expect(prodCap.plannedHours).toBe(0);
      expect(prodCap.utilizationPercent).toBe(0);

      const montCap = result.capacitySummary.byDepartment.find((d) => d.department === 'montage')!;
      expect(montCap.availableHours).toBe(42.5);
    });
  });

  // ═══════════════════════════════════════════════════════
  // getWeekPlan – Task Field Mapping
  // ═══════════════════════════════════════════════════════

  describe('getWeekPlan – task field mapping', () => {
    it('should map all task fields correctly', async () => {
      mockFullWeek({
        tasks: [makeTask({
          order_number: '2026-042',
          sachbearbeiter: 'MH',
          customer_name: 'Familie Schmidt',
          task_title: 'Einbauschrank',
          project_description: 'Einbauschrank',
          installation_location: 'Bern',
          worker_count: 3,
          color: '#00ff00',
          contact_name: 'Peter Schmidt',
          needs_callback: true,
          remarks: 'Achtung Treppen',
        })],
        phases: [makePhase({ planned_kw: 6 })],
        assignments: [],
        resources: [],
      });

      const result = await getWeekPlan(6, 2026);
      const task = result.sections.find((s) => s.department === 'produktion')!.tasks[0];

      expect(task.projectOrderNumber).toBe('2026-042');
      expect(task.sachbearbeiter).toBe('MH');
      expect(task.customerName).toBe('Familie Schmidt');
      expect(task.description).toBe('Einbauschrank');
      expect(task.installationLocation).toBe('Bern');
      expect(task.workerCount).toBe(3);
      expect(task.color).toBe('#00ff00');
      expect(task.contactName).toBe('Peter Schmidt');
      expect(task.needsCallback).toBe(true);
      expect(task.remarks).toBe('Achtung Treppen');
    });

    it('should use empty strings as defaults for null task fields', async () => {
      mockFullWeek({
        tasks: [makeTask({
          order_number: null,
          sachbearbeiter: null,
          customer_name: null,
          installation_location: null,
          color: null,
          contact_name: null,
          remarks: null,
        })],
        phases: [makePhase({ planned_kw: 6 })],
        assignments: [],
        resources: [],
      });

      const result = await getWeekPlan(6, 2026);
      const task = result.sections.find((s) => s.department === 'produktion')!.tasks[0];

      expect(task.projectOrderNumber).toBe('');
      expect(task.sachbearbeiter).toBe('');
      expect(task.customerName).toBe('');
      expect(task.installationLocation).toBe('');
      expect(task.color).toBe('');
      expect(task.contactName).toBe('');
      expect(task.remarks).toBe('');
    });

    it('should include all phases from PHASE_ORDER even when not scheduled', async () => {
      mockFullWeek({
        tasks: [makeTask()],
        phases: [
          makePhase({ phase: 'cnc', planned_kw: 6 }),
          makePhase({ phase: 'montage', planned_kw: 8 }),
        ],
        assignments: [],
        resources: [],
      });

      const result = await getWeekPlan(6, 2026);
      const task = result.sections.find((s) => s.department === 'cnc')!.tasks[0];

      expect(task.phases).toHaveLength(7); // All 7 PHASE_ORDER phases
      expect(task.phases.map((p) => p.phase)).toEqual([
        'zuschnitt', 'cnc', 'produktion', 'behandlung', 'beschlaege', 'transport', 'montage',
      ]);

      const cncPhase = task.phases.find((p) => p.phase === 'cnc')!;
      expect(cncPhase.plannedKw).toBe(6);

      const montagePhase = task.phases.find((p) => p.phase === 'montage')!;
      expect(montagePhase.plannedKw).toBe(8);

      // Unscheduled phases should have null
      const zuschnitPhase = task.phases.find((p) => p.phase === 'zuschnitt')!;
      expect(zuschnitPhase.plannedKw).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════
  // getWeekPlan – Edge Cases
  // ═══════════════════════════════════════════════════════

  describe('getWeekPlan – edge cases', () => {
    it('should pass correct SQL parameters for KW/year query', async () => {
      mockEmptyWeek();
      await getWeekPlan(6, 2026);

      // Q0: tasks query - check the parameters: [year, kw, from, to]
      const params = mockedPool.query.mock.calls[0][1] as any[];
      expect(params[0]).toBe(2026); // year
      expect(params[1]).toBe(6); // kw
      expect(params[2]).toBe('2026-02-02'); // from (Monday)
      expect(params[3]).toBe('2026-02-06'); // to (Friday)
    });

    it('should enforce owner scope in tasks query', async () => {
      mockEmptyWeek();
      await getWeekPlan(6, 2026);

      const query = mockedPool.query.mock.calls[0][0] as string;
      const params = mockedPool.query.mock.calls[0][1] as any[];
      expect(query).toContain('t.owner_id = $5');
      expect(query).toContain('p.owner_id = $5');
      expect(params[4]).toBe(OWNER_ID);
    });

    it('should exclude soft-deleted tasks via SQL', async () => {
      mockEmptyWeek();
      await getWeekPlan(6, 2026);

      const query = mockedPool.query.mock.calls[0][0] as string;
      expect(query).toContain('t.deleted_at IS NULL');
      expect(query).toContain('p.deleted_at IS NULL');
    });

    it('should exclude soft-deleted assignments via SQL', async () => {
      mockFullWeek({
        tasks: [makeTask()],
        phases: [],
        assignments: [],
        resources: [],
      });

      await getWeekPlan(6, 2026);

      // Q2: assignments query
      const assignQuery = mockedPool.query.mock.calls[2][0] as string;
      expect(assignQuery).toContain('ta.deleted_at IS NULL');
    });

    it('should handle task with assignment status_code sick/vacation', async () => {
      mockFullWeek({
        tasks: [makeTask()],
        phases: [makePhase({ planned_kw: 6 })],
        assignments: [
          makeAssignment({
            assignment_date: '2026-02-02',
            half_day: 'full_day',
            status_code: 'sick',
            resource_short_code: 'MA_14',
          }),
          makeAssignment({
            assignment_date: '2026-02-03',
            half_day: 'morning',
            status_code: 'vacation',
            resource_short_code: 'JB',
          }),
        ],
        resources: [],
      });

      const result = await getWeekPlan(6, 2026);
      const task = result.sections.find((s) => s.department === 'produktion')!.tasks[0];

      const monday = task.assignments.find((a) => a.date === '2026-02-02')!;
      expect(monday.morningStatusCode).toBe('sick');
      expect(monday.afternoonStatusCode).toBe('sick');

      const tuesday = task.assignments.find((a) => a.date === '2026-02-03')!;
      expect(tuesday.morningStatusCode).toBe('vacation');
      expect(tuesday.afternoonStatusCode).toBeNull();
    });

    it('should handle KW 1 year boundary correctly (2026 KW 1 starts in 2025)', async () => {
      mockEmptyWeek();
      const result = await getWeekPlan(1, 2026);

      // SQL params should use dates from late December 2025
      const params = mockedPool.query.mock.calls[0][1] as any[];
      expect(params[2]).toBe('2025-12-29'); // from
      expect(params[3]).toBe('2026-01-02'); // to
    });

    it('should pass task IDs to phase and assignment queries', async () => {
      const tasks = [
        makeTask({ task_id: 'task-a' }),
        makeTask({ task_id: 'task-b' }),
      ];

      mockFullWeek({
        tasks,
        phases: [],
        assignments: [],
        resources: [],
      });

      await getWeekPlan(6, 2026);

      // Q1: phases query - should pass task IDs as array
      const phaseParams = mockedPool.query.mock.calls[1][1] as any[];
      expect(phaseParams[0]).toEqual(['task-a', 'task-b']);

      // Q2: assignments query - should pass task IDs as array
      const assignParams = mockedPool.query.mock.calls[2][1] as any[];
      expect(assignParams[0]).toEqual(['task-a', 'task-b']);
    });

    it('should return correct response structure', async () => {
      mockEmptyWeek();
      const result = await getWeekPlan(6, 2026);

      // Verify top-level structure
      expect(result).toHaveProperty('kw');
      expect(result).toHaveProperty('year');
      expect(result).toHaveProperty('dateRange');
      expect(result).toHaveProperty('sections');
      expect(result).toHaveProperty('capacitySummary');
      expect(result.dateRange).toHaveProperty('from');
      expect(result.dateRange).toHaveProperty('to');
      expect(result.capacitySummary).toHaveProperty('totalAvailableHours');
      expect(result.capacitySummary).toHaveProperty('totalPlannedHours');
      expect(result.capacitySummary).toHaveProperty('utilizationPercent');
      expect(result.capacitySummary).toHaveProperty('byDepartment');
    });
  });
});
