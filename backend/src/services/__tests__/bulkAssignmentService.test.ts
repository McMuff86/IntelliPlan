import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database pool
vi.mock('../../config/database', () => ({
  pool: {
    query: vi.fn(),
    connect: vi.fn(),
  },
}));

import { bulkCreateAssignments } from '../taskAssignmentService';
import { pool } from '../../config/database';
import type { TaskAssignment, TaskAssignmentWithNames } from '../../models/taskAssignment';

const mockedPool = vi.mocked(pool);

const makeAssignment = (id: string, date: string): TaskAssignment => ({
  id,
  task_id: 'task-1',
  resource_id: 'res-1',
  assignment_date: date,
  half_day: 'full_day',
  notes: null,
  is_fixed: false,
  start_time: null,
  status_code: 'assigned',
  created_at: '2026-02-07T10:00:00Z',
  updated_at: '2026-02-07T10:00:00Z',
  deleted_at: null,
});

const makeAssignmentWithNames = (id: string, date: string): TaskAssignmentWithNames => ({
  ...makeAssignment(id, date),
  resource_name: 'Hans Müller',
  resource_short_code: 'MA_14',
  task_title: 'Montage',
  project_id: 'proj-1',
  project_name: 'Küche Familie Müller',
});

describe('bulkCreateAssignments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create multiple assignments in a transaction', async () => {
    const mockClient = {
      query: vi.fn(),
      release: vi.fn(),
    };

    // BEGIN
    mockClient.query.mockResolvedValueOnce({});
    // INSERT for date 1
    mockClient.query.mockResolvedValueOnce({
      rows: [{ id: 'a-1' }],
      rowCount: 1,
    });
    // INSERT for date 2
    mockClient.query.mockResolvedValueOnce({
      rows: [{ id: 'a-2' }],
      rowCount: 1,
    });
    // INSERT for date 3
    mockClient.query.mockResolvedValueOnce({
      rows: [{ id: 'a-3' }],
      rowCount: 1,
    });
    // COMMIT
    mockClient.query.mockResolvedValueOnce({});

    (mockedPool.connect as any).mockResolvedValue(mockClient);

    // Final fetch with names
    mockedPool.query.mockResolvedValueOnce({
      rows: [
        makeAssignmentWithNames('a-1', '2026-02-09'),
        makeAssignmentWithNames('a-2', '2026-02-10'),
        makeAssignmentWithNames('a-3', '2026-02-11'),
      ],
      rowCount: 3,
    } as any);

    const result = await bulkCreateAssignments({
      task_id: 'task-1',
      resource_id: 'res-1',
      dates: ['2026-02-09', '2026-02-10', '2026-02-11'],
      half_day: 'full_day',
      is_fixed: false,
      status_code: 'assigned',
    });

    expect(result).toHaveLength(3);
    expect(result[0].resource_short_code).toBe('MA_14');

    // Verify transaction flow
    expect(mockClient.query).toHaveBeenCalledTimes(5); // BEGIN + 3 INSERTs + COMMIT
    expect(mockClient.query.mock.calls[0][0]).toBe('BEGIN');
    expect(mockClient.query.mock.calls[4][0]).toBe('COMMIT');
    expect(mockClient.release).toHaveBeenCalled();
  });

  it('should rollback on failure', async () => {
    const mockClient = {
      query: vi.fn(),
      release: vi.fn(),
    };

    mockClient.query.mockResolvedValueOnce({}); // BEGIN
    mockClient.query.mockResolvedValueOnce({
      rows: [{ id: 'a-1' }],
      rowCount: 1,
    }); // First INSERT
    mockClient.query.mockRejectedValueOnce(
      Object.assign(new Error('unique violation'), { code: '23505' })
    ); // Second INSERT fails
    mockClient.query.mockResolvedValueOnce({}); // ROLLBACK

    (mockedPool.connect as any).mockResolvedValue(mockClient);

    await expect(
      bulkCreateAssignments({
        task_id: 'task-1',
        resource_id: 'res-1',
        dates: ['2026-02-09', '2026-02-09'], // duplicate date
        half_day: 'full_day',
      })
    ).rejects.toThrow();

    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    expect(mockClient.release).toHaveBeenCalled();
  });

  it('should pass status_code to each insert', async () => {
    const mockClient = {
      query: vi.fn(),
      release: vi.fn(),
    };

    mockClient.query.mockResolvedValueOnce({}); // BEGIN
    mockClient.query.mockResolvedValueOnce({
      rows: [{ id: 'a-1' }],
      rowCount: 1,
    });
    mockClient.query.mockResolvedValueOnce({}); // COMMIT

    (mockedPool.connect as any).mockResolvedValue(mockClient);

    mockedPool.query.mockResolvedValueOnce({
      rows: [makeAssignmentWithNames('a-1', '2026-02-09')],
      rowCount: 1,
    } as any);

    await bulkCreateAssignments({
      task_id: 'task-1',
      resource_id: 'res-1',
      dates: ['2026-02-09'],
      half_day: 'morning',
      status_code: 'sick',
    });

    // The INSERT query params should include 'sick'
    const insertParams = mockClient.query.mock.calls[1][1];
    expect(insertParams[5]).toBe('sick');
  });

  it('should default status_code to assigned', async () => {
    const mockClient = {
      query: vi.fn(),
      release: vi.fn(),
    };

    mockClient.query.mockResolvedValueOnce({}); // BEGIN
    mockClient.query.mockResolvedValueOnce({
      rows: [{ id: 'a-1' }],
      rowCount: 1,
    });
    mockClient.query.mockResolvedValueOnce({}); // COMMIT

    (mockedPool.connect as any).mockResolvedValue(mockClient);

    mockedPool.query.mockResolvedValueOnce({
      rows: [makeAssignmentWithNames('a-1', '2026-02-09')],
      rowCount: 1,
    } as any);

    await bulkCreateAssignments({
      task_id: 'task-1',
      resource_id: 'res-1',
      dates: ['2026-02-09'],
      half_day: 'morning',
    });

    const insertParams = mockClient.query.mock.calls[1][1];
    expect(insertParams[5]).toBe('assigned');
  });

  it('should handle single date bulk create', async () => {
    const mockClient = {
      query: vi.fn(),
      release: vi.fn(),
    };

    mockClient.query.mockResolvedValueOnce({}); // BEGIN
    mockClient.query.mockResolvedValueOnce({
      rows: [{ id: 'a-1' }],
      rowCount: 1,
    });
    mockClient.query.mockResolvedValueOnce({}); // COMMIT

    (mockedPool.connect as any).mockResolvedValue(mockClient);

    mockedPool.query.mockResolvedValueOnce({
      rows: [makeAssignmentWithNames('a-1', '2026-02-09')],
      rowCount: 1,
    } as any);

    const result = await bulkCreateAssignments({
      task_id: 'task-1',
      resource_id: 'res-1',
      dates: ['2026-02-09'],
      half_day: 'afternoon',
      is_fixed: true,
    });

    expect(result).toHaveLength(1);

    // Verify is_fixed was passed
    const insertParams = mockClient.query.mock.calls[1][1];
    expect(insertParams[4]).toBe(true); // is_fixed
  });
});
