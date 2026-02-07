import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../config/database', () => ({
  pool: {
    query: vi.fn(),
  },
}));

import {
  listResources,
  getAvailableResourcesForDate,
} from '../resourceService';
import type { Resource } from '../../models/resource';
import { pool } from '../../config/database';

const mockedPool = vi.mocked(pool);

function makeResource(overrides: Partial<Resource> = {}): Resource {
  return {
    id: 'res-1',
    owner_id: 'user-1',
    name: 'Max Mustermann',
    resource_type: 'person',
    description: null,
    is_active: true,
    availability_enabled: false,
    department: 'produktion',
    employee_type: 'internal',
    short_code: 'MA_01',
    default_location: null,
    weekly_hours: 42.5,
    skills: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── listResources with filters ────────────────────────

describe('listResources', () => {
  it('should list all resources without filters', async () => {
    const resources = [makeResource(), makeResource({ id: 'res-2', name: 'Hans' })];
    mockedPool.query.mockResolvedValueOnce({ rows: resources, rowCount: 2 } as any);

    const result = await listResources('user-1');

    expect(result).toHaveLength(2);
    const sql = mockedPool.query.mock.calls[0][0] as string;
    expect(sql).toContain('owner_id = $1');
    expect(sql).not.toContain('department');
  });

  it('should filter by department', async () => {
    const resources = [makeResource({ department: 'montage' })];
    mockedPool.query.mockResolvedValueOnce({ rows: resources, rowCount: 1 } as any);

    const result = await listResources('user-1', { department: 'montage' });

    expect(result).toHaveLength(1);
    const sql = mockedPool.query.mock.calls[0][0] as string;
    expect(sql).toContain('department = $2');
    const params = mockedPool.query.mock.calls[0][1] as any[];
    expect(params[1]).toBe('montage');
  });

  it('should filter by employee_type', async () => {
    mockedPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

    await listResources('user-1', { employee_type: 'temporary' });

    const sql = mockedPool.query.mock.calls[0][0] as string;
    expect(sql).toContain('employee_type = $2');
    const params = mockedPool.query.mock.calls[0][1] as any[];
    expect(params[1]).toBe('temporary');
  });

  it('should filter by is_active', async () => {
    mockedPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

    await listResources('user-1', { is_active: true });

    const sql = mockedPool.query.mock.calls[0][0] as string;
    expect(sql).toContain('is_active = $2');
    const params = mockedPool.query.mock.calls[0][1] as any[];
    expect(params[1]).toBe(true);
  });

  it('should filter by resource_type', async () => {
    mockedPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

    await listResources('user-1', { resource_type: 'machine' });

    const sql = mockedPool.query.mock.calls[0][0] as string;
    expect(sql).toContain('resource_type = $2');
    const params = mockedPool.query.mock.calls[0][1] as any[];
    expect(params[1]).toBe('machine');
  });

  it('should combine multiple filters', async () => {
    mockedPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

    await listResources('user-1', {
      department: 'produktion',
      employee_type: 'internal',
      is_active: true,
    });

    const sql = mockedPool.query.mock.calls[0][0] as string;
    expect(sql).toContain('department = $2');
    expect(sql).toContain('employee_type = $3');
    expect(sql).toContain('is_active = $4');
    const params = mockedPool.query.mock.calls[0][1] as any[];
    expect(params).toEqual(['user-1', 'produktion', 'internal', true]);
  });
});

// ─── getAvailableResourcesForDate ──────────────────────

describe('getAvailableResourcesForDate', () => {
  it('should query for resources not assigned for morning slot', async () => {
    const available = [makeResource()];
    mockedPool.query.mockResolvedValueOnce({ rows: available, rowCount: 1 } as any);

    const result = await getAvailableResourcesForDate('user-1', '2026-02-09', 'morning');

    expect(result).toHaveLength(1);
    const sql = mockedPool.query.mock.calls[0][0] as string;
    expect(sql).toContain('r.is_active = true');
    expect(sql).toContain("r.resource_type = 'person'");
    expect(sql).toContain('ta.assignment_date = $2');
    expect(sql).toContain("ta.half_day IN ($4, 'full_day')");
    const params = mockedPool.query.mock.calls[0][1] as any[];
    expect(params[3]).toBe('morning');
  });

  it('should query for resources not assigned for afternoon slot', async () => {
    mockedPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

    await getAvailableResourcesForDate('user-1', '2026-02-09', 'afternoon');

    const params = mockedPool.query.mock.calls[0][1] as any[];
    expect(params[3]).toBe('afternoon');
  });

  it('should query for resources not assigned for full_day', async () => {
    mockedPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

    await getAvailableResourcesForDate('user-1', '2026-02-09', 'full_day');

    const sql = mockedPool.query.mock.calls[0][0] as string;
    expect(sql).toContain("ta.half_day IN ('morning', 'afternoon', 'full_day')");
    // No $4 param for full_day
    const params = mockedPool.query.mock.calls[0][1] as any[];
    expect(params).toHaveLength(3);
  });

  it('should filter deleted assignments', async () => {
    mockedPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

    await getAvailableResourcesForDate('user-1', '2026-02-09', 'morning');

    const sql = mockedPool.query.mock.calls[0][0] as string;
    expect(sql).toContain('ta.deleted_at IS NULL');
  });

  it('should only return person resources', async () => {
    mockedPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

    await getAvailableResourcesForDate('user-1', '2026-02-09', 'morning');

    const sql = mockedPool.query.mock.calls[0][0] as string;
    expect(sql).toContain("r.resource_type = 'person'");
  });
});
