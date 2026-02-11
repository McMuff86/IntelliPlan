import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../config/database', () => ({
  pool: {
    query: vi.fn(),
    connect: vi.fn(),
  },
}));

import { pool } from '../../config/database';
import type { Task } from '../../models/task';
import {
  getDefaultProjectPhasePlan,
  listProjectPhasePlan,
  ProjectPhasePlanValidationError,
  replaceProjectPhasePlan,
  syncProjectPhasePlanToTasks,
} from '../projectPhasePlanService';
import type { ProjectPhasePlan } from '../../models/projectPhasePlan';

const mockedPool = vi.mocked(pool);

const makePlan = (overrides: Partial<ProjectPhasePlan> = {}): ProjectPhasePlan => ({
  id: 'phase-1',
  project_id: 'project-1',
  owner_id: 'owner-1',
  phase_code: 'ZUS',
  phase_label: 'Zuschnitt',
  sequence_order: 10,
  is_required: true,
  is_enabled: true,
  estimated_hours_min: 4,
  estimated_hours_max: 8,
  dependency_phase_codes: [],
  notes: null,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  deleted_at: null,
  ...overrides,
});

const makeTask = (overrides: Partial<Task> = {}): Task => ({
  id: 'task-1',
  project_id: 'project-1',
  owner_id: 'owner-1',
  title: 'Zuschnitt',
  description: null,
  status: 'planned',
  scheduling_mode: 'manual',
  duration_minutes: 240,
  resource_label: null,
  resource_id: null,
  start_date: null,
  due_date: null,
  reminder_enabled: false,
  phase_code: 'ZUS',
  planned_week: null,
  planned_year: null,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

describe('projectPhasePlanService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a default project phase plan', () => {
    const defaults = getDefaultProjectPhasePlan();

    expect(defaults.length).toBeGreaterThanOrEqual(8);
    expect(defaults[0].phaseCode).toBe('ZUS');
    expect(defaults.some((phase) => phase.phaseCode === 'NACHBEH')).toBe(true);
  });

  it('lists project phase plans owner-scoped', async () => {
    mockedPool.query.mockResolvedValueOnce({
      rows: [makePlan()],
      rowCount: 1,
    } as never);

    const result = await listProjectPhasePlan('project-1', 'owner-1');

    expect(result).toHaveLength(1);
    expect(result[0].phase_code).toBe('ZUS');
    const sql = mockedPool.query.mock.calls[0][0] as string;
    expect(sql).toContain('ppp.owner_id = $2');
  });

  it('replaces the project phase plan and returns sorted rows', async () => {
    const clientQuery = vi
      .fn()
      .mockResolvedValueOnce({ rows: [], rowCount: null }) // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: 'project-1' }], rowCount: 1 }) // ensure project
      .mockResolvedValueOnce({ rows: [], rowCount: 2 }) // soft-delete old plan
      .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // insert 1
      .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // insert 2
      .mockResolvedValueOnce({ rows: [], rowCount: null }); // COMMIT

    mockedPool.connect.mockResolvedValueOnce({
      query: clientQuery,
      release: vi.fn(),
    } as never);

    mockedPool.query.mockResolvedValueOnce({
      rows: [
        makePlan({ phase_code: 'ZUS', sequence_order: 10 }),
        makePlan({ id: 'phase-2', phase_code: 'CNC', phase_label: 'CNC', sequence_order: 20 }),
      ],
      rowCount: 2,
    } as never);

    const result = await replaceProjectPhasePlan('project-1', 'owner-1', [
      { phaseCode: 'CNC', sequenceOrder: 20, isEnabled: true },
      { phaseCode: 'ZUS', sequenceOrder: 10, isEnabled: true },
    ]);

    expect(result).toHaveLength(2);
    expect(clientQuery).toHaveBeenCalled();
    const insertCall = clientQuery.mock.calls.find(
      (call) => typeof call[0] === 'string' && call[0].includes('INSERT INTO project_phase_plans')
    );
    expect(insertCall).toBeDefined();
  });

  it('rejects duplicate phase codes on replace', async () => {
    await expect(
      replaceProjectPhasePlan('project-1', 'owner-1', [
        { phaseCode: 'ZUS', sequenceOrder: 10 },
        { phaseCode: 'ZUS', sequenceOrder: 20 },
      ])
    ).rejects.toBeInstanceOf(ProjectPhasePlanValidationError);

    expect(mockedPool.connect).not.toHaveBeenCalled();
  });

  it('syncs enabled phases to tasks and creates dependencies', async () => {
    mockedPool.query.mockResolvedValueOnce({
      rows: [
        makePlan({ phase_code: 'ZUS', sequence_order: 10, estimated_hours_min: 4, estimated_hours_max: 6 }),
        makePlan({
          id: 'phase-2',
          phase_code: 'CNC',
          phase_label: 'CNC',
          sequence_order: 20,
          estimated_hours_min: 2,
          estimated_hours_max: 3,
        }),
      ],
      rowCount: 2,
    } as never);

    const clientQuery = vi
      .fn()
      .mockResolvedValueOnce({ rows: [], rowCount: null }) // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: 'project-1' }], rowCount: 1 }) // ensure project
      .mockResolvedValueOnce({ rows: [makeTask()], rowCount: 1 }) // existing tasks by phase
      .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // update existing phase task
      .mockResolvedValueOnce({ rows: [{ id: 'task-2' }], rowCount: 1 }) // create second phase task
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // delete dependencies
      .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // insert dependency
      .mockResolvedValueOnce({ rows: [], rowCount: null }); // COMMIT

    mockedPool.connect.mockResolvedValueOnce({
      query: clientQuery,
      release: vi.fn(),
    } as never);

    const result = await syncProjectPhasePlanToTasks('project-1', 'owner-1', {
      replaceExistingPhaseTasks: false,
    });

    expect(result.createdTaskIds).toEqual(['task-2']);
    expect(result.updatedTaskIds).toEqual(['task-1']);
    expect(result.warnings).toHaveLength(0);

    const depInsert = clientQuery.mock.calls.find(
      (call) => typeof call[0] === 'string' && call[0].includes('INSERT INTO task_dependencies')
    );
    expect(depInsert).toBeDefined();
  });

  it('returns warning when no enabled phases exist', async () => {
    mockedPool.query.mockResolvedValueOnce({
      rows: [makePlan({ is_enabled: false })],
      rowCount: 1,
    } as never);

    const result = await syncProjectPhasePlanToTasks('project-1', 'owner-1');

    expect(result.createdTaskIds).toHaveLength(0);
    expect(result.warnings[0]).toContain('No enabled phases');
    expect(mockedPool.connect).not.toHaveBeenCalled();
  });
});
