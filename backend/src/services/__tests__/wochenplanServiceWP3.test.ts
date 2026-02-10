import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database pool
vi.mock('../../config/database', () => ({
  pool: {
    query: vi.fn(),
    connect: vi.fn(),
  },
}));

import {
  getWeekConflicts,
  quickAssign,
  copyWeek,
  getUnassignedTasks,
  getPhaseMatrix,
} from '../wochenplanService';
import { pool } from '../../config/database';

const mockedPool = vi.mocked(pool);

// ─── Factories ─────────────────────────────────────────

function makeConflictRow(overrides: Partial<Record<string, any>> = {}) {
  return {
    resource_id: 'res-1',
    resource_name: 'Hans Müller',
    short_code: 'MA_14',
    assignment_date: '2026-02-02',
    effective_half: 'morning',
    ...overrides,
  };
}

function makeAssignmentRow(overrides: Partial<Record<string, any>> = {}) {
  return {
    id: 'assign-1',
    task_id: 'task-1',
    resource_id: 'res-1',
    assignment_date: '2026-02-02',
    half_day: 'morning',
    order_number: '2026-001',
    customer_name: 'Familie Müller',
    task_title: 'Montage Küche',
    resource_name: 'Hans Müller',
    short_code: 'MA_14',
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════
// 3.1 Conflict Detection
// ═══════════════════════════════════════════════════════

describe('getWeekConflicts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return empty conflicts when no double-bookings exist', async () => {
    // Q0: conflict query → empty
    mockedPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

    const result = await getWeekConflicts(6, 2026);

    expect(result.kw).toBe(6);
    expect(result.year).toBe(2026);
    expect(result.conflicts).toHaveLength(0);
  });

  it('should detect a conflict when resource is double-booked on same half-day', async () => {
    // Q0: conflict CTE query
    mockedPool.query.mockResolvedValueOnce({
      rows: [makeConflictRow()],
      rowCount: 1,
    } as any);

    // Q1: assignment details
    mockedPool.query.mockResolvedValueOnce({
      rows: [
        makeAssignmentRow({ id: 'a1', task_id: 'task-1' }),
        makeAssignmentRow({ id: 'a2', task_id: 'task-2' }),
      ],
      rowCount: 2,
    } as any);

    const result = await getWeekConflicts(6, 2026);

    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0].resourceId).toBe('res-1');
    expect(result.conflicts[0].shortCode).toBe('MA_14');
    expect(result.conflicts[0].date).toBe('2026-02-02');
    expect(result.conflicts[0].halfDay).toBe('morning');
    expect(result.conflicts[0].assignments).toHaveLength(2);
  });

  it('should detect conflicts across multiple resources and days', async () => {
    mockedPool.query.mockResolvedValueOnce({
      rows: [
        makeConflictRow({ resource_id: 'res-1', assignment_date: '2026-02-02', effective_half: 'morning' }),
        makeConflictRow({ resource_id: 'res-2', resource_name: 'Peter', short_code: 'JB', assignment_date: '2026-02-03', effective_half: 'afternoon' }),
      ],
      rowCount: 2,
    } as any);

    mockedPool.query.mockResolvedValueOnce({
      rows: [
        makeAssignmentRow({ id: 'a1', task_id: 'task-1', resource_id: 'res-1' }),
        makeAssignmentRow({ id: 'a2', task_id: 'task-2', resource_id: 'res-1' }),
        makeAssignmentRow({ id: 'a3', task_id: 'task-3', resource_id: 'res-2', assignment_date: '2026-02-03', half_day: 'afternoon' }),
        makeAssignmentRow({ id: 'a4', task_id: 'task-4', resource_id: 'res-2', assignment_date: '2026-02-03', half_day: 'afternoon' }),
      ],
      rowCount: 4,
    } as any);

    const result = await getWeekConflicts(6, 2026);

    expect(result.conflicts).toHaveLength(2);
    expect(result.conflicts[0].resourceId).toBe('res-1');
    expect(result.conflicts[1].resourceId).toBe('res-2');
  });

  it('should handle full_day conflict (appearing as morning conflict)', async () => {
    mockedPool.query.mockResolvedValueOnce({
      rows: [makeConflictRow({ effective_half: 'morning' })],
      rowCount: 1,
    } as any);

    mockedPool.query.mockResolvedValueOnce({
      rows: [
        makeAssignmentRow({ id: 'a1', task_id: 'task-1', half_day: 'full_day' }),
        makeAssignmentRow({ id: 'a2', task_id: 'task-2', half_day: 'morning' }),
      ],
      rowCount: 2,
    } as any);

    const result = await getWeekConflicts(6, 2026);

    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0].assignments).toHaveLength(2);
  });

  it('should use correct date range for KW 6 2026', async () => {
    mockedPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

    await getWeekConflicts(6, 2026);

    const params = mockedPool.query.mock.calls[0][1] as any[];
    expect(params[0]).toBe('2026-02-02'); // from (Monday)
    expect(params[1]).toBe('2026-02-06'); // to (Friday)
  });

  it('should include conflict detail fields', async () => {
    mockedPool.query.mockResolvedValueOnce({
      rows: [makeConflictRow()],
      rowCount: 1,
    } as any);

    mockedPool.query.mockResolvedValueOnce({
      rows: [
        makeAssignmentRow({
          id: 'a1',
          task_id: 'task-1',
          order_number: '2026-042',
          customer_name: 'Schmidt',
          task_title: 'Einbauschrank',
        }),
      ],
      rowCount: 1,
    } as any);

    const result = await getWeekConflicts(6, 2026);

    const detail = result.conflicts[0].assignments[0];
    expect(detail.assignmentId).toBe('a1');
    expect(detail.taskId).toBe('task-1');
    expect(detail.projectOrderNumber).toBe('2026-042');
    expect(detail.customerName).toBe('Schmidt');
    expect(detail.description).toBe('Einbauschrank');
  });
});

