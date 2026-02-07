import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database pool
vi.mock('../../config/database', () => ({
  pool: {
    query: vi.fn(),
  },
}));

import {
  getResourceSchedule,
  getResourcesOverview,
} from '../wochenplanService';
import { pool } from '../../config/database';

const mockedPool = vi.mocked(pool);

// ─── Factories ─────────────────────────────────────────

const makeResource = (overrides: Partial<Record<string, any>> = {}) => ({
  id: 'res-1',
  name: 'Hans Müller',
  short_code: 'MA_14',
  department: 'produktion',
  employee_type: 'internal',
  weekly_hours: 42.5,
  ...overrides,
});

const makeScheduleAssignment = (overrides: Partial<Record<string, any>> = {}) => ({
  id: 'assign-1',
  task_id: 'task-1',
  assignment_date: '2026-02-02',
  half_day: 'morning',
  is_fixed: false,
  notes: null,
  status_code: 'assigned',
  order_number: '2026-001',
  customer_name: 'Familie Müller',
  task_title: 'Montage Küche',
  installation_location: 'Zürich',
  ...overrides,
});

const makeOverviewAssignment = (overrides: Partial<Record<string, any>> = {}) => ({
  resource_id: 'res-1',
  task_id: 'task-1',
  assignment_date: '2026-02-02',
  half_day: 'morning',
  status_code: 'assigned',
  order_number: '2026-001',
  task_title: 'Montage Küche',
  ...overrides,
});

// ═══════════════════════════════════════════════════════
// 4.1 Resource Weekly Schedule
// ═══════════════════════════════════════════════════════

