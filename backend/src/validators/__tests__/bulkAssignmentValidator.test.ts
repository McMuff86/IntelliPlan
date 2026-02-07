import { describe, it, expect } from 'vitest';
import { validationResult } from 'express-validator';
import {
  bulkAssignmentValidator,
  createTaskAssignmentValidator,
  updateTaskAssignmentValidator,
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

describe('bulkAssignmentValidator', () => {
  it('should pass with valid bulk assignments', async () => {
    const result = await runValidators(bulkAssignmentValidator, {
      assignments: [
        {
          taskId: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
          resourceId: '7c9e6679-7425-40de-944b-e07fc1f90ae8',
          dates: ['2026-02-09', '2026-02-10', '2026-02-11'],
          halfDay: 'full_day',
          isFixed: false,
        },
      ],
    });
    expect(result.isEmpty()).toBe(true);
  });

  it('should fail when assignments is empty', async () => {
    const result = await runValidators(bulkAssignmentValidator, {
      assignments: [],
    });
    expect(result.isEmpty()).toBe(false);
  });

  it('should fail when assignments is not an array', async () => {
    const result = await runValidators(bulkAssignmentValidator, {
      assignments: 'not-array',
    });
    expect(result.isEmpty()).toBe(false);
  });

  it('should fail when taskId is missing', async () => {
    const result = await runValidators(bulkAssignmentValidator, {
      assignments: [
        {
          resourceId: '7c9e6679-7425-40de-944b-e07fc1f90ae8',
          dates: ['2026-02-09'],
          halfDay: 'morning',
        },
      ],
    });
    expect(result.isEmpty()).toBe(false);
    const errors = result.array();
    expect(errors.some((e: any) => e.path === 'assignments[0].taskId')).toBe(true);
  });

  it('should fail with invalid UUID for resourceId', async () => {
    const result = await runValidators(bulkAssignmentValidator, {
      assignments: [
        {
          taskId: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
          resourceId: 'not-uuid',
          dates: ['2026-02-09'],
          halfDay: 'morning',
        },
      ],
    });
    expect(result.isEmpty()).toBe(false);
  });

  it('should fail when dates array is empty', async () => {
    const result = await runValidators(bulkAssignmentValidator, {
      assignments: [
        {
          taskId: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
          resourceId: '7c9e6679-7425-40de-944b-e07fc1f90ae8',
          dates: [],
          halfDay: 'morning',
        },
      ],
    });
    expect(result.isEmpty()).toBe(false);
  });

  it('should fail with invalid date in dates array', async () => {
    const result = await runValidators(bulkAssignmentValidator, {
      assignments: [
        {
          taskId: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
          resourceId: '7c9e6679-7425-40de-944b-e07fc1f90ae8',
          dates: ['2026-02-09', 'not-a-date'],
          halfDay: 'morning',
        },
      ],
    });
    expect(result.isEmpty()).toBe(false);
  });

  it('should fail with invalid halfDay', async () => {
    const result = await runValidators(bulkAssignmentValidator, {
      assignments: [
        {
          taskId: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
          resourceId: '7c9e6679-7425-40de-944b-e07fc1f90ae8',
          dates: ['2026-02-09'],
          halfDay: 'evening',
        },
      ],
    });
    expect(result.isEmpty()).toBe(false);
  });

  it('should accept valid statusCode in bulk', async () => {
    const result = await runValidators(bulkAssignmentValidator, {
      assignments: [
        {
          taskId: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
          resourceId: '7c9e6679-7425-40de-944b-e07fc1f90ae8',
          dates: ['2026-02-09'],
          halfDay: 'morning',
          statusCode: 'sick',
        },
      ],
    });
    expect(result.isEmpty()).toBe(true);
  });

  it('should reject invalid statusCode in bulk', async () => {
    const result = await runValidators(bulkAssignmentValidator, {
      assignments: [
        {
          taskId: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
          resourceId: '7c9e6679-7425-40de-944b-e07fc1f90ae8',
          dates: ['2026-02-09'],
          halfDay: 'morning',
          statusCode: 'INVALID',
        },
      ],
    });
    expect(result.isEmpty()).toBe(false);
  });

  it('should accept multiple assignments in array', async () => {
    const result = await runValidators(bulkAssignmentValidator, {
      assignments: [
        {
          taskId: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
          resourceId: '7c9e6679-7425-40de-944b-e07fc1f90ae8',
          dates: ['2026-02-09', '2026-02-10'],
          halfDay: 'morning',
        },
        {
          taskId: '7c9e6679-7425-40de-944b-e07fc1f90ae9',
          resourceId: '7c9e6679-7425-40de-944b-e07fc1f90aea',
          dates: ['2026-02-11'],
          halfDay: 'afternoon',
          isFixed: true,
        },
      ],
    });
    expect(result.isEmpty()).toBe(true);
  });
});

describe('statusCode validation on createTaskAssignment', () => {
  it('should pass with valid statusCode', async () => {
    for (const statusCode of ['assigned', 'available', 'sick', 'vacation', 'training', 'other']) {
      const result = await runValidators(createTaskAssignmentValidator, {
        resourceId: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
        assignmentDate: '2026-02-09',
        halfDay: 'morning',
        statusCode,
      });
      expect(result.isEmpty()).toBe(true);
    }
  });

  it('should fail with invalid statusCode', async () => {
    const result = await runValidators(createTaskAssignmentValidator, {
      resourceId: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
      assignmentDate: '2026-02-09',
      halfDay: 'morning',
      statusCode: 'INVALID_STATUS',
    });
    expect(result.isEmpty()).toBe(false);
  });

  it('should pass without statusCode (optional)', async () => {
    const result = await runValidators(createTaskAssignmentValidator, {
      resourceId: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
      assignmentDate: '2026-02-09',
      halfDay: 'morning',
    });
    expect(result.isEmpty()).toBe(true);
  });
});

describe('statusCode validation on updateTaskAssignment', () => {
  it('should pass with valid statusCode on update', async () => {
    const result = await runValidators(updateTaskAssignmentValidator, {
      statusCode: 'vacation',
    });
    expect(result.isEmpty()).toBe(true);
  });

  it('should fail with invalid statusCode on update', async () => {
    const result = await runValidators(updateTaskAssignmentValidator, {
      statusCode: 'FREI',
    });
    expect(result.isEmpty()).toBe(false);
  });
});
