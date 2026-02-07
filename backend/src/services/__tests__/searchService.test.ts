import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Appointment } from '../../models/appointment';
import type { Project } from '../../models/project';
import type { Task } from '../../models/task';

// Mock the database pool
vi.mock('../../config/database', () => ({
  pool: {
    query: vi.fn(),
  },
}));

import { searchAppointments, searchProjects, searchTasks } from '../searchService';
import { pool } from '../../config/database';

const mockedPool = vi.mocked(pool);

function makeAppointment(overrides: Partial<Appointment> = {}): Appointment {
  return {
    id: 'apt-1',
    title: 'Test Appointment',
    description: null,
    start_time: new Date('2025-01-15T10:00:00Z'),
    end_time: new Date('2025-01-15T11:00:00Z'),
    timezone: 'UTC',
    user_id: 'user-1',
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
    ...overrides,
  };
}

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'proj-1',
    name: 'Test Project',
    description: null,
    owner_id: 'user-1',
    include_weekends: false,
    workday_start: '09:00',
    workday_end: '17:00',
    work_template: 'default',
    task_template_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
    ...overrides,
  };
}

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    project_id: 'proj-1',
    owner_id: 'user-1',
    title: 'Test Task',
    description: null,
    status: 'planned',
    scheduling_mode: 'manual',
    duration_minutes: null,
    resource_label: null,
    resource_id: null,
    start_date: null,
    due_date: null,
    reminder_enabled: false,
    phase_code: null,
    planned_week: null,
    planned_year: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe('searchService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('searchAppointments', () => {
    it('should search with text query (q parameter)', async () => {
      const appointments = [makeAppointment()];
      mockedPool.query
        .mockResolvedValueOnce({ rows: [{ count: '1' }] } as any)
        .mockResolvedValueOnce({ rows: appointments, rowCount: 1 } as any);

      const result = await searchAppointments({ userId: 'user-1', q: 'Test' });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      const countSql = mockedPool.query.mock.calls[0][0] as string;
      expect(countSql).toContain('ILIKE');
      const countParams = mockedPool.query.mock.calls[0][1] as any[];
      expect(countParams).toContain('%Test%');
    });

    it('should search with date range (from/to)', async () => {
      mockedPool.query
        .mockResolvedValueOnce({ rows: [{ count: '2' }] } as any)
        .mockResolvedValueOnce({
          rows: [makeAppointment(), makeAppointment({ id: 'apt-2' })],
          rowCount: 2,
        } as any);

      const result = await searchAppointments({
        userId: 'user-1',
        from: '2025-01-01T00:00:00Z',
        to: '2025-01-31T23:59:59Z',
      });

      expect(result.items).toHaveLength(2);
      const countSql = mockedPool.query.mock.calls[0][0] as string;
      expect(countSql).toContain('start_time >=');
      expect(countSql).toContain('end_time <=');
    });

    it('should support pagination', async () => {
      mockedPool.query
        .mockResolvedValueOnce({ rows: [{ count: '50' }] } as any)
        .mockResolvedValueOnce({ rows: [makeAppointment()], rowCount: 1 } as any);

      const result = await searchAppointments({
        userId: 'user-1',
        page: 3,
        limit: 10,
      });

      expect(result.total).toBe(50);
      expect(result.page).toBe(3);
      expect(result.totalPages).toBe(5);
      // Verify offset = (3-1) * 10 = 20
      const dataSql = mockedPool.query.mock.calls[1][0] as string;
      expect(dataSql).toContain('LIMIT');
      expect(dataSql).toContain('OFFSET');
      const dataParams = mockedPool.query.mock.calls[1][1] as any[];
      expect(dataParams).toContain(10); // limit
      expect(dataParams).toContain(20); // offset
    });

    it('should return empty results', async () => {
      mockedPool.query
        .mockResolvedValueOnce({ rows: [{ count: '0' }] } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      const result = await searchAppointments({ userId: 'user-1', q: 'nonexistent' });

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });
  });

  describe('searchProjects', () => {
    it('should search with text query', async () => {
      const projects = [makeProject()];
      mockedPool.query
        .mockResolvedValueOnce({ rows: [{ count: '1' }] } as any)
        .mockResolvedValueOnce({ rows: projects, rowCount: 1 } as any);

      const result = await searchProjects({ userId: 'user-1', q: 'Test' });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      const countSql = mockedPool.query.mock.calls[0][0] as string;
      expect(countSql).toContain('ILIKE');
      const countParams = mockedPool.query.mock.calls[0][1] as any[];
      expect(countParams).toContain('%Test%');
    });

    it('should support pagination', async () => {
      mockedPool.query
        .mockResolvedValueOnce({ rows: [{ count: '30' }] } as any)
        .mockResolvedValueOnce({ rows: [makeProject()], rowCount: 1 } as any);

      const result = await searchProjects({
        userId: 'user-1',
        page: 2,
        limit: 10,
      });

      expect(result.total).toBe(30);
      expect(result.page).toBe(2);
      expect(result.totalPages).toBe(3);
      const dataParams = mockedPool.query.mock.calls[1][1] as any[];
      expect(dataParams).toContain(10); // limit
      expect(dataParams).toContain(10); // offset = (2-1) * 10
    });
  });

  describe('searchTasks', () => {
    it('should search with text query', async () => {
      const tasks = [makeTask()];
      mockedPool.query
        .mockResolvedValueOnce({ rows: [{ count: '1' }] } as any)
        .mockResolvedValueOnce({ rows: tasks, rowCount: 1 } as any);

      const result = await searchTasks({ userId: 'user-1', q: 'Test' });

      expect(result.items).toHaveLength(1);
      const countSql = mockedPool.query.mock.calls[0][0] as string;
      expect(countSql).toContain('ILIKE');
    });

    it('should filter by projectId', async () => {
      mockedPool.query
        .mockResolvedValueOnce({ rows: [{ count: '3' }] } as any)
        .mockResolvedValueOnce({
          rows: [makeTask()],
          rowCount: 1,
        } as any);

      const result = await searchTasks({
        userId: 'user-1',
        projectId: 'proj-1',
      });

      expect(result.items).toHaveLength(1);
      const countSql = mockedPool.query.mock.calls[0][0] as string;
      expect(countSql).toContain('project_id');
      const countParams = mockedPool.query.mock.calls[0][1] as any[];
      expect(countParams).toContain('proj-1');
    });

    it('should filter by status', async () => {
      mockedPool.query
        .mockResolvedValueOnce({ rows: [{ count: '2' }] } as any)
        .mockResolvedValueOnce({
          rows: [makeTask({ status: 'done' })],
          rowCount: 1,
        } as any);

      const result = await searchTasks({
        userId: 'user-1',
        status: 'done',
      });

      expect(result.items).toHaveLength(1);
      const countSql = mockedPool.query.mock.calls[0][0] as string;
      expect(countSql).toContain('status');
      const countParams = mockedPool.query.mock.calls[0][1] as any[];
      expect(countParams).toContain('done');
    });

    it('should handle combined filters', async () => {
      mockedPool.query
        .mockResolvedValueOnce({ rows: [{ count: '1' }] } as any)
        .mockResolvedValueOnce({
          rows: [makeTask({ status: 'in_progress', project_id: 'proj-2' })],
          rowCount: 1,
        } as any);

      const result = await searchTasks({
        userId: 'user-1',
        q: 'urgent',
        projectId: 'proj-2',
        status: 'in_progress',
        page: 1,
        limit: 5,
      });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      const countSql = mockedPool.query.mock.calls[0][0] as string;
      expect(countSql).toContain('ILIKE');
      expect(countSql).toContain('project_id');
      expect(countSql).toContain('status');
      const countParams = mockedPool.query.mock.calls[0][1] as any[];
      expect(countParams).toContain('%urgent%');
      expect(countParams).toContain('proj-2');
      expect(countParams).toContain('in_progress');
    });
  });
});
