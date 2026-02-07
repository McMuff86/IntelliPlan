import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../config/database', () => ({
  pool: {
    query: vi.fn(),
    connect: vi.fn(),
  },
}));

import {
  createProject,
  listProjects,
  getProjectById,
  updateProject,
} from '../projectService';
import { toProjectResponse } from '../../models/project';
import type { Project } from '../../models/project';
import { pool } from '../../config/database';

const mockedPool = vi.mocked(pool);

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'proj-1',
    name: 'Test Project',
    description: 'A test project',
    owner_id: 'user-1',
    include_weekends: false,
    workday_start: '08:00',
    workday_end: '17:00',
    work_template: 'weekday_8_17',
    task_template_id: null,
    order_number: null,
    customer_name: null,
    installation_location: null,
    color: null,
    contact_name: null,
    contact_phone: null,
    needs_callback: false,
    sachbearbeiter: null,
    worker_count: null,
    helper_count: null,
    remarks: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    deleted_at: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── toProjectResponse mapper ──────────────────────────

describe('toProjectResponse', () => {
  it('should map all base fields from snake_case to camelCase', () => {
    const project = makeProject();
    const response = toProjectResponse(project);

    expect(response.id).toBe('proj-1');
    expect(response.name).toBe('Test Project');
    expect(response.ownerId).toBe('user-1');
    expect(response.includeWeekends).toBe(false);
    expect(response.workdayStart).toBe('08:00');
    expect(response.workdayEnd).toBe('17:00');
    expect(response.workTemplate).toBe('weekday_8_17');
    expect(response.taskTemplateId).toBeNull();
  });

  it('should map all 11 Wochenplan fields correctly', () => {
    const project = makeProject({
      order_number: '2026-001',
      customer_name: 'Müller AG',
      installation_location: 'Zürich',
      color: 'RAL 9010',
      contact_name: 'Hans Müller',
      contact_phone: '+41 44 123 45 67',
      needs_callback: true,
      sachbearbeiter: 'MH',
      worker_count: 3.5,
      helper_count: 1,
      remarks: 'Eilauftrag',
    });

    const response = toProjectResponse(project);

    expect(response.orderNumber).toBe('2026-001');
    expect(response.customerName).toBe('Müller AG');
    expect(response.installationLocation).toBe('Zürich');
    expect(response.color).toBe('RAL 9010');
    expect(response.contactName).toBe('Hans Müller');
    expect(response.contactPhone).toBe('+41 44 123 45 67');
    expect(response.needsCallback).toBe(true);
    expect(response.sachbearbeiter).toBe('MH');
    expect(response.workerCount).toBe(3.5);
    expect(response.helperCount).toBe(1);
    expect(response.remarks).toBe('Eilauftrag');
  });

  it('should handle null Wochenplan fields', () => {
    const project = makeProject(); // all defaults are null
    const response = toProjectResponse(project);

    expect(response.orderNumber).toBeNull();
    expect(response.customerName).toBeNull();
    expect(response.installationLocation).toBeNull();
    expect(response.color).toBeNull();
    expect(response.contactName).toBeNull();
    expect(response.contactPhone).toBeNull();
    expect(response.needsCallback).toBe(false);
    expect(response.sachbearbeiter).toBeNull();
    expect(response.workerCount).toBeNull();
    expect(response.helperCount).toBeNull();
    expect(response.remarks).toBeNull();
  });

  it('should convert worker_count and helper_count to numbers', () => {
    // pg returns NUMERIC as strings
    const project = makeProject({
      worker_count: '2.5' as any,
      helper_count: '0' as any,
    });
    const response = toProjectResponse(project);

    expect(response.workerCount).toBe(2.5);
    expect(response.helperCount).toBe(0);
  });
});

// ─── createProject ─────────────────────────────────────

describe('createProject', () => {
  it('should insert a project with all Wochenplan fields', async () => {
    const fullProject = makeProject({
      order_number: '2026-100',
      customer_name: 'Bau GmbH',
      installation_location: 'Bern',
      color: 'Weiss',
      contact_name: 'Peter',
      contact_phone: '079 999 99 99',
      needs_callback: true,
      sachbearbeiter: 'AB',
      worker_count: 2,
      helper_count: 1,
      remarks: 'Urgent',
    });

    mockedPool.query.mockResolvedValueOnce({
      rows: [fullProject],
      rowCount: 1,
    } as any);

    const result = await createProject({
      name: 'Test Project',
      description: 'A test project',
      owner_id: 'user-1',
      order_number: '2026-100',
      customer_name: 'Bau GmbH',
      installation_location: 'Bern',
      color: 'Weiss',
      contact_name: 'Peter',
      contact_phone: '079 999 99 99',
      needs_callback: true,
      sachbearbeiter: 'AB',
      worker_count: 2,
      helper_count: 1,
      remarks: 'Urgent',
    });

    expect(result.order_number).toBe('2026-100');
    expect(result.customer_name).toBe('Bau GmbH');
    expect(result.needs_callback).toBe(true);
    expect(result.worker_count).toBe(2);

    // Verify the INSERT query was called with 19 params
    const call = mockedPool.query.mock.calls[0];
    expect(call[1]).toHaveLength(19);
    expect(call[1]![8]).toBe('2026-100');  // order_number
    expect(call[1]![14]).toBe(true);       // needs_callback
    expect(call[1]![16]).toBe(2);          // worker_count
  });

  it('should default needs_callback to false and nullable fields to null', async () => {
    const project = makeProject();
    mockedPool.query.mockResolvedValueOnce({ rows: [project], rowCount: 1 } as any);

    await createProject({
      name: 'Minimal Project',
      owner_id: 'user-1',
    });

    const call = mockedPool.query.mock.calls[0];
    expect(call[1]![8]).toBeNull();   // order_number
    expect(call[1]![9]).toBeNull();   // customer_name
    expect(call[1]![14]).toBe(false); // needs_callback default
    expect(call[1]![16]).toBeNull();  // worker_count
    expect(call[1]![18]).toBeNull();  // remarks
  });
});