describe('getResourceSchedule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return null when resource not found', async () => {
    mockedPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

    const result = await getResourceSchedule('non-existent', 6, 2026);

    expect(result).toBeNull();
  });

  it('should return resource info and empty days when no assignments', async () => {
    // Q0: resource
    mockedPool.query.mockResolvedValueOnce({
      rows: [makeResource()],
      rowCount: 1,
    } as any);
    // Q1: assignments → empty
    mockedPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

    const result = await getResourceSchedule('res-1', 6, 2026);

    expect(result).not.toBeNull();
    expect(result!.resource.id).toBe('res-1');
    expect(result!.resource.name).toBe('Hans Müller');
    expect(result!.resource.shortCode).toBe('MA_14');
    expect(result!.resource.department).toBe('produktion');
    expect(result!.resource.employeeType).toBe('internal');
    expect(result!.resource.weeklyHours).toBe(42.5);
    expect(result!.kw).toBe(6);
    expect(result!.year).toBe(2026);
    expect(result!.dateRange.from).toBe('2026-02-02');
    expect(result!.dateRange.to).toBe('2026-02-06');
    expect(result!.days).toHaveLength(5);

    for (const day of result!.days) {
      expect(day.morning).toBeNull();
      expect(day.afternoon).toBeNull();
      expect(day.assignedHours).toBe(0);
      expect(day.availableHours).toBe(8.5); // 42.5 / 5
    }
  });

  it('should return correct day names', async () => {
    mockedPool.query.mockResolvedValueOnce({ rows: [makeResource()], rowCount: 1 } as any);
    mockedPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

    const result = await getResourceSchedule('res-1', 6, 2026);

    const dayNames = result!.days.map((d) => d.dayName);
    expect(dayNames).toEqual(['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag']);
  });

  it('should show morning assignment with task details', async () => {
    mockedPool.query.mockResolvedValueOnce({ rows: [makeResource()], rowCount: 1 } as any);
    mockedPool.query.mockResolvedValueOnce({
      rows: [makeScheduleAssignment({
        assignment_date: '2026-02-02',
        half_day: 'morning',
        order_number: '2026-042',
        customer_name: 'Schmidt',
        task_title: 'Einbauschrank',
        installation_location: 'Bern',
        is_fixed: true,
        notes: 'Parkplatz links',
        status_code: 'assigned',
      })],
      rowCount: 1,
    } as any);

    const result = await getResourceSchedule('res-1', 6, 2026);
    const monday = result!.days.find((d) => d.date === '2026-02-02')!;

    expect(monday.morning).not.toBeNull();
    expect(monday.morning!.taskId).toBe('task-1');
    expect(monday.morning!.projectOrderNumber).toBe('2026-042');
    expect(monday.morning!.customerName).toBe('Schmidt');
    expect(monday.morning!.description).toBe('Einbauschrank');
    expect(monday.morning!.installationLocation).toBe('Bern');
    expect(monday.morning!.isFixed).toBe(true);
    expect(monday.morning!.notes).toBe('Parkplatz links');
    expect(monday.morning!.statusCode).toBe('assigned');
    expect(monday.afternoon).toBeNull();
  });

  it('should show full_day as both morning and afternoon', async () => {
    mockedPool.query.mockResolvedValueOnce({ rows: [makeResource()], rowCount: 1 } as any);
    mockedPool.query.mockResolvedValueOnce({
      rows: [makeScheduleAssignment({ half_day: 'full_day' })],
      rowCount: 1,
    } as any);

    const result = await getResourceSchedule('res-1', 6, 2026);
    const monday = result!.days.find((d) => d.date === '2026-02-02')!;

    expect(monday.morning).not.toBeNull();
    expect(monday.afternoon).not.toBeNull();
    expect(monday.morning!.taskId).toBe('task-1');
    expect(monday.afternoon!.taskId).toBe('task-1');
  });

  it('should calculate utilization correctly for full week', async () => {
    const weekDates = ['2026-02-02', '2026-02-03', '2026-02-04', '2026-02-05', '2026-02-06'];
    const assignments = weekDates.map((date) =>
      makeScheduleAssignment({ assignment_date: date, half_day: 'full_day' })
    );

    mockedPool.query.mockResolvedValueOnce({ rows: [makeResource({ weekly_hours: 42.5 })], rowCount: 1 } as any);
    mockedPool.query.mockResolvedValueOnce({ rows: assignments, rowCount: 5 } as any);

    const result = await getResourceSchedule('res-1', 6, 2026);

    expect(result!.weekSummary.totalAssigned).toBe(42.5);
    expect(result!.weekSummary.totalAvailable).toBe(42.5);
    expect(result!.weekSummary.utilizationPercent).toBe(100);
  });

  it('should calculate utilization for partial week', async () => {
    mockedPool.query.mockResolvedValueOnce({ rows: [makeResource({ weekly_hours: 42.5 })], rowCount: 1 } as any);
    mockedPool.query.mockResolvedValueOnce({
      rows: [
        makeScheduleAssignment({ assignment_date: '2026-02-02', half_day: 'morning' }),
        makeScheduleAssignment({ assignment_date: '2026-02-02', half_day: 'afternoon', id: 'a2', task_id: 'task-2' }),
      ],
      rowCount: 2,
    } as any);

    const result = await getResourceSchedule('res-1', 6, 2026);

    // 2 half-days × 4.25h = 8.5h assigned, 42.5h available
    expect(result!.weekSummary.totalAssigned).toBe(8.5);
    expect(result!.weekSummary.utilizationPercent).toBe(20);
  });

  it('should return 0% utilization when resource has no assignments', async () => {
    mockedPool.query.mockResolvedValueOnce({ rows: [makeResource()], rowCount: 1 } as any);
    mockedPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

    const result = await getResourceSchedule('res-1', 6, 2026);

    expect(result!.weekSummary.totalAssigned).toBe(0);
    expect(result!.weekSummary.utilizationPercent).toBe(0);
  });

  it('should use correct weekly_hours when different from default', async () => {
    mockedPool.query.mockResolvedValueOnce({ rows: [makeResource({ weekly_hours: 20 })], rowCount: 1 } as any);
    mockedPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

    const result = await getResourceSchedule('res-1', 6, 2026);

    expect(result!.resource.weeklyHours).toBe(20);
    expect(result!.days[0].availableHours).toBe(4); // 20/5
  });

  it('should default weeklyHours to 42.5 when null', async () => {
    mockedPool.query.mockResolvedValueOnce({ rows: [makeResource({ weekly_hours: null })], rowCount: 1 } as any);
    mockedPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

    const result = await getResourceSchedule('res-1', 6, 2026);

    expect(result!.resource.weeklyHours).toBe(42.5);
    expect(result!.days[0].availableHours).toBe(8.5);
  });

  it('should handle status code in slot', async () => {
    mockedPool.query.mockResolvedValueOnce({ rows: [makeResource()], rowCount: 1 } as any);
    mockedPool.query.mockResolvedValueOnce({
      rows: [makeScheduleAssignment({ status_code: 'sick', half_day: 'full_day' })],
      rowCount: 1,
    } as any);

    const result = await getResourceSchedule('res-1', 6, 2026);
    const monday = result!.days.find((d) => d.date === '2026-02-02')!;

    expect(monday.morning!.statusCode).toBe('sick');
    expect(monday.afternoon!.statusCode).toBe('sick');
  });

  it('should pass correct SQL parameters', async () => {
    mockedPool.query.mockResolvedValueOnce({ rows: [makeResource()], rowCount: 1 } as any);
    mockedPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

    await getResourceSchedule('res-1', 6, 2026);

    // Resource query
    expect(mockedPool.query.mock.calls[0][1]).toEqual(['res-1']);

    // Assignments query
    const assignParams = mockedPool.query.mock.calls[1][1] as any[];
    expect(assignParams[0]).toBe('res-1');
    expect(assignParams[1]).toBe('2026-02-02');
    expect(assignParams[2]).toBe('2026-02-06');
  });
});

