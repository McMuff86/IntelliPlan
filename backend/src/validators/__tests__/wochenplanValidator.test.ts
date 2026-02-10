import { describe, it, expect } from 'vitest';
import { validationResult } from 'express-validator';
import {
  conflictsValidator,
  quickAssignValidator,
  copyWeekValidator,
  unassignedValidator,
  phaseMatrixValidator,
  resourceScheduleValidator,
  resourcesOverviewValidator,
} from '../wochenplanValidator';

// Helper to run validators against mock request
async function runValidators(validators: any[], req: any) {
  for (const validator of validators) {
    await validator.run(req);
  }
  return validationResult(req);
}

function mockRequest(
  query: Record<string, string> = {},
  params: Record<string, string> = {},
  body: Record<string, any> = {}
) {
  return { query, params, body };
}

// ═══════════════════════════════════════════════════════
// conflictsValidator
// ═══════════════════════════════════════════════════════

describe('conflictsValidator', () => {
  it('should pass with valid kw and year', async () => {
    const req = mockRequest({ kw: '6', year: '2026' });
    const result = await runValidators(conflictsValidator, req);
    expect(result.isEmpty()).toBe(true);
  });

  it('should fail when kw is missing', async () => {
    const req = mockRequest({ year: '2026' });
    const result = await runValidators(conflictsValidator, req);
    expect(result.isEmpty()).toBe(false);
    expect(result.array().some((e: any) => e.path === 'kw')).toBe(true);
  });

  it('should fail when kw is out of range', async () => {
    const req = mockRequest({ kw: '54', year: '2026' });
    const result = await runValidators(conflictsValidator, req);
    expect(result.isEmpty()).toBe(false);
  });

  it('should fail when year is out of range', async () => {
    const req = mockRequest({ kw: '6', year: '2019' });
    const result = await runValidators(conflictsValidator, req);
    expect(result.isEmpty()).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════
// quickAssignValidator
// ═══════════════════════════════════════════════════════

describe('quickAssignValidator', () => {
  it('should pass with valid assignments', async () => {
    const req = mockRequest({}, {}, {
      assignments: [{
        taskId: '123e4567-e89b-12d3-a456-426614174000',
        resourceId: '123e4567-e89b-12d3-a456-426614174001',
        date: '2026-02-02',
        halfDay: 'morning',
      }],
    });
    const result = await runValidators(quickAssignValidator, req);
    expect(result.isEmpty()).toBe(true);
  });

  it('should fail with empty assignments array', async () => {
    const req = mockRequest({}, {}, { assignments: [] });
    const result = await runValidators(quickAssignValidator, req);
    expect(result.isEmpty()).toBe(false);
  });

  it('should fail with invalid halfDay', async () => {
    const req = mockRequest({}, {}, {
      assignments: [{
        taskId: '123e4567-e89b-12d3-a456-426614174000',
        resourceId: '123e4567-e89b-12d3-a456-426614174001',
        date: '2026-02-02',
        halfDay: 'invalid',
      }],
    });
    const result = await runValidators(quickAssignValidator, req);
    expect(result.isEmpty()).toBe(false);
  });

  it('should fail with invalid UUID for taskId', async () => {
    const req = mockRequest({}, {}, {
      assignments: [{
        taskId: 'not-uuid',
        resourceId: '123e4567-e89b-12d3-a456-426614174001',
        date: '2026-02-02',
        halfDay: 'morning',
      }],
    });
    const result = await runValidators(quickAssignValidator, req);
    expect(result.isEmpty()).toBe(false);
  });

  it('should pass with optional isFixed and statusCode', async () => {
    const req = mockRequest({}, {}, {
      assignments: [{
        taskId: '123e4567-e89b-12d3-a456-426614174000',
        resourceId: '123e4567-e89b-12d3-a456-426614174001',
        date: '2026-02-02',
        halfDay: 'morning',
        isFixed: true,
        statusCode: 'training',
      }],
    });
    const result = await runValidators(quickAssignValidator, req);
    expect(result.isEmpty()).toBe(true);
  });

  it('should fail with invalid statusCode', async () => {
    const req = mockRequest({}, {}, {
      assignments: [{
        taskId: '123e4567-e89b-12d3-a456-426614174000',
        resourceId: '123e4567-e89b-12d3-a456-426614174001',
        date: '2026-02-02',
        halfDay: 'morning',
        statusCode: 'invalid_status',
      }],
    });
    const result = await runValidators(quickAssignValidator, req);
    expect(result.isEmpty()).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════
// copyWeekValidator
// ═══════════════════════════════════════════════════════

describe('copyWeekValidator', () => {
  it('should pass with valid source and target', async () => {
    const req = mockRequest({}, {}, {
      sourceKw: 6,
      sourceYear: 2026,
      targetKw: 7,
      targetYear: 2026,
    });
    const result = await runValidators(copyWeekValidator, req);
    expect(result.isEmpty()).toBe(true);
  });

  it('should fail when sourceKw is missing', async () => {
    const req = mockRequest({}, {}, {
      sourceYear: 2026,
      targetKw: 7,
      targetYear: 2026,
    });
    const result = await runValidators(copyWeekValidator, req);
    expect(result.isEmpty()).toBe(false);
  });

  it('should pass with options', async () => {
    const req = mockRequest({}, {}, {
      sourceKw: 6,
      sourceYear: 2026,
      targetKw: 7,
      targetYear: 2026,
      options: { includeAssignments: true },
    });
    const result = await runValidators(copyWeekValidator, req);
    expect(result.isEmpty()).toBe(true);
  });

  it('should fail with kw out of range', async () => {
    const req = mockRequest({}, {}, {
      sourceKw: 0,
      sourceYear: 2026,
      targetKw: 7,
      targetYear: 2026,
    });
    const result = await runValidators(copyWeekValidator, req);
    expect(result.isEmpty()).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════
// unassignedValidator
// ═══════════════════════════════════════════════════════

describe('unassignedValidator', () => {
  it('should pass with valid kw and year', async () => {
    const req = mockRequest({ kw: '6', year: '2026' });
    const result = await runValidators(unassignedValidator, req);
    expect(result.isEmpty()).toBe(true);
  });

  it('should fail when kw is missing', async () => {
    const req = mockRequest({ year: '2026' });
    const result = await runValidators(unassignedValidator, req);
    expect(result.isEmpty()).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════
// phaseMatrixValidator
// ═══════════════════════════════════════════════════════

describe('phaseMatrixValidator', () => {
  it('should pass with valid from_kw, to_kw, year', async () => {
    const req = mockRequest({ from_kw: '4', to_kw: '10', year: '2026' });
    const result = await runValidators(phaseMatrixValidator, req);
    expect(result.isEmpty()).toBe(true);
  });

  it('should fail when from_kw is missing', async () => {
    const req = mockRequest({ to_kw: '10', year: '2026' });
    const result = await runValidators(phaseMatrixValidator, req);
    expect(result.isEmpty()).toBe(false);
  });

  it('should allow to_kw < from_kw for year-wrapping cases', async () => {
    const req = mockRequest({ from_kw: '51', to_kw: '5', year: '2026', from_year: '2025', to_year: '2026' });
    const result = await runValidators(phaseMatrixValidator, req);
    expect(result.isEmpty()).toBe(true);
  });

  it('should allow ranges that would exceed 26 weeks in same year', async () => {
    const req = mockRequest({ from_kw: '1', to_kw: '30', year: '2026' });
    const result = await runValidators(phaseMatrixValidator, req);
    expect(result.isEmpty()).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════
// resourceScheduleValidator
// ═══════════════════════════════════════════════════════

describe('resourceScheduleValidator', () => {
  it('should pass with valid resourceId, kw, year', async () => {
    const req = mockRequest(
      { kw: '6', year: '2026' },
      { resourceId: '123e4567-e89b-12d3-a456-426614174000' }
    );
    const result = await runValidators(resourceScheduleValidator, req);
    expect(result.isEmpty()).toBe(true);
  });

  it('should fail with invalid UUID for resourceId', async () => {
    const req = mockRequest(
      { kw: '6', year: '2026' },
      { resourceId: 'not-a-uuid' }
    );
    const result = await runValidators(resourceScheduleValidator, req);
    expect(result.isEmpty()).toBe(false);
    expect(result.array().some((e: any) => e.path === 'resourceId')).toBe(true);
  });

  it('should fail when kw is missing', async () => {
    const req = mockRequest(
      { year: '2026' },
      { resourceId: '123e4567-e89b-12d3-a456-426614174000' }
    );
    const result = await runValidators(resourceScheduleValidator, req);
    expect(result.isEmpty()).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════
// resourcesOverviewValidator
// ═══════════════════════════════════════════════════════

describe('resourcesOverviewValidator', () => {
  it('should pass with valid kw and year', async () => {
    const req = mockRequest({ kw: '6', year: '2026' });
    const result = await runValidators(resourcesOverviewValidator, req);
    expect(result.isEmpty()).toBe(true);
  });

  it('should pass with optional department filter', async () => {
    const req = mockRequest({ kw: '6', year: '2026', department: 'montage' });
    const result = await runValidators(resourcesOverviewValidator, req);
    expect(result.isEmpty()).toBe(true);
  });

  it('should fail with invalid department', async () => {
    const req = mockRequest({ kw: '6', year: '2026', department: 'invalid' });
    const result = await runValidators(resourcesOverviewValidator, req);
    expect(result.isEmpty()).toBe(false);
    expect(result.array().some((e: any) => e.path === 'department')).toBe(true);
  });

  it('should fail when kw is missing', async () => {
    const req = mockRequest({ year: '2026' });
    const result = await runValidators(resourcesOverviewValidator, req);
    expect(result.isEmpty()).toBe(false);
  });
});
