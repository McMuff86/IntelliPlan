import { describe, it, expect } from 'vitest';
import { validationResult } from 'express-validator';
import {
  createAppointmentValidator,
  updateAppointmentValidator,
} from '../appointmentValidator';

// Helper to run validators against a mock request
async function runValidation(validators: any[], body: Record<string, any>) {
  const req = { body } as any;
  const res = {} as any;
  const next = () => {};

  for (const validator of validators) {
    await validator.run(req);
  }

  return validationResult(req);
}

describe('appointmentValidator', () => {
  describe('createAppointmentValidator', () => {
    it('should pass with valid data', async () => {
      const result = await runValidation(createAppointmentValidator, {
        title: 'Team Meeting',
        startTime: '2025-01-15T10:00:00Z',
        endTime: '2025-01-15T11:00:00Z',
      });

      expect(result.isEmpty()).toBe(true);
    });

    it('should fail when title is missing', async () => {
      const result = await runValidation(createAppointmentValidator, {
        startTime: '2025-01-15T10:00:00Z',
        endTime: '2025-01-15T11:00:00Z',
      });

      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some((e: any) => e.path === 'title')).toBe(true);
    });

    it('should fail when title is empty string', async () => {
      const result = await runValidation(createAppointmentValidator, {
        title: '',
        startTime: '2025-01-15T10:00:00Z',
        endTime: '2025-01-15T11:00:00Z',
      });

      expect(result.isEmpty()).toBe(false);
    });

    it('should fail when startTime is missing', async () => {
      const result = await runValidation(createAppointmentValidator, {
        title: 'Meeting',
        endTime: '2025-01-15T11:00:00Z',
      });

      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some((e: any) => e.path === 'startTime')).toBe(true);
    });

    it('should fail when endTime is missing', async () => {
      const result = await runValidation(createAppointmentValidator, {
        title: 'Meeting',
        startTime: '2025-01-15T10:00:00Z',
      });

      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some((e: any) => e.path === 'endTime')).toBe(true);
    });

    it('should fail when startTime is not ISO 8601', async () => {
      const result = await runValidation(createAppointmentValidator, {
        title: 'Meeting',
        startTime: 'not-a-date',
        endTime: '2025-01-15T11:00:00Z',
      });

      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      const startError = errors.find((e: any) => e.path === 'startTime');
      expect(startError).toBeDefined();
      expect(startError!.msg).toContain('ISO 8601');
    });

    it('should fail when endTime is not ISO 8601', async () => {
      const result = await runValidation(createAppointmentValidator, {
        title: 'Meeting',
        startTime: '2025-01-15T10:00:00Z',
        endTime: 'not-a-date',
      });

      expect(result.isEmpty()).toBe(false);
    });

    it('should fail when endTime is before startTime', async () => {
      const result = await runValidation(createAppointmentValidator, {
        title: 'Meeting',
        startTime: '2025-01-15T11:00:00Z',
        endTime: '2025-01-15T10:00:00Z',
      });

      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      const endError = errors.find((e: any) => e.path === 'endTime');
      expect(endError).toBeDefined();
      expect(endError!.msg).toContain('after start time');
    });

    it('should fail when endTime equals startTime', async () => {
      const result = await runValidation(createAppointmentValidator, {
        title: 'Meeting',
        startTime: '2025-01-15T10:00:00Z',
        endTime: '2025-01-15T10:00:00Z',
      });

      expect(result.isEmpty()).toBe(false);
    });

    it('should accept optional description', async () => {
      const result = await runValidation(createAppointmentValidator, {
        title: 'Meeting',
        description: 'Some description here',
        startTime: '2025-01-15T10:00:00Z',
        endTime: '2025-01-15T11:00:00Z',
      });

      expect(result.isEmpty()).toBe(true);
    });

    it('should accept optional timezone', async () => {
      const result = await runValidation(createAppointmentValidator, {
        title: 'Meeting',
        startTime: '2025-01-15T10:00:00Z',
        endTime: '2025-01-15T11:00:00Z',
        timezone: 'Europe/Zurich',
      });

      expect(result.isEmpty()).toBe(true);
    });

    it('should fail when title exceeds 255 characters', async () => {
      const result = await runValidation(createAppointmentValidator, {
        title: 'A'.repeat(256),
        startTime: '2025-01-15T10:00:00Z',
        endTime: '2025-01-15T11:00:00Z',
      });

      expect(result.isEmpty()).toBe(false);
    });
  });

  describe('updateAppointmentValidator', () => {
    it('should pass with all fields optional', async () => {
      const result = await runValidation(updateAppointmentValidator, {});
      expect(result.isEmpty()).toBe(true);
    });

    it('should pass with valid partial update', async () => {
      const result = await runValidation(updateAppointmentValidator, {
        title: 'Updated Title',
      });

      expect(result.isEmpty()).toBe(true);
    });

    it('should fail with invalid startTime format', async () => {
      const result = await runValidation(updateAppointmentValidator, {
        startTime: 'invalid',
      });

      expect(result.isEmpty()).toBe(false);
    });

    it('should fail when endTime is before startTime on update', async () => {
      const result = await runValidation(updateAppointmentValidator, {
        startTime: '2025-01-15T11:00:00Z',
        endTime: '2025-01-15T10:00:00Z',
      });

      expect(result.isEmpty()).toBe(false);
    });
  });
});