// ═══════════════════════════════════════════════════════
// 4.2 All-Resources Week Overview
// ═══════════════════════════════════════════════════════

describe('getResourcesOverview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return empty when no resources exist', async () => {
    mockedPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

    const result = await getResourcesOverview(6, 2026);

    expect(result.kw).toBe(6);
    expect(result.year).toBe(2026);
    expect(result.resources).toHaveLength(0);
  });

  it('should return resource overview with empty days when no assignments', async () => {
    mockedPool.query.mockResolvedValueOnce({ rows: [makeResource()], rowCount: 1 } as any);
    mockedPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

    const result = await getResourcesOverview(6, 2026);

    expect(result.resources).toHaveLength(1);
    const resource = result.resources[0];
    expect(resource.resourceId).toBe('res-1');
    expect(resource.resourceName).toBe('Hans Müller');
    expect(resource.shortCode).toBe('MA_14');
    expect(resource.department).toBe('produktion');
    expect(resource.weeklyHours).toBe(42.5);
    expect(resource.utilizationPercent).toBe(0);
    expect(resource.days).toHaveLength(5);

    for (const day of resource.days) {
      expect(day.morning).toBeNull();
      expect(day.afternoon).toBeNull();
    }
  });

  it('should show assignments in compact format', async () => {
    mockedPool.query.mockResolvedValueOnce({ rows: [makeResource()], rowCount: 1 } as any);
    mockedPool.query.mockResolvedValueOnce({
      rows: [
        makeOverviewAssignment({ assignment_date: '2026-02-02', half_day: 'morning', order_number: '2026-001', status_code: 'assigned' }),
        makeOverviewAssignment({ assignment_date: '2026-02-02', half_day: 'afternoon', order_number: '2026-002', task_id: 'task-2', status_code: 'training' }),
      ],
      rowCount: 2,
    } as any);

    const result = await getResourcesOverview(6, 2026);
    const monday = result.resources[0].days.find((d) => d.date === '2026-02-02')!;

    expect(monday.morning).not.toBeNull();
    expect(monday.morning!.shortLabel).toBe('2026-001');
    expect(monday.morning!.statusCode).toBe('assigned');
    expect(monday.afternoon).not.toBeNull();
    expect(monday.afternoon!.shortLabel).toBe('2026-002');
    expect(monday.afternoon!.statusCode).toBe('training');
  });

  it('should use task_title as shortLabel when order_number is null', async () => {
    mockedPool.query.mockResolvedValueOnce({ rows: [makeResource()], rowCount: 1 } as any);
    mockedPool.query.mockResolvedValueOnce({
      rows: [
        makeOverviewAssignment({ order_number: null, task_title: 'Montage Küche' }),
      ],
      rowCount: 1,
    } as any);

    const result = await getResourcesOverview(6, 2026);
    const monday = result.resources[0].days.find((d) => d.date === '2026-02-02')!;

    expect(monday.morning!.shortLabel).toBe('Montage Küche');
  });

  it('should calculate utilization correctly', async () => {
    mockedPool.query.mockResolvedValueOnce({ rows: [makeResource({ weekly_hours: 42.5 })], rowCount: 1 } as any);

    // Full week, full days = 10 half-days
    const weekDates = ['2026-02-02', '2026-02-03', '2026-02-04', '2026-02-05', '2026-02-06'];
    const assignments = weekDates.flatMap((date) => [
      makeOverviewAssignment({ assignment_date: date, half_day: 'morning' }),
      makeOverviewAssignment({ assignment_date: date, half_day: 'afternoon' }),
    ]);

    mockedPool.query.mockResolvedValueOnce({ rows: assignments, rowCount: assignments.length } as any);

    const result = await getResourcesOverview(6, 2026);

    expect(result.resources[0].utilizationPercent).toBe(100);
  });

  it('should handle full_day assignment in overview', async () => {
    mockedPool.query.mockResolvedValueOnce({ rows: [makeResource()], rowCount: 1 } as any);
    mockedPool.query.mockResolvedValueOnce({
      rows: [
        makeOverviewAssignment({ assignment_date: '2026-02-02', half_day: 'full_day' }),
      ],
      rowCount: 1,
    } as any);

    const result = await getResourcesOverview(6, 2026);
    const monday = result.resources[0].days.find((d) => d.date === '2026-02-02')!;

    expect(monday.morning).not.toBeNull();
    expect(monday.afternoon).not.toBeNull();
  });

  it('should filter by department when provided', async () => {
    mockedPool.query.mockResolvedValueOnce({
      rows: [makeResource({ department: 'montage' })],
      rowCount: 1,
    } as any);
    mockedPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

    const result = await getResourcesOverview(6, 2026, 'montage');

    expect(result.resources).toHaveLength(1);
    expect(result.resources[0].department).toBe('montage');

    // Verify the query was called with department filter
    const resourceQuery = mockedPool.query.mock.calls[0];
    expect(resourceQuery[1]).toEqual(['montage']);
  });

  it('should handle multiple resources', async () => {
    mockedPool.query.mockResolvedValueOnce({
      rows: [
        makeResource({ id: 'res-1', name: 'Hans', short_code: 'MA_01', department: 'produktion' }),
        makeResource({ id: 'res-2', name: 'Peter', short_code: 'MA_02', department: 'montage' }),
      ],
      rowCount: 2,
    } as any);
    mockedPool.query.mockResolvedValueOnce({
      rows: [
        makeOverviewAssignment({ resource_id: 'res-1', assignment_date: '2026-02-02' }),
        makeOverviewAssignment({ resource_id: 'res-2', assignment_date: '2026-02-03' }),
      ],
      rowCount: 2,
    } as any);

    const result = await getResourcesOverview(6, 2026);

    expect(result.resources).toHaveLength(2);

    const hans = result.resources.find((r) => r.resourceId === 'res-1')!;
    expect(hans.days.find((d) => d.date === '2026-02-02')!.morning).not.toBeNull();

    const peter = result.resources.find((r) => r.resourceId === 'res-2')!;
    expect(peter.days.find((d) => d.date === '2026-02-03')!.morning).not.toBeNull();
  });

  it('should return correct date range', async () => {
    mockedPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

    const result = await getResourcesOverview(6, 2026);

    expect(result.dateRange.from).toBe('2026-02-02');
    expect(result.dateRange.to).toBe('2026-02-06');
  });

  it('should handle resource with null weekly_hours (default to 42.5)', async () => {
    mockedPool.query.mockResolvedValueOnce({ rows: [makeResource({ weekly_hours: null })], rowCount: 1 } as any);
    mockedPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

    const result = await getResourcesOverview(6, 2026);

    expect(result.resources[0].weeklyHours).toBe(42.5);
    expect(result.resources[0].utilizationPercent).toBe(0);
  });
});
