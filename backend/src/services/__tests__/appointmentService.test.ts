import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Appointment } from '../../models/appointment';

// Mock the database pool
vi.mock('../../config/database', () => ({
  pool: {
    query: vi.fn(),
  },
}));

import {
  checkOverlap,
  createAppointment,
  getAppointments,
  deleteAppointment,
} from '../appointmentService';
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

describe('appointmentService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkOverlap', () => {
    it('should return hasOverlap=false when no conflicts', async () => {
      mockedPool.query.mockResolvedValue({ rows: [], rowCount: 0 } as any);

      const result = await checkOverlap({
        userId: 'user-1',
        startTime: '2025-01-15T10:00:00Z',
        endTime: '2025-01-15T11:00:00Z',
      });

      expect(result.hasOverlap).toBe(false);
      expect(result.conflicts).toHaveLength(0);
    });

    it('should return hasOverlap=true with conflicts', async () => {
      const conflict = makeAppointment();
      mockedPool.query.mockResolvedValue({ rows: [conflict], rowCount: 1 } as any);

      const result = await checkOverlap({
        userId: 'user-1',
        startTime: '2025-01-15T10:00:00Z',
        endTime: '2025-01-15T11:00:00Z',
      });

      expect(result.hasOverlap).toBe(true);
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].id).toBe('apt-1');
    });

    it('should pass excludeId to query when provided', async () => {
      mockedPool.query.mockResolvedValue({ rows: [], rowCount: 0 } as any);

      await checkOverlap({
        userId: 'user-1',
        startTime: '2025-01-15T10:00:00Z',
        endTime: '2025-01-15T11:00:00Z',
        excludeId: 'apt-exclude',
      });

      const queryArgs = mockedPool.query.mock.calls[0];
      expect(queryArgs[1]).toContain('apt-exclude');
    });

    it('should query with correct overlap logic (start < endTime AND end > startTime)', async () => {
      mockedPool.query.mockResolvedValue({ rows: [], rowCount: 0 } as any);

      await checkOverlap({
        userId: 'user-1',
        startTime: '2025-01-15T10:00:00Z',
        endTime: '2025-01-15T11:00:00Z',
      });

      const sql = mockedPool.query.mock.calls[0][0] as string;
      expect(sql).toContain('start_time < $3');
      expect(sql).toContain('end_time > $2');
    });
  });

  describe('createAppointment', () => {
    it('should insert appointment with correct params', async () => {
      const created = makeAppointment();
      mockedPool.query.mockResolvedValue({ rows: [created], rowCount: 1 } as any);

      const result = await createAppointment({
        title: 'New Apt',
        start_time: '2025-01-15T10:00:00Z',
        end_time: '2025-01-15T11:00:00Z',
        timezone: 'Europe/Zurich',
        user_id: 'user-1',
      });

      expect(result).toEqual(created);
      const params = mockedPool.query.mock.calls[0][1] as any[];
      expect(params[0]).toBe('New Apt'); // title
      expect(params[4]).toBe('Europe/Zurich'); // timezone
    });

    it('should default timezone to UTC', async () => {
      mockedPool.query.mockResolvedValue({ rows: [makeAppointment()], rowCount: 1 } as any);

      await createAppointment({
        title: 'No TZ',
        start_time: '2025-01-15T10:00:00Z',
        end_time: '2025-01-15T11:00:00Z',
        user_id: 'user-1',
      });

      const params = mockedPool.query.mock.calls[0][1] as any[];
      expect(params[4]).toBe('UTC');
    });
  });

  describe('getAppointments', () => {
    it('should use default pagination (limit=50, offset=0)', async () => {
      mockedPool.query
        .mockResolvedValueOnce({ rows: [{ count: '0' }] } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      const result = await getAppointments({ userId: 'user-1' });

      expect(result.limit).toBe(50);
      expect(result.offset).toBe(0);
    });

    it('should pass custom pagination params', async () => {
      mockedPool.query
        .mockResolvedValueOnce({ rows: [{ count: '100' }] } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      const result = await getAppointments({
        userId: 'user-1',
        limit: 10,
        offset: 20,
      });

      expect(result.limit).toBe(10);
      expect(result.offset).toBe(20);
      expect(result.total).toBe(100);
    });
  });

  describe('deleteAppointment', () => {
    it('should return true when appointment deleted', async () => {
      mockedPool.query.mockResolvedValue({ rowCount: 1 } as any);
      const result = await deleteAppointment('apt-1');
      expect(result).toBe(true);
    });

    it('should return false when no appointment found', async () => {
      mockedPool.query.mockResolvedValue({ rowCount: 0 } as any);
      const result = await deleteAppointment('nonexistent');
      expect(result).toBe(false);
    });
  });
});