// ═══════════════════════════════════════════════════════
// 3.2 Quick-Assign Batch
// ═══════════════════════════════════════════════════════

describe('quickAssign', () => {
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {
      query: vi.fn(),
      release: vi.fn(),
    };
  });

  it('should create assignments when no conflicts exist', async () => {
    // Conflict check query → no existing assignments
    mockedPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

    // Transaction
    (mockedPool.connect as any).mockResolvedValueOnce(mockClient);
    mockClient.query
      .mockResolvedValueOnce(undefined) // BEGIN
      .mockResolvedValueOnce({
        rows: [{
          id: 'new-1',
          task_id: 'task-1',
          resource_id: 'res-1',
          assignment_date: '2026-02-02',
          half_day: 'morning',
          is_fixed: false,
          status_code: 'assigned',
        }],
        rowCount: 1,
      }) // INSERT
      .mockResolvedValueOnce(undefined); // COMMIT

    const result = await quickAssign([
      { taskId: 'task-1', resourceId: 'res-1', date: '2026-02-02', halfDay: 'morning' },
    ]);

    expect(result.created).toBe(1);
    expect(result.conflicts).toHaveLength(0);
    expect(result.assignments).toHaveLength(1);
    expect(result.assignments[0].id).toBe('new-1');
  });

  it('should return conflicts without creating when existing assignments found', async () => {
    // Conflict check → existing assignment found
    mockedPool.query.mockResolvedValueOnce({
      rows: [makeAssignmentRow({ resource_id: 'res-1', assignment_date: '2026-02-02', half_day: 'morning' })],
      rowCount: 1,
    } as any);

    const result = await quickAssign([
      { taskId: 'task-new', resourceId: 'res-1', date: '2026-02-02', halfDay: 'morning' },
    ]);

    expect(result.created).toBe(0);
    expect(result.conflicts.length).toBeGreaterThan(0);
    expect(result.assignments).toHaveLength(0);
    // Should NOT have connected for transaction
    expect(mockedPool.connect).not.toHaveBeenCalled();
  });

  it('should handle multiple assignments in batch', async () => {
    mockedPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

    (mockedPool.connect as any).mockResolvedValueOnce(mockClient);
    mockClient.query
      .mockResolvedValueOnce(undefined) // BEGIN
      .mockResolvedValueOnce({
        rows: [{ id: 'new-1', task_id: 'task-1', resource_id: 'res-1', assignment_date: '2026-02-02', half_day: 'morning', is_fixed: false, status_code: 'assigned' }],
        rowCount: 1,
      })
      .mockResolvedValueOnce({
        rows: [{ id: 'new-2', task_id: 'task-1', resource_id: 'res-1', assignment_date: '2026-02-02', half_day: 'afternoon', is_fixed: false, status_code: 'assigned' }],
        rowCount: 1,
      })
      .mockResolvedValueOnce(undefined); // COMMIT

    const result = await quickAssign([
      { taskId: 'task-1', resourceId: 'res-1', date: '2026-02-02', halfDay: 'morning' },
      { taskId: 'task-1', resourceId: 'res-1', date: '2026-02-02', halfDay: 'afternoon' },
    ]);

    expect(result.created).toBe(2);
    expect(result.assignments).toHaveLength(2);
  });

  it('should rollback on error during insert', async () => {
    mockedPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

    (mockedPool.connect as any).mockResolvedValueOnce(mockClient);
    mockClient.query
      .mockResolvedValueOnce(undefined) // BEGIN
      .mockRejectedValueOnce(new Error('unique_violation')); // INSERT fails
    mockClient.query.mockResolvedValueOnce(undefined); // ROLLBACK

    await expect(quickAssign([
      { taskId: 'task-1', resourceId: 'res-1', date: '2026-02-02', halfDay: 'morning' },
    ])).rejects.toThrow('unique_violation');

    // Verify rollback was called
    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    expect(mockClient.release).toHaveBeenCalled();
  });

  it('should pass isFixed and statusCode to insert', async () => {
    mockedPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

    (mockedPool.connect as any).mockResolvedValueOnce(mockClient);
    mockClient.query
      .mockResolvedValueOnce(undefined) // BEGIN
      .mockResolvedValueOnce({
        rows: [{ id: 'new-1', task_id: 'task-1', resource_id: 'res-1', assignment_date: '2026-02-02', half_day: 'morning', is_fixed: true, status_code: 'training' }],
        rowCount: 1,
      })
      .mockResolvedValueOnce(undefined); // COMMIT

    const result = await quickAssign([
      { taskId: 'task-1', resourceId: 'res-1', date: '2026-02-02', halfDay: 'morning', isFixed: true, statusCode: 'training' },
    ]);

    expect(result.assignments[0].isFixed).toBe(true);
    expect(result.assignments[0].statusCode).toBe('training');
  });

  it('should detect conflict with full_day existing assignment for morning new assignment', async () => {
    mockedPool.query.mockResolvedValueOnce({
      rows: [makeAssignmentRow({ half_day: 'full_day' })],
      rowCount: 1,
    } as any);

    const result = await quickAssign([
      { taskId: 'task-new', resourceId: 'res-1', date: '2026-02-02', halfDay: 'morning' },
    ]);

    expect(result.conflicts.length).toBeGreaterThan(0);
    expect(result.created).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════
// 3.3 Copy-Week
// ═══════════════════════════════════════════════════════

describe('copyWeek', () => {
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {
      query: vi.fn(),
      release: vi.fn(),
    };
  });

  it('should throw error if target already has phase schedules', async () => {
    mockedPool.query.mockResolvedValueOnce({ rows: [{ count: '3' }], rowCount: 1 } as any);

    await expect(copyWeek(6, 2026, 7, 2026, { includeAssignments: true }))
      .rejects.toThrow('already has phase schedules');
  });

  it('should throw error if target already has assignments when includeAssignments=true', async () => {
    // Phase check → 0
    mockedPool.query.mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 } as any);
    // Assignment check → >0
    mockedPool.query.mockResolvedValueOnce({ rows: [{ count: '5' }], rowCount: 1 } as any);

    await expect(copyWeek(6, 2026, 7, 2026, { includeAssignments: true }))
      .rejects.toThrow('already has assignments');
  });

  it('should copy phase schedules and assignments successfully', async () => {
    // Phase check → 0
    mockedPool.query.mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 } as any);
    // Assignment check → 0
    mockedPool.query.mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 } as any);

    (mockedPool.connect as any).mockResolvedValueOnce(mockClient);
    mockClient.query
      .mockResolvedValueOnce(undefined) // BEGIN
      .mockResolvedValueOnce({ rowCount: 3 }) // Phase copy
      .mockResolvedValueOnce({ rowCount: 8 }) // Assignment copy
      .mockResolvedValueOnce(undefined); // COMMIT

    const result = await copyWeek(6, 2026, 7, 2026, { includeAssignments: true });

    expect(result.copiedPhaseSchedules).toBe(3);
    expect(result.copiedAssignments).toBe(8);
    expect(result.targetKw).toBe(7);
    expect(result.targetYear).toBe(2026);
  });

  it('should skip assignment copy when includeAssignments=false', async () => {
    // Phase check → 0
    mockedPool.query.mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 } as any);

    (mockedPool.connect as any).mockResolvedValueOnce(mockClient);
    mockClient.query
      .mockResolvedValueOnce(undefined) // BEGIN
      .mockResolvedValueOnce({ rowCount: 2 }) // Phase copy only
      .mockResolvedValueOnce(undefined); // COMMIT

    const result = await copyWeek(6, 2026, 7, 2026, { includeAssignments: false });

    expect(result.copiedPhaseSchedules).toBe(2);
    expect(result.copiedAssignments).toBe(0);
  });

  it('should rollback on error', async () => {
    mockedPool.query.mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 } as any);
    mockedPool.query.mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 } as any);

    (mockedPool.connect as any).mockResolvedValueOnce(mockClient);
    mockClient.query
      .mockResolvedValueOnce(undefined) // BEGIN
      .mockRejectedValueOnce(new Error('db error')); // Phase copy fails
    mockClient.query.mockResolvedValueOnce(undefined); // ROLLBACK

    await expect(copyWeek(6, 2026, 7, 2026, { includeAssignments: true }))
      .rejects.toThrow('db error');

    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    expect(mockClient.release).toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════
