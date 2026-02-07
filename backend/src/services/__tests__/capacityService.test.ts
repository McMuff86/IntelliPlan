import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database pool
vi.mock('../../config/database', () => ({
  pool: {
    query: vi.fn(),
  },
}));

import {
  getCapacityOverview,
  getDepartmentCapacity,
  getResourceCapacity,
  getWeekdaysBetween,
  halfDayToHours,
} from '../capacityService';
import { pool } from '../../config/database';

const mockedPool = vi.mocked(pool);

// ─── Factories ─────────────────────────────────────────

function makeResource(overrides: Partial<{
  id: string;
  name: string;
  short_code: string | null;
  department: string | null;
  employee_type: string | null;
  weekly_hours: number | null;
}> = {}) {
  return {
    id: overrides.id ?? 'res-1',
    name: overrides.name ?? 'Hans Müller',
    short_code: overrides.short_code ?? 'MA_01',
    department: overrides.department ?? 'produktion',
    employee_type: overrides.employee_type ?? 'internal',
    weekly_hours: overrides.weekly_hours ?? 42.5,
  };
}

function makeAssignment(overrides: Partial<{
  resource_id: string;
  assignment_date: string;
  half_day: string;
  task_id: string;
  project_name: string;
  status_code: string | null;
}> = {}) {
  return {
    resource_id: overrides.resource_id ?? 'res-1',
    assignment_date: overrides.assignment_date ?? '2026-02-09',
    half_day: overrides.half_day ?? 'morning',
    task_id: overrides.task_id ?? 'task-1',
    project_name: overrides.project_name ?? 'Projekt A',
    status_code: overrides.status_code ?? 'assigned',
  };
}

// ─── Pure Helper Tests ─────────────────────────────────

describe('getWeekdaysBetween', () => {
  it('should return weekdays Mon-Fri for a full work week', () => {
    const dates = getWeekdaysBetween('2026-02-09', '2026-02-13');
    expect(dates).toEqual([
      '2026-02-09', // Mon
      '2026-02-10', // Tue
      '2026-02-11', // Wed
      '2026-02-12', // Thu
      '2026-02-13', // Fri
    ]);
  });

  it('should skip weekends', () => {
    // Sat 2026-02-07 to Mon 2026-02-09
    const dates = getWeekdaysBetween('2026-02-07', '2026-02-09');
    expect(dates).toEqual(['2026-02-09']); // Only Monday
  });

  it('should return empty for weekend-only range', () => {
    const dates = getWeekdaysBetween('2026-02-07', '2026-02-08');
    expect(dates).toEqual([]);
  });

  it('should handle single day (weekday)', () => {
    const dates = getWeekdaysBetween('2026-02-09', '2026-02-09');
    expect(dates).toEqual(['2026-02-09']);
  });

  it('should handle single day (weekend)', () => {
    const dates = getWeekdaysBetween('2026-02-07', '2026-02-07');
    expect(dates).toEqual([]);
  });

  it('should handle multi-week range', () => {
    const dates = getWeekdaysBetween('2026-02-09', '2026-02-20');
    expect(dates).toHaveLength(10); // 2 weeks × 5 days
  });
});

describe('halfDayToHours', () => {
  const dailyHours = 8.5; // 42.5 / 5

  it('should return half daily hours for morning', () => {
    expect(halfDayToHours('morning', dailyHours)).toBe(4.25);
  });

  it('should return half daily hours for afternoon', () => {
    expect(halfDayToHours('afternoon', dailyHours)).toBe(4.25);
  });

  it('should return full daily hours for full_day', () => {
    expect(halfDayToHours('full_day', dailyHours)).toBe(8.5);
  });

  it('should return 0 for unknown half_day', () => {
    expect(halfDayToHours('unknown', dailyHours)).toBe(0);
  });

  it('should handle different weekly hours (40h → 8h daily)', () => {
    expect(halfDayToHours('morning', 8)).toBe(4);
    expect(halfDayToHours('full_day', 8)).toBe(8);
  });
});

// ─── Service Tests ─────────────────────────────────────

