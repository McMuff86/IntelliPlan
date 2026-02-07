import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database pool
vi.mock('../../config/database', () => ({
  pool: {
    query: vi.fn(),
  },
}));

import {
  createTaskAssignment,
  getTaskAssignmentById,
  updateTaskAssignment,
  deleteTaskAssignment,
  listAssignments,
  getAssignmentsByTask,
  getAssignmentsByResource,
} from '../taskAssignmentService';
import { pool } from '../../config/database';
import type { TaskAssignment, TaskAssignmentWithNames } from '../../models/taskAssignment';

const mockedPool = vi.mocked(pool);

const mockAssignment: TaskAssignment = {
  id: 'assign-1',
  task_id: 'task-1',
  resource_id: 'res-1',
  assignment_date: '2026-02-09',
  half_day: 'morning',
  notes: 'Fix ab 06:00 Uhr',
  is_fixed: true,
  start_time: '06:00:00',
  status_code: 'assigned',
  created_at: '2026-02-07T10:00:00Z',
  updated_at: '2026-02-07T10:00:00Z',
  deleted_at: null,
};

const mockAssignmentWithNames: TaskAssignmentWithNames = {
  ...mockAssignment,
  resource_name: 'Hans Müller',
  resource_short_code: 'MA_14',
  task_title: 'Montage',
  project_id: 'proj-1',
  project_name: 'Küche Familie Müller',
};