// 3.4 Unassigned Tasks
// ═══════════════════════════════════════════════════════

describe('getUnassignedTasks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return empty when all tasks have assignments', async () => {
    mockedPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

    const result = await getUnassignedTasks(6, 2026);

    expect(result.kw).toBe(6);
    expect(result.year).toBe(2026);
    expect(result.totalUnassigned).toBe(0);
    expect(result.departments).toHaveLength(0);
  });

  it('should return unassigned tasks grouped by department', async () => {
    mockedPool.query.mockResolvedValueOnce({
      rows: [
        {
          task_id: 'task-1',
          order_number: '2026-001',
          customer_name: 'Müller',
          task_title: 'Küche montieren',
          installation_location: 'Bern',
          phase: 'montage',
          planned_kw: 6,
        },
        {
          task_id: 'task-2',
          order_number: '2026-002',
          customer_name: 'Schmidt',
          task_title: 'CNC Fräsen',
          installation_location: null,
          phase: 'cnc',
          planned_kw: 6,
        },
      ],
      rowCount: 2,
    } as any);

    const result = await getUnassignedTasks(6, 2026);

    expect(result.totalUnassigned).toBe(2);
    expect(result.departments).toHaveLength(2);

    const montage = result.departments.find((d) => d.department === 'montage');
    expect(montage).toBeDefined();
    expect(montage!.tasks).toHaveLength(1);
    expect(montage!.tasks[0].taskId).toBe('task-1');

    const cnc = result.departments.find((d) => d.department === 'cnc');
    expect(cnc).toBeDefined();
    expect(cnc!.tasks).toHaveLength(1);
  });

  it('should include task fields in response', async () => {
    mockedPool.query.mockResolvedValueOnce({
      rows: [{
        task_id: 'task-1',
        order_number: '2026-042',
        customer_name: 'Familie Schmidt',
        task_title: 'Einbauschrank',
        installation_location: 'Zürich',
        phase: 'produktion',
        planned_kw: 6,
      }],
      rowCount: 1,
    } as any);

    const result = await getUnassignedTasks(6, 2026);
    const task = result.departments[0].tasks[0];

    expect(task.projectOrderNumber).toBe('2026-042');
    expect(task.customerName).toBe('Familie Schmidt');
    expect(task.description).toBe('Einbauschrank');
    expect(task.installationLocation).toBe('Zürich');
  });

  it('should handle null fields gracefully', async () => {
    mockedPool.query.mockResolvedValueOnce({
      rows: [{
        task_id: 'task-1',
        order_number: null,
        customer_name: null,
        task_title: 'Some Task',
        installation_location: null,
        phase: 'produktion',
        planned_kw: 6,
      }],
      rowCount: 1,
    } as any);

    const result = await getUnassignedTasks(6, 2026);
    const task = result.departments[0].tasks[0];

    expect(task.projectOrderNumber).toBe('');
    expect(task.customerName).toBe('');
    expect(task.installationLocation).toBe('');
  });

  it('should pass correct SQL parameters', async () => {
    mockedPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

    await getUnassignedTasks(6, 2026);

    const params = mockedPool.query.mock.calls[0][1] as any[];
    expect(params[0]).toBe(2026); // year
    expect(params[1]).toBe(6); // kw
    expect(params[2]).toBe('2026-02-02'); // from
    expect(params[3]).toBe('2026-02-06'); // to
  });

  it('should use NOT EXISTS to filter out assigned tasks', async () => {
    mockedPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

    await getUnassignedTasks(6, 2026);

    const sql = mockedPool.query.mock.calls[0][0] as string;
    expect(sql).toContain('NOT EXISTS');
    expect(sql).toContain('task_assignments');
  });
});