describe('getCapacityOverview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return empty overview for no resources', async () => {
    mockedPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

    const result = await getCapacityOverview({ from: '2026-02-09', to: '2026-02-13' });

    expect(result.totalAvailableHours).toBe(0);
    expect(result.totalAssignedHours).toBe(0);
    expect(result.utilizationPercent).toBe(0);
    expect(result.departments).toHaveLength(8); // All departments returned
    expect(result.overbookedResources).toEqual([]);
  });

  it('should calculate correct capacity for a resource with no assignments (empty week)', async () => {
    const resource = makeResource({ weekly_hours: 42.5 });

    mockedPool.query
      // Resources query
      .mockResolvedValueOnce({ rows: [resource], rowCount: 1 } as never)
      // Assignments query
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

    const result = await getCapacityOverview({ from: '2026-02-09', to: '2026-02-13' });

    // Find produktion department
    const prodDept = result.departments.find((d) => d.department === 'produktion');
    expect(prodDept).toBeDefined();
    expect(prodDept!.resourceCount).toBe(1);
    expect(prodDept!.totalAvailableHours).toBe(42.5); // 8.5 × 5
    expect(prodDept!.totalAssignedHours).toBe(0);
    expect(prodDept!.utilizationPercent).toBe(0);
    expect(prodDept!.overbookedCount).toBe(0);

    // Resource periods
    const res = prodDept!.resources[0];
    expect(res.periods).toHaveLength(5);
    expect(res.periods[0].availableHours).toBe(8.5);
    expect(res.periods[0].assignedHours).toBe(0);
    expect(res.periods[0].isOverbooked).toBe(false);
  });

  it('should calculate correct utilization for fully booked week', async () => {
    const resource = makeResource({ weekly_hours: 42.5 });

    // full_day assignments for each day = 100% utilization
    const assignments = [
      makeAssignment({ assignment_date: '2026-02-09', half_day: 'full_day' }),
      makeAssignment({ assignment_date: '2026-02-10', half_day: 'full_day' }),
      makeAssignment({ assignment_date: '2026-02-11', half_day: 'full_day' }),
      makeAssignment({ assignment_date: '2026-02-12', half_day: 'full_day' }),
      makeAssignment({ assignment_date: '2026-02-13', half_day: 'full_day' }),
    ];

    mockedPool.query
      .mockResolvedValueOnce({ rows: [resource], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: assignments, rowCount: assignments.length } as never);

    const result = await getCapacityOverview({ from: '2026-02-09', to: '2026-02-13' });

    const prodDept = result.departments.find((d) => d.department === 'produktion')!;
    expect(prodDept.totalAssignedHours).toBe(42.5);
    expect(prodDept.utilizationPercent).toBe(100);
    expect(prodDept.overbookedCount).toBe(0);

    // Each period should be 100%
    const res = prodDept.resources[0];
    for (const period of res.periods) {
      expect(period.utilizationPercent).toBe(100);
      expect(period.isOverbooked).toBe(false);
    }
  });

  it('should detect overbooking when resource has multiple assignments on same day', async () => {
    const resource = makeResource({ weekly_hours: 42.5 });

    // Two full_day assignments on Monday = overbooked on that day (200%)
    const assignments = [
      makeAssignment({ assignment_date: '2026-02-09', half_day: 'full_day', task_id: 'task-1' }),
      makeAssignment({ assignment_date: '2026-02-09', half_day: 'full_day', task_id: 'task-2' }),
    ];

    mockedPool.query
      .mockResolvedValueOnce({ rows: [resource], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: assignments, rowCount: assignments.length } as never);

    const result = await getCapacityOverview({ from: '2026-02-09', to: '2026-02-13' });

    const prodDept = result.departments.find((d) => d.department === 'produktion')!;
    expect(prodDept.overbookedCount).toBe(1);

    const res = prodDept.resources[0];
    const monday = res.periods.find((p) => p.date === '2026-02-09')!;
    expect(monday.isOverbooked).toBe(true);
    expect(monday.assignedHours).toBe(17); // 8.5 × 2
    expect(monday.utilizationPercent).toBe(200);

    // Weekly utilization is 17/42.5 = 40% (only one day overbooked out of 5)
    // So the resource won't appear in overbookedResources (>100% weekly)
    // overbookedResources is based on WEEKLY average, not daily peaks
    expect(result.overbookedResources).toHaveLength(0);
  });

  it('should list resource in overbookedResources when weekly average exceeds 100%', async () => {
    const resource = makeResource({ weekly_hours: 42.5 });

    // Double-booked every day = 200% weekly
    const assignments = [
      makeAssignment({ assignment_date: '2026-02-09', half_day: 'full_day', task_id: 'task-1' }),
      makeAssignment({ assignment_date: '2026-02-09', half_day: 'full_day', task_id: 'task-2' }),
      makeAssignment({ assignment_date: '2026-02-10', half_day: 'full_day', task_id: 'task-1' }),
      makeAssignment({ assignment_date: '2026-02-10', half_day: 'full_day', task_id: 'task-2' }),
      makeAssignment({ assignment_date: '2026-02-11', half_day: 'full_day', task_id: 'task-1' }),
      makeAssignment({ assignment_date: '2026-02-11', half_day: 'full_day', task_id: 'task-2' }),
      makeAssignment({ assignment_date: '2026-02-12', half_day: 'full_day', task_id: 'task-1' }),
      makeAssignment({ assignment_date: '2026-02-12', half_day: 'full_day', task_id: 'task-2' }),
      makeAssignment({ assignment_date: '2026-02-13', half_day: 'full_day', task_id: 'task-1' }),
      makeAssignment({ assignment_date: '2026-02-13', half_day: 'full_day', task_id: 'task-2' }),
    ];

    mockedPool.query
      .mockResolvedValueOnce({ rows: [resource], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: assignments, rowCount: assignments.length } as never);

    const result = await getCapacityOverview({ from: '2026-02-09', to: '2026-02-13' });

    expect(result.overbookedResources).toHaveLength(1);
    expect(result.overbookedResources[0].resourceName).toBe('Hans Müller');
    expect(result.overbookedResources[0].utilizationPercent).toBe(200);
  });

  it('should calculate half-day assignments correctly (morning + afternoon = full day)', async () => {
    const resource = makeResource({ weekly_hours: 42.5 });
    const dailyHours = 8.5;

    const assignments = [
      makeAssignment({ assignment_date: '2026-02-09', half_day: 'morning', task_id: 'task-1' }),
      makeAssignment({ assignment_date: '2026-02-09', half_day: 'afternoon', task_id: 'task-2' }),
    ];

    mockedPool.query
      .mockResolvedValueOnce({ rows: [resource], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: assignments, rowCount: assignments.length } as never);

    const result = await getCapacityOverview({ from: '2026-02-09', to: '2026-02-13' });

    const res = result.departments.find((d) => d.department === 'produktion')!.resources[0];
    const monday = res.periods.find((p) => p.date === '2026-02-09')!;
    expect(monday.assignedHours).toBe(dailyHours); // 4.25 + 4.25 = 8.5
    expect(monday.utilizationPercent).toBe(100);
    expect(monday.isOverbooked).toBe(false);
    expect(monday.assignments).toHaveLength(2);
  });

  it('should respect department filter', async () => {
    const resource = makeResource({ department: 'montage' });

    mockedPool.query
      .mockResolvedValueOnce({ rows: [resource], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

    const result = await getCapacityOverview({
      from: '2026-02-09',
      to: '2026-02-13',
      department: 'montage',
    });

    // Should have only montage department
    expect(result.departments).toHaveLength(1);
    expect(result.departments[0].department).toBe('montage');
    expect(result.departments[0].resourceCount).toBe(1);

    // Verify the query was called with department filter
    const resourceQuery = mockedPool.query.mock.calls[0];
    expect(resourceQuery[1]).toEqual(['montage']);
  });

  it('should handle resources with different weekly hours', async () => {
    const fullTime = makeResource({ id: 'res-1', weekly_hours: 42.5, department: 'produktion' });
    const partTime = makeResource({ id: 'res-2', name: 'Anna', short_code: 'MA_02', weekly_hours: 20, department: 'produktion' });

    mockedPool.query
      .mockResolvedValueOnce({ rows: [fullTime, partTime], rowCount: 2 } as never)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

    const result = await getCapacityOverview({ from: '2026-02-09', to: '2026-02-13' });

    const prodDept = result.departments.find((d) => d.department === 'produktion')!;
    expect(prodDept.resourceCount).toBe(2);
    expect(prodDept.totalAvailableHours).toBe(62.5); // 42.5 + 20

    // Verify individual daily hours
    const fullTimeRes = prodDept.resources.find((r) => r.resourceId === 'res-1')!;
    expect(fullTimeRes.periods[0].availableHours).toBe(8.5);

    const partTimeRes = prodDept.resources.find((r) => r.resourceId === 'res-2')!;
    expect(partTimeRes.periods[0].availableHours).toBe(4);
  });

  it('should calculate overview totals across multiple departments', async () => {
    const prodRes = makeResource({ id: 'res-1', department: 'produktion', weekly_hours: 42.5 });
    const montRes = makeResource({ id: 'res-2', name: 'Peter', short_code: 'MA_02', department: 'montage', weekly_hours: 42.5 });

    mockedPool.query
      .mockResolvedValueOnce({ rows: [prodRes, montRes], rowCount: 2 } as never)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

    const result = await getCapacityOverview({ from: '2026-02-09', to: '2026-02-13' });

    expect(result.totalAvailableHours).toBe(85); // 42.5 × 2
    expect(result.totalAssignedHours).toBe(0);
    expect(result.utilizationPercent).toBe(0);
  });

  it('should include day names in periods', async () => {
    const resource = makeResource();

    mockedPool.query
      .mockResolvedValueOnce({ rows: [resource], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

    const result = await getCapacityOverview({ from: '2026-02-09', to: '2026-02-13' });

    const res = result.departments.find((d) => d.department === 'produktion')!.resources[0];
    expect(res.periods[0].dayName).toBe('Montag');
    expect(res.periods[1].dayName).toBe('Dienstag');
    expect(res.periods[2].dayName).toBe('Mittwoch');
    expect(res.periods[3].dayName).toBe('Donnerstag');
    expect(res.periods[4].dayName).toBe('Freitag');
  });

  it('should return default weeklyHours (42.5) when null', async () => {
    const resource = makeResource({ weekly_hours: null });

    mockedPool.query
      .mockResolvedValueOnce({ rows: [resource], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

    const result = await getCapacityOverview({ from: '2026-02-09', to: '2026-02-13' });

    const res = result.departments.find((d) => d.department === 'produktion')!.resources[0];
    expect(res.weeklyHours).toBe(42.5);
    expect(res.periods[0].availableHours).toBe(8.5);
  });
});

describe('getDepartmentCapacity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return department capacity for specified department', async () => {
    const resource = makeResource({ department: 'cnc' });

    mockedPool.query
      .mockResolvedValueOnce({ rows: [resource], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

    const result = await getDepartmentCapacity('cnc', { from: '2026-02-09', to: '2026-02-13' });

    expect(result.department).toBe('cnc');
    expect(result.label).toBe('CNC');
    expect(result.resourceCount).toBe(1);
  });

  it('should return empty for department with no resources', async () => {
    mockedPool.query
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

    const result = await getDepartmentCapacity('zuschnitt', { from: '2026-02-09', to: '2026-02-13' });

    expect(result.department).toBe('zuschnitt');
    expect(result.label).toBe('Zuschnitt');
    expect(result.resourceCount).toBe(0);
    expect(result.resources).toEqual([]);
  });
});

describe('getResourceCapacity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return null for non-existent resource', async () => {
    mockedPool.query
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

    const result = await getResourceCapacity('non-existent', { from: '2026-02-09', to: '2026-02-13' });

    expect(result).toBeNull();
  });

  it('should return resource capacity with assignments', async () => {
    const resource = makeResource({ id: 'res-1', weekly_hours: 40 });
    const assignments = [
      makeAssignment({ resource_id: 'res-1', assignment_date: '2026-02-09', half_day: 'morning' }),
      makeAssignment({ resource_id: 'res-1', assignment_date: '2026-02-09', half_day: 'afternoon', task_id: 'task-2', project_name: 'Projekt B' }),
    ];

    mockedPool.query
      .mockResolvedValueOnce({ rows: [resource], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: assignments, rowCount: assignments.length } as never);

    const result = await getResourceCapacity('res-1', { from: '2026-02-09', to: '2026-02-13' });

    expect(result).not.toBeNull();
    expect(result!.resourceId).toBe('res-1');
    expect(result!.resourceName).toBe('Hans Müller');
    expect(result!.weeklyHours).toBe(40);

    const monday = result!.periods.find((p) => p.date === '2026-02-09')!;
    expect(monday.assignedHours).toBe(8); // 4 + 4 (40h/5/2 × 2)
    expect(monday.availableHours).toBe(8); // 40/5
    expect(monday.utilizationPercent).toBe(100);
    expect(monday.assignments).toHaveLength(2);
  });

  it('should return null for empty date range', async () => {
    // Weekend-only range
    const result = await getResourceCapacity('res-1', { from: '2026-02-07', to: '2026-02-08' });

    expect(result).toBeNull();
  });

  it('should preserve status codes in assignments', async () => {
    const resource = makeResource();
    const assignments = [
      makeAssignment({ assignment_date: '2026-02-09', half_day: 'morning', status_code: 'sick' }),
    ];

    mockedPool.query
      .mockResolvedValueOnce({ rows: [resource], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: assignments, rowCount: assignments.length } as never);

    const result = await getResourceCapacity('res-1', { from: '2026-02-09', to: '2026-02-13' });

    const monday = result!.periods.find((p) => p.date === '2026-02-09')!;
    expect(monday.assignments[0].statusCode).toBe('sick');
  });
});
