import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../config/database', () => ({
  pool: {
    query: vi.fn(),
    connect: vi.fn(),
  },
}));

import { pool } from '../../config/database';
import type { ProjectReadinessCheck } from '../../models/projectReadiness';
import {
  getDefaultReadinessTemplate,
  getProjectReadinessSummary,
  ProjectReadinessValidationError,
  updateProjectReadinessChecks,
} from '../projectReadinessService';

const mockedPool = vi.mocked(pool);

const makeCheck = (overrides: Partial<ProjectReadinessCheck> = {}): ProjectReadinessCheck => ({
  id: 'check-1',
  project_id: 'project-1',
  owner_id: 'owner-1',
  check_code: 'AVOR_DONE',
  status: 'pending',
  checked_by: null,
  checked_at: null,
  comment: null,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  deleted_at: null,
  ...overrides,
});

describe('projectReadinessService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns default readiness template', () => {
    const defaults = getDefaultReadinessTemplate();
    expect(defaults).toHaveLength(5);
    expect(defaults[0].checkCode).toBe('AVOR_DONE');
    expect(defaults.every((item) => item.status === 'pending')).toBe(true);
  });

  it('updates readiness checks for a project', async () => {
    const clientQuery = vi
      .fn()
      .mockResolvedValueOnce({ rows: [], rowCount: null }) // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: 'project-1' }], rowCount: 1 }) // assert ownership
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // insert missing defaults
      .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // update check
      .mockResolvedValueOnce({
        rows: [makeCheck({ status: 'ok', checked_by: 'owner-1', checked_at: '2026-02-01T00:00:00.000Z' })],
        rowCount: 1,
      }) // select list
      .mockResolvedValueOnce({ rows: [], rowCount: null }); // COMMIT

    mockedPool.connect.mockResolvedValueOnce({
      query: clientQuery,
      release: vi.fn(),
    } as never);

    const result = await updateProjectReadinessChecks(
      'project-1',
      'owner-1',
      [{ checkCode: 'AVOR_DONE', status: 'ok', comment: 'ready' }],
      'owner-1'
    );

    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('ok');
    const updateCall = clientQuery.mock.calls.find(
      (call) => typeof call[0] === 'string' && call[0].includes('UPDATE project_readiness_checks')
    );
    expect(updateCall).toBeDefined();
  });

  it('rejects duplicate readiness check codes', async () => {
    await expect(
      updateProjectReadinessChecks(
        'project-1',
        'owner-1',
        [
          { checkCode: 'AVOR_DONE', status: 'ok' },
          { checkCode: 'AVOR_DONE', status: 'blocked' },
        ],
        'owner-1'
      )
    ).rejects.toBeInstanceOf(ProjectReadinessValidationError);

    expect(mockedPool.connect).not.toHaveBeenCalled();
  });

  it('builds readiness summary counts', async () => {
    const clientQuery = vi
      .fn()
      .mockResolvedValueOnce({ rows: [], rowCount: null }) // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: 'project-1' }], rowCount: 1 }) // assert ownership
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // insert missing defaults
      .mockResolvedValueOnce({ rows: [makeCheck()], rowCount: 1 }) // list in init
      .mockResolvedValueOnce({ rows: [], rowCount: null }); // COMMIT

    mockedPool.connect.mockResolvedValueOnce({
      query: clientQuery,
      release: vi.fn(),
    } as never);

    mockedPool.query.mockResolvedValueOnce({
      rows: [
        makeCheck({ check_code: 'AVOR_DONE', status: 'ok' }),
        makeCheck({ id: 'check-2', check_code: 'MATERIAL_READY', status: 'pending' }),
        makeCheck({ id: 'check-3', check_code: 'FITTINGS_READY', status: 'blocked' }),
      ],
      rowCount: 3,
    } as never);

    const summary = await getProjectReadinessSummary('project-1', 'owner-1');

    expect(summary.totalChecks).toBe(3);
    expect(summary.okCount).toBe(1);
    expect(summary.pendingCount).toBe(1);
    expect(summary.blockedCount).toBe(1);
    expect(summary.isReady).toBe(false);
  });
});