describe('taskAssignmentService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createTaskAssignment', () => {
    it('should insert an assignment and return it with joined names', async () => {
      // INSERT
      mockedPool.query.mockResolvedValueOnce({ rows: [mockAssignment], rowCount: 1 } as any);
      // Re-fetch with names
      mockedPool.query.mockResolvedValueOnce({ rows: [mockAssignmentWithNames], rowCount: 1 } as any);

      const result = await createTaskAssignment({
        task_id: 'task-1',
        resource_id: 'res-1',
        assignment_date: '2026-02-09',
        half_day: 'morning',
        notes: 'Fix ab 06:00 Uhr',
        is_fixed: true,
        start_time: '06:00:00',
      });

      expect(result.resource_name).toBe('Hans Müller');
      expect(result.resource_short_code).toBe('MA_14');
      expect(result.task_title).toBe('Montage');
      expect(result.project_name).toBe('Küche Familie Müller');

      const insertParams = mockedPool.query.mock.calls[0][1] as any[];
      expect(insertParams[0]).toBe('task-1');
      expect(insertParams[1]).toBe('res-1');
      expect(insertParams[2]).toBe('2026-02-09');
      expect(insertParams[3]).toBe('morning');
      expect(insertParams[4]).toBe('Fix ab 06:00 Uhr');
      expect(insertParams[5]).toBe(true);
      expect(insertParams[6]).toBe('06:00:00');
      expect(insertParams[7]).toBe('assigned');
    });

    it('should use default values for optional fields', async () => {
      mockedPool.query.mockResolvedValueOnce({ rows: [mockAssignment], rowCount: 1 } as any);
      mockedPool.query.mockResolvedValueOnce({ rows: [mockAssignmentWithNames], rowCount: 1 } as any);

      await createTaskAssignment({
        task_id: 'task-1',
        resource_id: 'res-1',
        assignment_date: '2026-02-09',
        half_day: 'full_day',
      });

      const insertParams = mockedPool.query.mock.calls[0][1] as any[];
      expect(insertParams[3]).toBe('full_day');
      expect(insertParams[4]).toBeNull(); // notes
      expect(insertParams[5]).toBe(false); // is_fixed
      expect(insertParams[6]).toBeNull(); // start_time
      expect(insertParams[7]).toBe('assigned'); // status_code default
    });
  });

  describe('getTaskAssignmentById', () => {
    it('should return assignment with joined names', async () => {
      mockedPool.query.mockResolvedValueOnce({ rows: [mockAssignmentWithNames], rowCount: 1 } as any);

      const result = await getTaskAssignmentById('assign-1');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('assign-1');
      expect(result!.resource_name).toBe('Hans Müller');
      expect(result!.resource_short_code).toBe('MA_14');
      expect(result!.task_title).toBe('Montage');

      const query = mockedPool.query.mock.calls[0][0] as string;
      expect(query).toContain('ta.deleted_at IS NULL');
    });

    it('should return null for non-existent assignment', async () => {
      mockedPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      const result = await getTaskAssignmentById('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('updateTaskAssignment', () => {
    it('should update specified fields only', async () => {
      mockedPool.query.mockResolvedValueOnce({ rows: [mockAssignment], rowCount: 1 } as any);
      mockedPool.query.mockResolvedValueOnce({ rows: [mockAssignmentWithNames], rowCount: 1 } as any);

      await updateTaskAssignment('assign-1', { is_fixed: false });

      const updateQuery = mockedPool.query.mock.calls[0][0] as string;
      expect(updateQuery).toContain('is_fixed = $1');
      expect(updateQuery).toContain('deleted_at IS NULL');
      const params = mockedPool.query.mock.calls[0][1] as any[];
      expect(params[0]).toBe(false);
    });

    it('should update multiple fields at once', async () => {
      mockedPool.query.mockResolvedValueOnce({ rows: [mockAssignment], rowCount: 1 } as any);
      mockedPool.query.mockResolvedValueOnce({ rows: [mockAssignmentWithNames], rowCount: 1 } as any);

      await updateTaskAssignment('assign-1', {
        half_day: 'afternoon',
        notes: 'Updated notes',
        is_fixed: false,
      });

      const updateQuery = mockedPool.query.mock.calls[0][0] as string;
      expect(updateQuery).toContain('half_day = $');
      expect(updateQuery).toContain('notes = $');
      expect(updateQuery).toContain('is_fixed = $');
    });

    it('should return current state when no fields to update', async () => {
      mockedPool.query.mockResolvedValueOnce({ rows: [mockAssignmentWithNames], rowCount: 1 } as any);

      const result = await updateTaskAssignment('assign-1', {});

      expect(result).not.toBeNull();
      // Should have called getTaskAssignmentById directly
      expect(mockedPool.query).toHaveBeenCalledTimes(1);
    });

    it('should return null for non-existent assignment', async () => {
      mockedPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      const result = await updateTaskAssignment('non-existent', { notes: 'test' });
      expect(result).toBeNull();
    });
  });

  describe('deleteTaskAssignment', () => {
    it('should soft-delete and return true', async () => {
      mockedPool.query.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any);

      const result = await deleteTaskAssignment('assign-1');
      expect(result).toBe(true);

      const query = mockedPool.query.mock.calls[0][0] as string;
      expect(query).toContain('deleted_at = NOW()');
      expect(query).toContain('deleted_at IS NULL');
    });

    it('should return false for non-existent assignment', async () => {
      mockedPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      const result = await deleteTaskAssignment('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('listAssignments', () => {
    it('should return paginated results with default options', async () => {
      mockedPool.query.mockResolvedValueOnce({ rows: [{ count: '5' }], rowCount: 1 } as any);
      mockedPool.query.mockResolvedValueOnce({ rows: [mockAssignmentWithNames], rowCount: 1 } as any);

      const result = await listAssignments({});

      expect(result.total).toBe(5);
      expect(result.limit).toBe(100);
      expect(result.offset).toBe(0);
      expect(result.data).toHaveLength(1);
    });

    it('should apply date range filter', async () => {
      mockedPool.query.mockResolvedValueOnce({ rows: [{ count: '3' }], rowCount: 1 } as any);
      mockedPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      await listAssignments({ from: '2026-02-09', to: '2026-02-13' });

      const countQuery = mockedPool.query.mock.calls[0][0] as string;
      expect(countQuery).toContain('ta.assignment_date >= $1');
      expect(countQuery).toContain('ta.assignment_date <= $2');

      const params = mockedPool.query.mock.calls[0][1] as any[];
      expect(params[0]).toBe('2026-02-09');
      expect(params[1]).toBe('2026-02-13');
    });

    it('should apply resource filter', async () => {
      mockedPool.query.mockResolvedValueOnce({ rows: [{ count: '2' }], rowCount: 1 } as any);
      mockedPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      await listAssignments({ resourceId: 'res-1' });

      const countQuery = mockedPool.query.mock.calls[0][0] as string;
      expect(countQuery).toContain('ta.resource_id = $1');
    });

    it('should apply task filter', async () => {
      mockedPool.query.mockResolvedValueOnce({ rows: [{ count: '1' }], rowCount: 1 } as any);
      mockedPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      await listAssignments({ taskId: 'task-1' });

      const countQuery = mockedPool.query.mock.calls[0][0] as string;
      expect(countQuery).toContain('ta.task_id = $1');
    });

    it('should combine multiple filters', async () => {
      mockedPool.query.mockResolvedValueOnce({ rows: [{ count: '1' }], rowCount: 1 } as any);
      mockedPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      await listAssignments({
        from: '2026-02-09',
        to: '2026-02-13',
        resourceId: 'res-1',
      });

      const countQuery = mockedPool.query.mock.calls[0][0] as string;
      expect(countQuery).toContain('ta.assignment_date >= $1');
      expect(countQuery).toContain('ta.assignment_date <= $2');
      expect(countQuery).toContain('ta.resource_id = $3');
    });

    it('should apply custom pagination', async () => {
      mockedPool.query.mockResolvedValueOnce({ rows: [{ count: '50' }], rowCount: 1 } as any);
      mockedPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      const result = await listAssignments({ limit: 20, offset: 10 });

      expect(result.limit).toBe(20);
      expect(result.offset).toBe(10);
    });

    it('should exclude soft-deleted assignments', async () => {
      mockedPool.query.mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 } as any);
      mockedPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      await listAssignments({});

      const countQuery = mockedPool.query.mock.calls[0][0] as string;
      expect(countQuery).toContain('ta.deleted_at IS NULL');
    });
  });

  describe('getAssignmentsByTask', () => {
    it('should return assignments for a specific task', async () => {
      mockedPool.query.mockResolvedValueOnce({
        rows: [mockAssignmentWithNames],
        rowCount: 1,
      } as any);

      const result = await getAssignmentsByTask('task-1');

      expect(result).toHaveLength(1);
      expect(result[0].task_id).toBe('task-1');

      const query = mockedPool.query.mock.calls[0][0] as string;
      expect(query).toContain('ta.task_id = $1');
      expect(query).toContain('ta.deleted_at IS NULL');
      expect(query).toContain('ORDER BY ta.assignment_date ASC');
    });

    it('should return empty array for task with no assignments', async () => {
      mockedPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      const result = await getAssignmentsByTask('task-no-assign');
      expect(result).toHaveLength(0);
    });
  });

  describe('getAssignmentsByResource', () => {
    it('should return assignments for a resource within date range', async () => {
      const secondAssignment: TaskAssignmentWithNames = {
        ...mockAssignmentWithNames,
        id: 'assign-2',
        assignment_date: '2026-02-10',
        half_day: 'afternoon',
      };
      mockedPool.query.mockResolvedValueOnce({
        rows: [mockAssignmentWithNames, secondAssignment],
        rowCount: 2,
      } as any);

      const result = await getAssignmentsByResource('res-1', '2026-02-09', '2026-02-13');

      expect(result).toHaveLength(2);

      const query = mockedPool.query.mock.calls[0][0] as string;
      expect(query).toContain('ta.resource_id = $1');
      expect(query).toContain('ta.assignment_date >= $2');
      expect(query).toContain('ta.assignment_date <= $3');
      expect(query).toContain('ta.deleted_at IS NULL');

      const params = mockedPool.query.mock.calls[0][1] as any[];
      expect(params[0]).toBe('res-1');
      expect(params[1]).toBe('2026-02-09');
      expect(params[2]).toBe('2026-02-13');
    });

    it('should return empty array for resource with no assignments in range', async () => {
      mockedPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      const result = await getAssignmentsByResource('res-1', '2026-12-01', '2026-12-05');
      expect(result).toHaveLength(0);
    });
  });
});
