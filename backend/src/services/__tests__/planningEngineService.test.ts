import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../config/database', () => ({
  pool: {
    query: vi.fn(),
  },
}));

import { pool } from '../../config/database';
import {
  applyAutoSchedulePreview,
  buildAutoSchedulePreview,
  type AutoSchedulePreviewResult,
} from '../planningEngineService';

const mockedPool = vi.mocked(pool);

describe('planningEngineService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('builds a preview with create and skipped actions', async () => {
    mockedPool.query
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'task-1',
            title: 'Zuschnitt',
            phase_code: 'ZUS',
            duration_minutes: 120,
            resource_id: null,
            start_date: null,
            due_date: null,
          },
          {
            id: 'task-2',
            title: 'Montage',
            phase_code: 'MONT',
            duration_minutes: null,
            resource_id: null,
            start_date: null,
            due_date: null,
          },
        ],
        rowCount: 2,
      } as never)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

    const preview = await buildAutoSchedulePreview({
      projectId: 'project-1',
      ownerId: 'owner-1',
      taskIds: ['task-1', 'task-2'],
      endDate: '2026-02-13',
      includeWeekends: false,
      workdayStart: '08:00',
      workdayEnd: '17:00',
    });

    expect(preview.summary.selectedTaskCount).toBe(2);
    expect(preview.summary.createCount).toBe(1);
    expect(preview.summary.skippedTaskCount).toBe(1);
    expect(preview.tasks.find((task) => task.taskId === 'task-1')?.action).toBe('create');
    expect(preview.tasks.find((task) => task.taskId === 'task-2')?.action).toBe('skipped');
  });

  it('marks unchanged tasks and detects conflicts', async () => {
    mockedPool.query
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'task-1',
            title: 'Montage',
            phase_code: 'MONT',
            duration_minutes: 60,
            resource_id: '11111111-1111-1111-1111-111111111111',
            start_date: '2026-02-13',
            due_date: '2026-02-13',
          },
        ],
        rowCount: 1,
      } as never)
      .mockResolvedValueOnce({
        rows: [
          {
            task_id: 'task-1',
            start_time: '2026-02-13T15:00:00.000Z',
            end_time: '2026-02-13T16:00:00.000Z',
            is_fixed: false,
          },
        ],
        rowCount: 1,
      } as never)
      .mockResolvedValueOnce({
        rows: [
          {
            task_id: 'task-legacy',
            task_title: 'Existing booking',
            resource_id: '11111111-1111-1111-1111-111111111111',
            resource_name: 'Worker A',
            start_time: '2026-02-13T15:30:00.000Z',
            end_time: '2026-02-13T16:30:00.000Z',
          },
        ],
        rowCount: 1,
      } as never);

    const preview = await buildAutoSchedulePreview({
      projectId: 'project-1',
      ownerId: 'owner-1',
      taskIds: ['task-1'],
      endDate: '2026-02-13',
      includeWeekends: false,
      workdayStart: '08:00',
      workdayEnd: '17:00',
    });

    expect(preview.tasks[0]?.action).toBe('unchanged');
    expect(preview.conflicts).toHaveLength(1);
    expect(preview.summary.conflictCount).toBe(1);
  });

  it('skips tasks with fixed work slots in preview', async () => {
    mockedPool.query
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'task-1',
            title: 'Montage',
            phase_code: 'MONT',
            duration_minutes: 180,
            resource_id: null,
            start_date: '2026-02-13',
            due_date: '2026-02-13',
          },
        ],
        rowCount: 1,
      } as never)
      .mockResolvedValueOnce({
        rows: [
          {
            task_id: 'task-1',
            start_time: '2026-02-13T08:00:00.000Z',
            end_time: '2026-02-13T11:00:00.000Z',
            is_fixed: true,
          },
        ],
        rowCount: 1,
      } as never);

    const preview = await buildAutoSchedulePreview({
      projectId: 'project-1',
      ownerId: 'owner-1',
      taskIds: ['task-1'],
      endDate: '2026-02-13',
      includeWeekends: false,
      workdayStart: '08:00',
      workdayEnd: '17:00',
    });

    expect(preview.tasks[0]?.action).toBe('skipped');
    expect(preview.tasks[0]?.reason).toBe('Has fixed work slots');
    expect(preview.warnings.some((warning) => warning.includes('fixed work slots'))).toBe(true);
  });

  it('applies preview to tasks and Wochenplan phase schedules', async () => {
    const preview: AutoSchedulePreviewResult = {
      projectId: 'project-1',
      ownerId: 'owner-1',
      endDate: '2026-02-13',
      taskIds: ['task-1', 'task-2'],
      summary: {
        selectedTaskCount: 2,
        scheduledTaskCount: 1,
        skippedTaskCount: 1,
        createCount: 1,
        updateCount: 0,
        unchangedCount: 0,
        conflictCount: 0,
      },
      tasks: [
        {
          taskId: 'task-1',
          title: 'Zuschnitt',
          phaseCode: 'ZUS',
          resourceId: null,
          action: 'create',
          reason: null,
          durationMinutes: 60,
          startDate: '2026-02-13',
          dueDate: '2026-02-13',
          slotCount: 1,
          slots: [
            {
              startTime: '2026-02-13T15:00:00.000Z',
              endTime: '2026-02-13T16:00:00.000Z',
            },
          ],
        },
        {
          taskId: 'task-2',
          title: 'No duration',
          phaseCode: null,
          resourceId: null,
          action: 'skipped',
          reason: 'No duration configured',
          durationMinutes: null,
          startDate: null,
          dueDate: null,
          slotCount: 0,
          slots: [],
        },
      ],
      warnings: [],
      conflicts: [],
      createdAt: '2026-02-13T10:00:00.000Z',
    };

    mockedPool.query
      .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never) // delete existing slots
      .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never) // update task
      .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never) // insert slot
      .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never); // upsert phase schedule

    const result = await applyAutoSchedulePreview('owner-1', preview);

    expect(result.scheduledTaskIds).toEqual(['task-1']);
    expect(result.skippedTaskIds).toEqual(['task-2']);
    const publishCall = mockedPool.query.mock.calls.find(
      (call) =>
        typeof call[0] === 'string' &&
        call[0].includes('task_phase_schedules')
    );
    expect(publishCall).toBeDefined();
    expect(publishCall?.[1]?.[1]).toBe('zuschnitt');
  });

  it('applies only create/update tasks and keeps unchanged tasks untouched', async () => {
    const preview: AutoSchedulePreviewResult = {
      projectId: 'project-1',
      ownerId: 'owner-1',
      endDate: '2026-02-13',
      taskIds: ['task-create', 'task-unchanged', 'task-skipped'],
      summary: {
        selectedTaskCount: 3,
        scheduledTaskCount: 2,
        skippedTaskCount: 1,
        createCount: 1,
        updateCount: 0,
        unchangedCount: 1,
        conflictCount: 0,
      },
      tasks: [
        {
          taskId: 'task-create',
          title: 'Create task',
          phaseCode: 'ZUS',
          resourceId: null,
          action: 'create',
          reason: null,
          durationMinutes: 60,
          startDate: '2026-02-13',
          dueDate: '2026-02-13',
          slotCount: 1,
          slots: [
            {
              startTime: '2026-02-13T15:00:00.000Z',
              endTime: '2026-02-13T16:00:00.000Z',
            },
          ],
        },
        {
          taskId: 'task-unchanged',
          title: 'Unchanged task',
          phaseCode: 'MONT',
          resourceId: null,
          action: 'unchanged',
          reason: null,
          durationMinutes: 60,
          startDate: '2026-02-13',
          dueDate: '2026-02-13',
          slotCount: 1,
          slots: [
            {
              startTime: '2026-02-13T12:00:00.000Z',
              endTime: '2026-02-13T13:00:00.000Z',
            },
          ],
        },
        {
          taskId: 'task-skipped',
          title: 'Skipped task',
          phaseCode: null,
          resourceId: null,
          action: 'skipped',
          reason: 'Has fixed work slots',
          durationMinutes: 120,
          startDate: '2026-02-13',
          dueDate: '2026-02-13',
          slotCount: 0,
          slots: [],
        },
      ],
      warnings: [],
      conflicts: [],
      createdAt: '2026-02-13T10:00:00.000Z',
    };

    mockedPool.query
      .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never) // delete slots for rewritten tasks
      .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never) // update created task
      .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never) // insert slot for created task
      .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never) // upsert phase schedule (create)
      .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never); // upsert phase schedule (unchanged)

    const result = await applyAutoSchedulePreview('owner-1', preview);

    expect(result.scheduledTaskIds).toEqual(['task-create', 'task-unchanged']);
    expect(result.skippedTaskIds).toEqual(['task-skipped']);

    const deleteCall = mockedPool.query.mock.calls.find(
      (call) => typeof call[0] === 'string' && call[0].includes('DELETE FROM task_work_slots')
    );
    expect(deleteCall?.[1]?.[0]).toEqual(['task-create']);

    const unchangedUpdateCall = mockedPool.query.mock.calls.find(
      (call) =>
        typeof call[0] === 'string' &&
        call[0].includes('UPDATE tasks') &&
        call[1]?.[2] === 'task-unchanged'
    );
    expect(unchangedUpdateCall).toBeUndefined();
  });
});
