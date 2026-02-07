import { describe, it, expect } from 'vitest';
import { validationResult } from 'express-validator';
import {
  createTaskAssignmentValidator,
  updateTaskAssignmentValidator,
  listAssignmentsQueryValidator,
} from '../taskAssignmentValidator';

// Helper to run validators against mock request
async function runValidators(validators: any[], body: Record<string, unknown> = {}, query: Record<string, unknown> = {}) {
  const req: any = { body, query, params: {} };
  const res: any = {};
  for (const validator of validators) {
    await validator.run(req);
  }
  return validationResult(req);
}

describe('taskAssignmentValidator', () => {
  describe('createTaskAssignmentValidator', () => {
    it('should pass with valid required fields', async () => {
      const result = await runValidators(createTaskAssignmentValidator, {
        resourceId: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
        assignmentDate: '2026-02-09',
        halfDay: 'morning',
      });
      expect(result.isEmpty()).toBe(true);
    });

    it('should pass with all fields', async () => {
      const result = await runValidators(createTaskAssignmentValidator, {
        resourceId: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
        assignmentDate: '2026-02-09',
        halfDay: 'full_day',
        notes: 'Fix ab 06:00 Uhr',
        isFixed: true,
        startTime: '06:00',
      });
      expect(result.isEmpty()).toBe(true);
    });

    it('should fail when resourceId is missing', async () => {
      const result = await runValidators(createTaskAssignmentValidator, {
        assignmentDate: '2026-02-09',
        halfDay: 'morning',
      });
      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some((e: any) => e.path === 'resourceId')).toBe(true);
    });

    it('should fail with invalid UUID for resourceId', async () => {
      const result = await runValidators(createTaskAssignmentValidator, {
        resourceId: 'not-a-uuid',
        assignmentDate: '2026-02-09',
        halfDay: 'morning',
      });
      expect(result.isEmpty()).toBe(false);
    });

    it('should fail when assignmentDate is missing', async () => {
      const result = await runValidators(createTaskAssignmentValidator, {
        resourceId: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
        halfDay: 'morning',
      });
      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some((e: any) => e.path === 'assignmentDate')).toBe(true);
    });

    it('should fail with invalid date for assignmentDate', async () => {
      const result = await runValidators(createTaskAssignmentValidator, {
        resourceId: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
        assignmentDate: 'not-a-date',
        halfDay: 'morning',
      });
      expect(result.isEmpty()).toBe(false);
    });

    it('should fail when halfDay is missing', async () => {
      const result = await runValidators(createTaskAssignmentValidator, {
        resourceId: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
        assignmentDate: '2026-02-09',
      });
      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some((e: any) => e.path === 'halfDay')).toBe(true);
    });

    it('should fail with invalid halfDay value', async () => {
      const result = await runValidators(createTaskAssignmentValidator, {
        resourceId: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
        assignmentDate: '2026-02-09',
        halfDay: 'evening',
      });
      expect(result.isEmpty()).toBe(false);
    });

    it('should accept all valid halfDay values', async () => {
      for (const halfDay of ['morning', 'afternoon', 'full_day']) {
        const result = await runValidators(createTaskAssignmentValidator, {
          resourceId: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
          assignmentDate: '2026-02-09',
          halfDay,
        });
        expect(result.isEmpty()).toBe(true);
      }
    });

    it('should fail with invalid startTime format', async () => {
      const result = await runValidators(createTaskAssignmentValidator, {
        resourceId: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
        assignmentDate: '2026-02-09',
        halfDay: 'morning',
        startTime: '25:00',
      });
      expect(result.isEmpty()).toBe(false);
    });

    it('should accept valid startTime with seconds', async () => {
      const result = await runValidators(createTaskAssignmentValidator, {
        resourceId: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
        assignmentDate: '2026-02-09',
        halfDay: 'morning',
        startTime: '06:30:00',
      });
      expect(result.isEmpty()).toBe(true);
    });

    it('should fail with too long notes', async () => {
      const result = await runValidators(createTaskAssignmentValidator, {
        resourceId: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
        assignmentDate: '2026-02-09',
        halfDay: 'morning',
        notes: 'x'.repeat(2001),
      });
      expect(result.isEmpty()).toBe(false);
    });
  });

  describe('updateTaskAssignmentValidator', () => {
    it('should pass with no fields (empty update is valid)', async () => {
      const result = await runValidators(updateTaskAssignmentValidator, {});
      expect(result.isEmpty()).toBe(true);
    });

    it('should pass with valid partial update', async () => {
      const result = await runValidators(updateTaskAssignmentValidator, {
        isFixed: true,
        notes: 'Updated',
      });
      expect(result.isEmpty()).toBe(true);
    });

    it('should fail with invalid halfDay on update', async () => {
      const result = await runValidators(updateTaskAssignmentValidator, {
        halfDay: 'invalid',
      });
      expect(result.isEmpty()).toBe(false);
    });

    it('should pass with valid halfDay update', async () => {
      const result = await runValidators(updateTaskAssignmentValidator, {
        halfDay: 'afternoon',
      });
      expect(result.isEmpty()).toBe(true);
    });
  });

  describe('listAssignmentsQueryValidator', () => {
    it('should pass with no query params', async () => {
      const result = await runValidators(listAssignmentsQueryValidator, {}, {});
      expect(result.isEmpty()).toBe(true);
    });

    it('should pass with valid date range', async () => {
      const result = await runValidators(listAssignmentsQueryValidator, {}, {
        from: '2026-02-09',
        to: '2026-02-13',
      });
      expect(result.isEmpty()).toBe(true);
    });

    it('should pass with valid resource_id', async () => {
      const result = await runValidators(listAssignmentsQueryValidator, {}, {
        resource_id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
      });
      expect(result.isEmpty()).toBe(true);
    });

    it('should fail with invalid from date', async () => {
      const result = await runValidators(listAssignmentsQueryValidator, {}, {
        from: 'not-a-date',
      });
      expect(result.isEmpty()).toBe(false);
    });

    it('should fail with invalid resource_id', async () => {
      const result = await runValidators(listAssignmentsQueryValidator, {}, {
        resource_id: 'not-uuid',
      });
      expect(result.isEmpty()).toBe(false);
    });

    it('should fail with limit > 500', async () => {
      const result = await runValidators(listAssignmentsQueryValidator, {}, {
        limit: '600',
      });
      expect(result.isEmpty()).toBe(false);
    });

    it('should fail with negative offset', async () => {
      const result = await runValidators(listAssignmentsQueryValidator, {}, {
        offset: '-1',
      });
      expect(result.isEmpty()).toBe(false);
    });

    it('should pass with valid pagination', async () => {
      const result = await runValidators(listAssignmentsQueryValidator, {}, {
        limit: '50',
        offset: '10',
      });
      expect(result.isEmpty()).toBe(true);
    });
  });
});
