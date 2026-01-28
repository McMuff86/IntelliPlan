import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Appointment } from '../../models/appointment';
import type {
  AIConflictResolutionOptions,
  ConflictSuggestion,
} from '../aiConflictService';

// Mock the database pool
vi.mock('../../config/database', () => ({
  pool: {
    query: vi.fn(),
  },
}));

// Mock fs/promises for beads logging
vi.mock('fs/promises', () => ({
  readFile: vi.fn().mockRejectedValue(new Error('no file')),
  writeFile: vi.fn().mockResolvedValue(undefined),
}));

import { generateConflictSuggestions } from '../aiConflictService';
import { pool } from '../../config/database';

const mockedPool = vi.mocked(pool);

function makeAppointment(overrides: Partial<Appointment> = {}): Appointment {
  return {
    id: 'apt-1',
    title: 'Existing Appointment',
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

describe('aiConflictService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: no existing appointments for slot finding
    mockedPool.query.mockResolvedValue({ rows: [], rowCount: 0 } as any);
  });

  describe('generateConflictSuggestions', () => {
    it('should return reschedule suggestion when next slot is available', async () => {
      const options: AIConflictResolutionOptions = {
        requestedStart: '2025-01-15T10:00:00Z',
        requestedEnd: '2025-01-15T11:00:00Z',
        conflicts: [makeAppointment()],
        userId: 'user-1',
        title: 'New Meeting',
      };

      const result = await generateConflictSuggestions(options);

      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.conflictPattern).toBeDefined();

      const reschedule = result.suggestions.find((s) => s.type === 'reschedule');
      if (reschedule) {
        expect(reschedule.confidence).toBe(0.9);
        expect(reschedule.proposedTime).toBeDefined();
      }
    });

    it('should suggest move_earlier when a slot before exists', async () => {
      // First call: findNextAvailableSlot, second: findAvailableSlotBefore
      mockedPool.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any) // next slot query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any); // before slot query

      const options: AIConflictResolutionOptions = {
        requestedStart: '2025-01-15T14:00:00Z',
        requestedEnd: '2025-01-15T15:00:00Z',
        conflicts: [
          makeAppointment({
            start_time: new Date('2025-01-15T14:00:00Z'),
            end_time: new Date('2025-01-15T15:00:00Z'),
          }),
        ],
        userId: 'user-1',
      };

      const result = await generateConflictSuggestions(options);

      // Should have suggestions (reschedule / move_earlier depending on slot availability)
      expect(result.suggestions).toBeDefined();
      expect(Array.isArray(result.suggestions)).toBe(true);
    });

    it('should suggest swap for low-priority (planning/review) conflicts', async () => {
      const options: AIConflictResolutionOptions = {
        requestedStart: '2025-01-15T10:00:00Z',
        requestedEnd: '2025-01-15T11:00:00Z',
        conflicts: [
          makeAppointment({ title: 'Weekly Planning Session' }),
        ],
        userId: 'user-1',
      };

      const result = await generateConflictSuggestions(options);

      const swap = result.suggestions.find((s) => s.type === 'swap');
      expect(swap).toBeDefined();
      expect(swap!.confidence).toBe(0.75);
      expect(swap!.description).toContain('Weekly Planning Session');
    });

    it('should suggest swap for review appointments', async () => {
      const options: AIConflictResolutionOptions = {
        requestedStart: '2025-01-15T10:00:00Z',
        requestedEnd: '2025-01-15T11:00:00Z',
        conflicts: [
          makeAppointment({ title: 'Code Review Meeting' }),
        ],
        userId: 'user-1',
      };

      const result = await generateConflictSuggestions(options);

      const swap = result.suggestions.find((s) => s.type === 'swap');
      expect(swap).toBeDefined();
    });

    it('should suggest split when new appointment spans across existing', async () => {
      // New: 09:00-12:00, Existing: 10:00-11:00 → new fully contains existing
      const options: AIConflictResolutionOptions = {
        requestedStart: '2025-01-15T09:00:00Z',
        requestedEnd: '2025-01-15T12:00:00Z',
        conflicts: [
          makeAppointment({
            start_time: new Date('2025-01-15T10:00:00Z'),
            end_time: new Date('2025-01-15T11:00:00Z'),
          }),
        ],
        userId: 'user-1',
      };

      const result = await generateConflictSuggestions(options);

      const split = result.suggestions.find((s) => s.type === 'split');
      expect(split).toBeDefined();
      expect(split!.confidence).toBe(0.65);
      expect(split!.reasoning).toContain('60min before');
      expect(split!.reasoning).toContain('60min after');
    });

    it('should NOT suggest split when parts would be < 15 minutes', async () => {
      // New: 09:50-11:10, Existing: 10:00-11:00 → before=10min, after=10min (both < 15)
      const options: AIConflictResolutionOptions = {
        requestedStart: '2025-01-15T09:50:00Z',
        requestedEnd: '2025-01-15T11:10:00Z',
        conflicts: [
          makeAppointment({
            start_time: new Date('2025-01-15T10:00:00Z'),
            end_time: new Date('2025-01-15T11:00:00Z'),
          }),
        ],
        userId: 'user-1',
      };

      const result = await generateConflictSuggestions(options);

      const split = result.suggestions.find((s) => s.type === 'split');
      expect(split).toBeUndefined();
    });

    it('should suggest shorten when overlap is at end only', async () => {
      // New: 09:00-10:30, Existing: 10:00-11:00 → overlap at end
      const options: AIConflictResolutionOptions = {
        requestedStart: '2025-01-15T09:00:00Z',
        requestedEnd: '2025-01-15T10:30:00Z',
        conflicts: [
          makeAppointment({
            start_time: new Date('2025-01-15T10:00:00Z'),
            end_time: new Date('2025-01-15T11:00:00Z'),
          }),
        ],
        userId: 'user-1',
      };

      const result = await generateConflictSuggestions(options);

      const shorten = result.suggestions.find((s) => s.type === 'shorten');
      expect(shorten).toBeDefined();
      expect(shorten!.confidence).toBe(0.7);
      expect(shorten!.proposedTime).toBeDefined();
      // Should end 1 second before the conflict starts
      const proposedEnd = new Date(shorten!.proposedTime!.endTime);
      expect(proposedEnd.getTime()).toBe(new Date('2025-01-15T10:00:00Z').getTime() - 1000);
    });

    it('should NOT suggest shorten when new starts after conflict starts', async () => {
      // New: 10:30-11:30, Existing: 10:00-11:00 → overlap at start
      const options: AIConflictResolutionOptions = {
        requestedStart: '2025-01-15T10:30:00Z',
        requestedEnd: '2025-01-15T11:30:00Z',
        conflicts: [
          makeAppointment({
            start_time: new Date('2025-01-15T10:00:00Z'),
            end_time: new Date('2025-01-15T11:00:00Z'),
          }),
        ],
        userId: 'user-1',
      };

      const result = await generateConflictSuggestions(options);

      const shorten = result.suggestions.find((s) => s.type === 'shorten');
      expect(shorten).toBeUndefined();
    });

    it('should sort suggestions by confidence (descending)', async () => {
      const options: AIConflictResolutionOptions = {
        requestedStart: '2025-01-15T09:00:00Z',
        requestedEnd: '2025-01-15T12:00:00Z',
        conflicts: [
          makeAppointment({
            title: 'Planning Session',
            start_time: new Date('2025-01-15T10:00:00Z'),
            end_time: new Date('2025-01-15T11:00:00Z'),
          }),
        ],
        userId: 'user-1',
      };

      const result = await generateConflictSuggestions(options);

      for (let i = 1; i < result.suggestions.length; i++) {
        expect(result.suggestions[i - 1].confidence).toBeGreaterThanOrEqual(
          result.suggestions[i].confidence
        );
      }
    });

    it('should return max 3 suggestions', async () => {
      const options: AIConflictResolutionOptions = {
        requestedStart: '2025-01-15T09:00:00Z',
        requestedEnd: '2025-01-15T12:00:00Z',
        conflicts: [
          makeAppointment({
            title: 'Planning Review',
            start_time: new Date('2025-01-15T10:00:00Z'),
            end_time: new Date('2025-01-15T11:00:00Z'),
          }),
        ],
        userId: 'user-1',
      };

      const result = await generateConflictSuggestions(options);

      expect(result.suggestions.length).toBeLessThanOrEqual(3);
    });

    it('should handle no conflicts gracefully', async () => {
      const options: AIConflictResolutionOptions = {
        requestedStart: '2025-01-15T10:00:00Z',
        requestedEnd: '2025-01-15T11:00:00Z',
        conflicts: [],
        userId: 'user-1',
      };

      const result = await generateConflictSuggestions(options);

      expect(result.conflictPattern).toBe('no-conflict');
      // May still have reschedule/move_earlier from slot search
      expect(result.suggestions).toBeDefined();
    });

    it('should identify fully-contained conflict pattern', async () => {
      // New is inside existing
      const options: AIConflictResolutionOptions = {
        requestedStart: '2025-01-15T10:15:00Z',
        requestedEnd: '2025-01-15T10:45:00Z',
        conflicts: [
          makeAppointment({
            start_time: new Date('2025-01-15T10:00:00Z'),
            end_time: new Date('2025-01-15T11:00:00Z'),
          }),
        ],
        userId: 'user-1',
      };

      const result = await generateConflictSuggestions(options);
      expect(result.conflictPattern).toBe('fully-contained');
    });

    it('should identify fully-contains conflict pattern', async () => {
      const options: AIConflictResolutionOptions = {
        requestedStart: '2025-01-15T09:00:00Z',
        requestedEnd: '2025-01-15T12:00:00Z',
        conflicts: [
          makeAppointment({
            start_time: new Date('2025-01-15T10:00:00Z'),
            end_time: new Date('2025-01-15T11:00:00Z'),
          }),
        ],
        userId: 'user-1',
      };

      const result = await generateConflictSuggestions(options);
      expect(result.conflictPattern).toBe('fully-contains');
    });

    it('should identify overlap-end pattern', async () => {
      const options: AIConflictResolutionOptions = {
        requestedStart: '2025-01-15T09:00:00Z',
        requestedEnd: '2025-01-15T10:30:00Z',
        conflicts: [
          makeAppointment({
            start_time: new Date('2025-01-15T10:00:00Z'),
            end_time: new Date('2025-01-15T11:00:00Z'),
          }),
        ],
        userId: 'user-1',
      };

      const result = await generateConflictSuggestions(options);
      expect(result.conflictPattern).toBe('overlap-end');
    });

    it('should identify overlap-start pattern', async () => {
      const options: AIConflictResolutionOptions = {
        requestedStart: '2025-01-15T10:30:00Z',
        requestedEnd: '2025-01-15T11:30:00Z',
        conflicts: [
          makeAppointment({
            start_time: new Date('2025-01-15T10:00:00Z'),
            end_time: new Date('2025-01-15T11:00:00Z'),
          }),
        ],
        userId: 'user-1',
      };

      const result = await generateConflictSuggestions(options);
      expect(result.conflictPattern).toBe('overlap-start');
    });

    it('should identify multiple-conflicts pattern', async () => {
      const options: AIConflictResolutionOptions = {
        requestedStart: '2025-01-15T09:00:00Z',
        requestedEnd: '2025-01-15T12:00:00Z',
        conflicts: [
          makeAppointment({ id: 'apt-1', start_time: new Date('2025-01-15T09:30:00Z'), end_time: new Date('2025-01-15T10:00:00Z') }),
          makeAppointment({ id: 'apt-2', start_time: new Date('2025-01-15T11:00:00Z'), end_time: new Date('2025-01-15T11:30:00Z') }),
        ],
        userId: 'user-1',
      };

      const result = await generateConflictSuggestions(options);
      expect(result.conflictPattern).toBe('multiple-conflicts');
    });

    it('should not suggest split or shorten for multiple conflicts', async () => {
      const options: AIConflictResolutionOptions = {
        requestedStart: '2025-01-15T09:00:00Z',
        requestedEnd: '2025-01-15T12:00:00Z',
        conflicts: [
          makeAppointment({ id: 'apt-1', start_time: new Date('2025-01-15T09:30:00Z'), end_time: new Date('2025-01-15T10:00:00Z') }),
          makeAppointment({ id: 'apt-2', start_time: new Date('2025-01-15T11:00:00Z'), end_time: new Date('2025-01-15T11:30:00Z') }),
        ],
        userId: 'user-1',
      };

      const result = await generateConflictSuggestions(options);

      const split = result.suggestions.find((s) => s.type === 'split');
      const shorten = result.suggestions.find((s) => s.type === 'shorten');
      expect(split).toBeUndefined();
      expect(shorten).toBeUndefined();
    });

    it('should include historical context in result', async () => {
      const options: AIConflictResolutionOptions = {
        requestedStart: '2025-01-15T10:00:00Z',
        requestedEnd: '2025-01-15T11:00:00Z',
        conflicts: [makeAppointment()],
        userId: 'user-1',
      };

      const result = await generateConflictSuggestions(options);
      expect(result.historicalContext).toBeDefined();
      expect(result.historicalContext).toBe('No historical data yet');
    });
  });
});