// ═══════════════════════════════════════════════════════
// 3.5 KW-Phase-Matrix
// ═══════════════════════════════════════════════════════

describe('getPhaseMatrix', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return empty matrix when no tasks have phase schedules', async () => {
    mockedPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

    const result = await getPhaseMatrix(4, 10, 2026, 2026);

    expect(result.fromKw).toBe(4);
    expect(result.toKw).toBe(10);
    expect(result.year).toBe(2026);
    expect(result.kwRange).toEqual([4, 5, 6, 7, 8, 9, 10]);
    expect(result.tasks).toHaveLength(0);
  });

  it('should build matrix with tasks and their phases across weeks', async () => {
    mockedPool.query.mockResolvedValueOnce({
      rows: [
        { task_id: 'task-1', order_number: '2026-001', customer_name: 'Müller', task_title: 'Küche', phase: 'zuschnitt', planned_kw: 4 },
        { task_id: 'task-1', order_number: '2026-001', customer_name: 'Müller', task_title: 'Küche', phase: 'cnc', planned_kw: 5 },
        { task_id: 'task-1', order_number: '2026-001', customer_name: 'Müller', task_title: 'Küche', phase: 'montage', planned_kw: 8 },
      ],
      rowCount: 3,
    } as any);

    const result = await getPhaseMatrix(4, 10, 2026, 2026);

    expect(result.tasks).toHaveLength(1);
    const task = result.tasks[0];
    expect(task.taskId).toBe('task-1');
    expect(task.projectOrderNumber).toBe('2026-001');

    // KW 4 should have zuschnitt
    const kw4 = task.weeks.find((w) => w.kw === 4)!;
    expect(kw4.phases).toEqual(['zuschnitt']);

    // KW 5 should have cnc
    const kw5 = task.weeks.find((w) => w.kw === 5)!;
    expect(kw5.phases).toEqual(['cnc']);

    // KW 6 should be empty
    const kw6 = task.weeks.find((w) => w.kw === 6)!;
    expect(kw6.phases).toEqual([]);

    // KW 8 should have montage
    const kw8 = task.weeks.find((w) => w.kw === 8)!;
    expect(kw8.phases).toEqual(['montage']);
  });

  it('should handle task with multiple phases in same KW', async () => {
    mockedPool.query.mockResolvedValueOnce({
      rows: [
        { task_id: 'task-1', order_number: '2026-001', customer_name: 'Müller', task_title: 'Küche', phase: 'cnc', planned_kw: 6 },
        { task_id: 'task-1', order_number: '2026-001', customer_name: 'Müller', task_title: 'Küche', phase: 'produktion', planned_kw: 6 },
      ],
      rowCount: 2,
    } as any);

    const result = await getPhaseMatrix(6, 6, 2026, 2026);

    const kw6 = result.tasks[0].weeks[0];
    expect(kw6.phases).toEqual(['cnc', 'produktion']);
  });

  it('should handle multiple tasks', async () => {
    mockedPool.query.mockResolvedValueOnce({
      rows: [
        { task_id: 'task-1', order_number: '2026-001', customer_name: 'Müller', task_title: 'Küche', phase: 'cnc', planned_kw: 4 },
        { task_id: 'task-2', order_number: '2026-002', customer_name: 'Schmidt', task_title: 'Schrank', phase: 'montage', planned_kw: 5 },
      ],
      rowCount: 2,
    } as any);

    const result = await getPhaseMatrix(4, 6, 2026, 2026);

    expect(result.tasks).toHaveLength(2);
  });

  it('should generate correct kwRange', async () => {
    mockedPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

    const result = await getPhaseMatrix(1, 3, 2026, 2026);

    expect(result.kwRange).toEqual([1, 2, 3]);
  });

  it('should pass correct SQL parameters', async () => {
    mockedPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

    await getPhaseMatrix(4, 10, 2026, 2026);

    const params = mockedPool.query.mock.calls[0][1] as any[];
    expect(params[0]).toBe(2026); // year
    expect(params[1]).toBe(4); // from_kw
    expect(params[2]).toBe(10); // to_kw
  });

  it('should handle year-wrapping correctly', async () => {
    mockedPool.query.mockResolvedValueOnce({
      rows: [
        { task_id: 'task-1', order_number: '2025-100', customer_name: 'Test', task_title: 'Year End', phase: 'phase1', planned_kw: 51 },
        { task_id: 'task-1', order_number: '2025-100', customer_name: 'Test', task_title: 'Year End', phase: 'phase2', planned_kw: 52 },
        { task_id: 'task-1', order_number: '2025-100', customer_name: 'Test', task_title: 'Year End', phase: 'phase3', planned_kw: 1 },
        { task_id: 'task-1', order_number: '2025-100', customer_name: 'Test', task_title: 'Year End', phase: 'phase4', planned_kw: 2 },
      ],
      rowCount: 4,
    } as any);

    const result = await getPhaseMatrix(51, 2, 2025, 2026);

    // Should generate kwRange from 51-52, then 1-2 (2025 has 52 weeks)
    expect(result.kwRange).toEqual([51, 52, 1, 2]);
    expect(result.fromKw).toBe(51);
    expect(result.toKw).toBe(2);
    expect(result.year).toBe(2025);

    // Verify SQL query uses OR condition for year wrapping
    const queryStr = mockedPool.query.mock.calls[0][0] as string;
    expect(queryStr).toContain('(tps.planned_year = $1 AND tps.planned_kw >= $2)');
    expect(queryStr).toContain('OR (tps.planned_year = $3 AND tps.planned_kw <= $4)');

    const params = mockedPool.query.mock.calls[0][1] as any[];
    expect(params[0]).toBe(2025); // from_year
    expect(params[1]).toBe(51); // from_kw
    expect(params[2]).toBe(2026); // to_year
    expect(params[3]).toBe(2); // to_kw

    // Verify task has all weeks with correct phases
    expect(result.tasks).toHaveLength(1);
    const task = result.tasks[0];
    expect(task.weeks[0]).toEqual({ kw: 51, phases: ['phase1'] });
    expect(task.weeks[1]).toEqual({ kw: 52, phases: ['phase2'] });
    expect(task.weeks[2]).toEqual({ kw: 1, phases: ['phase3'] });
    expect(task.weeks[3]).toEqual({ kw: 2, phases: ['phase4'] });
  });

  it('should handle year-wrapping with 53-week year', async () => {
    mockedPool.query.mockResolvedValueOnce({
      rows: [
        { task_id: 'task-1', order_number: '2020-100', customer_name: 'Test', task_title: 'Long Year', phase: 'phase1', planned_kw: 52 },
        { task_id: 'task-1', order_number: '2020-100', customer_name: 'Test', task_title: 'Long Year', phase: 'phase2', planned_kw: 53 },
        { task_id: 'task-1', order_number: '2020-100', customer_name: 'Test', task_title: 'Long Year', phase: 'phase3', planned_kw: 1 },
      ],
      rowCount: 3,
    } as any);

    // 2020 has 53 weeks
    const result = await getPhaseMatrix(52, 1, 2020, 2021);

    // Should generate kwRange from 52-53, then 1 (2020 has 53 weeks)
    expect(result.kwRange).toEqual([52, 53, 1]);
    expect(result.fromKw).toBe(52);
    expect(result.toKw).toBe(1);
    expect(result.year).toBe(2020);

    // Verify task has all weeks including week 53
    expect(result.tasks).toHaveLength(1);
    const task = result.tasks[0];
    expect(task.weeks).toHaveLength(3);
    expect(task.weeks[0]).toEqual({ kw: 52, phases: ['phase1'] });
    expect(task.weeks[1]).toEqual({ kw: 53, phases: ['phase2'] });
    expect(task.weeks[2]).toEqual({ kw: 1, phases: ['phase3'] });
  });
});
