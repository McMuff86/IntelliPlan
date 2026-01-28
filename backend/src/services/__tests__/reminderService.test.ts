import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Reminder } from '../../models/reminder';

// Mock the database pool
vi.mock('../../config/database', () => ({
  pool: {
    query: vi.fn(),
  },
}));

import {
  createReminder,
  getRemindersForAppointment,
  getUpcomingReminders,
  dismissReminder,
  deleteReminder,
  getDueReminders,
} from '../reminderService';
import { pool } from '../../config/database';

const mockedPool = vi.mocked(pool);

function makeReminder(overrides: Partial<Reminder> = {}): Reminder {
  return {
    id: 'rem-1',
    appointment_id: 'apt-1',
    user_id: 'user-1',
    remind_at: new Date('2025-01-15T09:30:00Z'),
    reminder_type: 'relative',
    offset_minutes: 30,
    status: 'pending',
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  };
}

describe('reminderService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createReminder', () => {
    it('should create with relative offset and calculate remind_at correctly', async () => {
      const appointmentStart = new Date('2025-01-15T10:00:00Z');
      const expectedRemindAt = new Date(appointmentStart.getTime() - 30 * 60 * 1000);

      // First query: fetch appointment start_time
      mockedPool.query.mockResolvedValueOnce({
        rows: [{ start_time: appointmentStart }],
        rowCount: 1,
      } as any);

      // Second query: insert reminder
      const created = makeReminder({
        remind_at: expectedRemindAt,
        reminder_type: 'relative',
        offset_minutes: 30,
      });
      mockedPool.query.mockResolvedValueOnce({
        rows: [created],
        rowCount: 1,
      } as any);

      const result = await createReminder('user-1', {
        appointmentId: 'apt-1',
        offsetMinutes: 30,
      });

      expect(result).toEqual(created);
      // Verify INSERT was called with computed remind_at
      const insertCall = mockedPool.query.mock.calls[1];
      const insertParams = insertCall[1] as any[];
      expect(insertParams[0]).toBe('apt-1'); // appointment_id
      expect(insertParams[1]).toBe('user-1'); // user_id
      expect(insertParams[2]).toBe(expectedRemindAt.toISOString()); // computed remind_at
      expect(insertParams[3]).toBe('relative'); // reminder_type
      expect(insertParams[4]).toBe(30); // offset_minutes
    });

    it('should create with absolute remindAt', async () => {
      const absoluteTime = '2025-01-15T09:00:00Z';
      const created = makeReminder({
        remind_at: new Date(absoluteTime),
        reminder_type: 'absolute',
        offset_minutes: null,
      });

      mockedPool.query.mockResolvedValueOnce({
        rows: [created],
        rowCount: 1,
      } as any);

      const result = await createReminder('user-1', {
        appointmentId: 'apt-1',
        remindAt: absoluteTime,
      });

      expect(result).toEqual(created);
      // Only one query (no appointment lookup needed)
      expect(mockedPool.query).toHaveBeenCalledTimes(1);
      const params = mockedPool.query.mock.calls[0][1] as any[];
      expect(params[2]).toBe(absoluteTime); // remindAt passed directly
      expect(params[3]).toBe('absolute'); // reminder_type
      expect(params[4]).toBeNull(); // offset_minutes
    });

    it('should throw if neither offsetMinutes nor remindAt is provided', async () => {
      await expect(
        createReminder('user-1', { appointmentId: 'apt-1' })
      ).rejects.toThrow('Either offsetMinutes or remindAt must be provided');
    });

    it('should throw if appointment not found for relative reminder', async () => {
      mockedPool.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      await expect(
        createReminder('user-1', { appointmentId: 'nonexistent', offsetMinutes: 15 })
      ).rejects.toThrow('Appointment not found');
    });
  });

  describe('getRemindersForAppointment', () => {
    it('should return reminders for given appointment and user', async () => {
      const reminders = [
        makeReminder({ id: 'rem-1' }),
        makeReminder({ id: 'rem-2', offset_minutes: 60 }),
      ];
      mockedPool.query.mockResolvedValueOnce({
        rows: reminders,
        rowCount: 2,
      } as any);

      const result = await getRemindersForAppointment('apt-1', 'user-1');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('rem-1');
      expect(result[1].id).toBe('rem-2');
      const params = mockedPool.query.mock.calls[0][1] as any[];
      expect(params[0]).toBe('apt-1');
      expect(params[1]).toBe('user-1');
    });
  });

  describe('getUpcomingReminders', () => {
    it('should return pending reminders in next 24h', async () => {
      const reminders = [makeReminder()];
      mockedPool.query.mockResolvedValueOnce({
        rows: reminders,
        rowCount: 1,
      } as any);

      const result = await getUpcomingReminders('user-1');

      expect(result).toHaveLength(1);
      const sql = mockedPool.query.mock.calls[0][0] as string;
      expect(sql).toContain("status = 'pending'");
      expect(sql).toContain("INTERVAL '24 hours'");
      const params = mockedPool.query.mock.calls[0][1] as any[];
      expect(params[0]).toBe('user-1');
    });
  });

  describe('dismissReminder', () => {
    it('should update status to dismissed and return reminder', async () => {
      const dismissed = makeReminder({ status: 'dismissed' });
      mockedPool.query.mockResolvedValueOnce({
        rows: [dismissed],
        rowCount: 1,
      } as any);

      const result = await dismissReminder('rem-1', 'user-1');

      expect(result).toEqual(dismissed);
      expect(result!.status).toBe('dismissed');
      const sql = mockedPool.query.mock.calls[0][0] as string;
      expect(sql).toContain("status = 'dismissed'");
      const params = mockedPool.query.mock.calls[0][1] as any[];
      expect(params[0]).toBe('rem-1');
      expect(params[1]).toBe('user-1');
    });

    it('should return null if reminder not found', async () => {
      mockedPool.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      const result = await dismissReminder('nonexistent', 'user-1');
      expect(result).toBeNull();
    });
  });

  describe('deleteReminder', () => {
    it('should return true when reminder deleted', async () => {
      mockedPool.query.mockResolvedValueOnce({ rowCount: 1 } as any);
      const result = await deleteReminder('rem-1', 'user-1');
      expect(result).toBe(true);
      const params = mockedPool.query.mock.calls[0][1] as any[];
      expect(params[0]).toBe('rem-1');
      expect(params[1]).toBe('user-1');
    });

    it('should return false when no reminder found', async () => {
      mockedPool.query.mockResolvedValueOnce({ rowCount: 0 } as any);
      const result = await deleteReminder('nonexistent', 'user-1');
      expect(result).toBe(false);
    });
  });

  describe('getDueReminders', () => {
    it('should return all pending reminders where remind_at <= NOW()', async () => {
      const dueReminders = [
        makeReminder({ id: 'rem-1' }),
        makeReminder({ id: 'rem-2' }),
      ];
      mockedPool.query.mockResolvedValueOnce({
        rows: dueReminders,
        rowCount: 2,
      } as any);

      const result = await getDueReminders();

      expect(result).toHaveLength(2);
      const sql = mockedPool.query.mock.calls[0][0] as string;
      expect(sql).toContain("status = 'pending'");
      expect(sql).toContain('remind_at <= NOW()');
      // No params for getDueReminders
      expect(mockedPool.query).toHaveBeenCalledTimes(1);
    });
  });
});
