import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database pool
vi.mock('../../config/database', () => ({
  pool: {
    query: vi.fn(),
  },
}));

import {
  createTask,
  updateTask,
  deleteTask,
  isTaskBlocked,
  createDependency,
  shiftTaskWithDependents,
  shiftProjectSchedule,
  autoScheduleProjectTasks,
  getISOWeek,
} from '../taskService';
import { pool } from '../../config/database';

const mockedPool = vi.mocked(pool);

describe('taskService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createTask', () => {
    it('should insert a task with correct parameters', async () => {
      const mockTask = {
        id: 'task-1',
        project_id: 'proj-1',
        owner_id: 'user-1',
        title: 'Build cabinet',
        description: null,
        status: 'planned',
        scheduling_mode: 'manual',
        duration_minutes: 120,
        resource_label: null,
        resource_id: null,
        start_date: null,
        due_date: null,
        reminder_enabled: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      mockedPool.query.mockResolvedValue({ rows: [mockTask], rowCount: 1 } as any);

      const result = await createTask({
        project_id: 'proj-1',
        owner_id: 'user-1',
        title: 'Build cabinet',
        duration_minutes: 120,
      });

      expect(result.title).toBe('Build cabinet');
      const params = mockedPool.query.mock.calls[0][1] as any[];
      expect(params[0]).toBe('proj-1'); // project_id
      expect(params[1]).toBe('user-1'); // owner_id
      expect(params[2]).toBe('Build cabinet'); // title
    });

    it('should default status to planned', async () => {
      mockedPool.query.mockResolvedValue({ rows: [{ id: 'task-1' }], rowCount: 1 } as any);

      await createTask({
        project_id: 'proj-1',
        owner_id: 'user-1',
        title: 'Task',
      });

      const params = mockedPool.query.mock.calls[0][1] as any[];
      expect(params[4]).toBe('planned'); // status default
    });
  });

  describe('isTaskBlocked', () => {
    it('should return false when no dependencies', async () => {
      mockedPool.query.mockResolvedValue({ rows: [], rowCount: 0 } as any);

      const blocked = await isTaskBlocked('task-1', 'user-1');
      expect(blocked).toBe(false);
    });

    it('should return true when finish_start dependency is not done', async () => {
      mockedPool.query.mockResolvedValue({
        rows: [{ dependency_type: 'finish_start', status: 'in_progress' }],
        rowCount: 1,
      } as any);

      const blocked = await isTaskBlocked('task-1', 'user-1');
      expect(blocked).toBe(true);
    });

    it('should return false when finish_start dependency is done', async () => {
      mockedPool.query.mockResolvedValue({
        rows: [{ dependency_type: 'finish_start', status: 'done' }],
        rowCount: 1,
      } as any);

      const blocked = await isTaskBlocked('task-1', 'user-1');
      expect(blocked).toBe(false);
    });

    it('should return true when start_start dependency is still planned', async () => {
      mockedPool.query.mockResolvedValue({
        rows: [{ dependency_type: 'start_start', status: 'planned' }],
        rowCount: 1,
      } as any);

      const blocked = await isTaskBlocked('task-1', 'user-1');
      expect(blocked).toBe(true);
    });

    it('should return false when start_start dependency is in_progress', async () => {
      mockedPool.query.mockResolvedValue({
        rows: [{ dependency_type: 'start_start', status: 'in_progress' }],
        rowCount: 1,
      } as any);

      const blocked = await isTaskBlocked('task-1', 'user-1');
      expect(blocked).toBe(false);
    });

    it('should return false for finish_finish dependency (never blocks)', async () => {
      mockedPool.query.mockResolvedValue({
        rows: [{ dependency_type: 'finish_finish', status: 'planned' }],
        rowCount: 1,
      } as any);

      const blocked = await isTaskBlocked('task-1', 'user-1');
      expect(blocked).toBe(false);
    });

    it('should return true if any dependency blocks', async () => {
      mockedPool.query.mockResolvedValue({
        rows: [
          { dependency_type: 'finish_start', status: 'done' },
          { dependency_type: 'finish_start', status: 'in_progress' },
        ],
        rowCount: 2,
      } as any);

      const blocked = await isTaskBlocked('task-1', 'user-1');
      expect(blocked).toBe(true);
    });
  });

  describe('deleteTask', () => {
    it('should return true when task is deleted', async () => {
      mockedPool.query.mockResolvedValue({ rowCount: 1 } as any);

      const result = await deleteTask('task-1', 'user-1');
      expect(result).toBe(true);
    });

    it('should return false when task not found', async () => {
      mockedPool.query.mockResolvedValue({ rowCount: 0 } as any);

      const result = await deleteTask('nonexistent', 'user-1');
      expect(result).toBe(false);
    });
  });

  describe('createDependency', () => {
    it('should create a dependency if task exists', async () => {
      const dep = {
        id: 'dep-1',
        task_id: 'task-1',
        depends_on_task_id: 'task-2',
        dependency_type: 'finish_start',
        created_at: new Date().toISOString(),
      };
      mockedPool.query.mockResolvedValue({ rows: [dep], rowCount: 1 } as any);

      const result = await createDependency('task-1', 'user-1', 'task-2', 'finish_start');
      expect(result).toBeDefined();
      expect(result!.task_id).toBe('task-1');
      expect(result!.depends_on_task_id).toBe('task-2');
    });

    it('should return null when task does not exist (no rows)', async () => {
      mockedPool.query.mockResolvedValue({ rows: [], rowCount: 0 } as any);

      const result = await createDependency('nonexistent', 'user-1', 'task-2', 'finish_start');
      expect(result).toBeNull();
    });
  });

  describe('getISOWeek', () => {
    it('should return correct ISO week for a known date', () => {
      // 2026-02-10 is a Tuesday in ISO week 7
      const result = getISOWeek(new Date(2026, 1, 10));
      expect(result.kw).toBe(7);
      expect(result.year).toBe(2026);
    });

    it('should handle year boundary correctly', () => {
      // 2025-12-29 (Monday) is ISO week 1 of 2026
      const result = getISOWeek(new Date(2025, 11, 29));
      expect(result.kw).toBe(1);
      expect(result.year).toBe(2026);
    });
  });

  describe('autoScheduleProjectTasks', () => {
    it('should publish to task_phase_schedules when task has phase_code', async () => {
      const task = {
        id: 'task-1',
        project_id: 'proj-1',
        owner_id: 'user-1',
        title: 'Zuschnitt Platte',
        duration_minutes: 60,
        phase_code: 'ZUS',
        status: 'planned',
      };

      // 1: SELECT tasks
      // 2: SELECT existing task slots
      // 3: DELETE work_slots
      // 4: UPDATE tasks (start/due date)
      // 5: INSERT work_slot
      // 6: INSERT task_phase_schedules (publish)
      mockedPool.query
        .mockResolvedValueOnce({ rows: [task], rowCount: 1 } as any) // SELECT
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any) // SELECT existing slots
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any) // DELETE slots
        .mockResolvedValueOnce({ rows: [], rowCount: 1 } as any) // UPDATE task dates
        .mockResolvedValueOnce({ rows: [], rowCount: 1 } as any) // INSERT work_slot
        .mockResolvedValueOnce({ rows: [], rowCount: 1 } as any); // INSERT phase_schedule

      const result = await autoScheduleProjectTasks(
        'proj-1', 'user-1', ['task-1'],
        '2026-02-13', false, '08:00', '17:00'
      );

      expect(result.scheduledTaskIds).toContain('task-1');

      // Find the phase_schedule INSERT call
      const calls = mockedPool.query.mock.calls;
      const phaseCall = calls.find(
        (c) => typeof c[0] === 'string' && c[0].includes('task_phase_schedules')
      );
      expect(phaseCall).toBeDefined();
      expect(phaseCall![1]![0]).toBe('task-1'); // task_id
      expect(phaseCall![1]![1]).toBe('zuschnitt'); // mapped phase
    });

    it('should add warning when task has no phase_code', async () => {
      const task = {
        id: 'task-2',
        project_id: 'proj-1',
        owner_id: 'user-1',
        title: 'Generic Task',
        duration_minutes: 60,
        phase_code: null,
        status: 'planned',
      };

      mockedPool.query
        .mockResolvedValueOnce({ rows: [task], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 1 } as any);

      const result = await autoScheduleProjectTasks(
        'proj-1', 'user-1', ['task-2'],
        '2026-02-13', false, '08:00', '17:00'
      );

      expect(result.scheduledTaskIds).toContain('task-2');
      expect(result.warnings.some((w) => w.includes('phase_code'))).toBe(true);
    });
  });

  describe('shiftProjectSchedule', () => {
    it('should return empty result when deltaDays is 0', async () => {
      const result = await shiftProjectSchedule('proj-1', 'user-1', 0);
      expect(result.shiftedTaskIds).toEqual([]);
      expect(result.deltaDays).toBe(0);
    });

    it('should return empty when no tasks in project', async () => {
      mockedPool.query.mockResolvedValue({ rows: [], rowCount: 0 } as any);

      const result = await shiftProjectSchedule('proj-1', 'user-1', 5);
      expect(result.shiftedTaskIds).toEqual([]);
    });

    it('should shift all tasks in project', async () => {
      mockedPool.query
        .mockResolvedValueOnce({
          rows: [{ id: 'task-1' }, { id: 'task-2' }],
          rowCount: 2,
        } as any)
        .mockResolvedValue({ rowCount: 2 } as any); // shift queries

      const result = await shiftProjectSchedule('proj-1', 'user-1', 3);
      expect(result.shiftedTaskIds).toEqual(['task-1', 'task-2']);
      expect(result.deltaDays).toBe(3);
    });
  });
});