// ─── updateProject ─────────────────────────────────────

describe('updateProject', () => {
  it('should build SET clause for Wochenplan fields', async () => {
    const updated = makeProject({ order_number: 'NEW-001', customer_name: 'New Customer' });
    mockedPool.query.mockResolvedValueOnce({ rows: [updated], rowCount: 1 } as any);

    const result = await updateProject('proj-1', 'user-1', {
      order_number: 'NEW-001',
      customer_name: 'New Customer',
    });

    expect(result).not.toBeNull();
    const sql = mockedPool.query.mock.calls[0][0] as string;
    expect(sql).toContain('order_number = $1');
    expect(sql).toContain('customer_name = $2');
    expect(sql).toContain('updated_at = NOW()');
  });

  it('should handle needs_callback update', async () => {
    const updated = makeProject({ needs_callback: true });
    mockedPool.query.mockResolvedValueOnce({ rows: [updated], rowCount: 1 } as any);

    await updateProject('proj-1', 'user-1', { needs_callback: true });

    const sql = mockedPool.query.mock.calls[0][0] as string;
    expect(sql).toContain('needs_callback');
    const params = mockedPool.query.mock.calls[0][1] as any[];
    expect(params[0]).toBe(true);
  });

  it('should handle worker_count and helper_count updates', async () => {
    const updated = makeProject({ worker_count: 4, helper_count: 2 });
    mockedPool.query.mockResolvedValueOnce({ rows: [updated], rowCount: 1 } as any);

    await updateProject('proj-1', 'user-1', { worker_count: 4, helper_count: 2 });

    const params = mockedPool.query.mock.calls[0][1] as any[];
    expect(params[0]).toBe(4);
    expect(params[1]).toBe(2);
  });

  it('should allow setting fields to null', async () => {
    const updated = makeProject({ order_number: null, remarks: null });
    mockedPool.query.mockResolvedValueOnce({ rows: [updated], rowCount: 1 } as any);

    await updateProject('proj-1', 'user-1', {
      order_number: null,
      remarks: null,
    });

    const params = mockedPool.query.mock.calls[0][1] as any[];
    expect(params[0]).toBeNull();
    expect(params[1]).toBeNull();
  });

  it('should handle mixed old and new field updates', async () => {
    const updated = makeProject({ name: 'Updated Name', sachbearbeiter: 'XY' });
    mockedPool.query.mockResolvedValueOnce({ rows: [updated], rowCount: 1 } as any);

    await updateProject('proj-1', 'user-1', {
      name: 'Updated Name',
      sachbearbeiter: 'XY',
    });

    const sql = mockedPool.query.mock.calls[0][0] as string;
    expect(sql).toContain('name = $1');
    expect(sql).toContain('sachbearbeiter = $2');
  });
});

// ─── listProjects ──────────────────────────────────────

describe('listProjects', () => {
  it('should return projects with Wochenplan fields', async () => {
    const project = makeProject({
      order_number: '2026-050',
      customer_name: 'Test Kunde',
      worker_count: 5,
    });

    mockedPool.query
      .mockResolvedValueOnce({ rows: [{ count: '1' }], rowCount: 1 } as any)
      .mockResolvedValueOnce({ rows: [project], rowCount: 1 } as any);

    const result = await listProjects({ ownerId: 'user-1' });

    expect(result.data).toHaveLength(1);
    expect(result.data[0].order_number).toBe('2026-050');
    expect(result.data[0].customer_name).toBe('Test Kunde');
    expect(result.data[0].worker_count).toBe(5);
  });
});

// ─── getProjectById ────────────────────────────────────

describe('getProjectById', () => {
  it('should return a project with all Wochenplan fields', async () => {
    const project = makeProject({
      order_number: '2026-075',
      color: 'RAL 3020',
      sachbearbeiter: 'MH',
    });

    mockedPool.query.mockResolvedValueOnce({ rows: [project], rowCount: 1 } as any);

    const result = await getProjectById('proj-1', 'user-1');

    expect(result).not.toBeNull();
    expect(result!.order_number).toBe('2026-075');
    expect(result!.color).toBe('RAL 3020');
    expect(result!.sachbearbeiter).toBe('MH');
  });
});
