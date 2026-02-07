import { describe, it, expect } from 'vitest';
import { validationResult } from 'express-validator';
import {
  capacityQueryValidator,
  capacityDepartmentValidator,
  capacityResourceValidator,
} from '../capacityValidator';

// Helper to run validators against mock request
async function runValidators(validators: any[], req: any) {
  for (const validator of validators) {
    await validator.run(req);
  }
  return validationResult(req);
}

function mockRequest(query: Record<string, string> = {}, params: Record<string, string> = {}) {
  return {
    query,
    params,
    body: {},
  };
}

describe('capacityQueryValidator', () => {
  it('should pass with valid from and to dates', async () => {
    const req = mockRequest({ from: '2026-02-09', to: '2026-02-13' });
    const result = await runValidators(capacityQueryValidator, req);
    expect(result.isEmpty()).toBe(true);
  });

  it('should fail when from is missing', async () => {
    const req = mockRequest({ to: '2026-02-13' });
    const result = await runValidators(capacityQueryValidator, req);
    expect(result.isEmpty()).toBe(false);
    const errors = result.array();
    expect(errors.some((e: any) => e.path === 'from')).toBe(true);
  });

  it('should fail when to is missing', async () => {
    const req = mockRequest({ from: '2026-02-09' });
    const result = await runValidators(capacityQueryValidator, req);
    expect(result.isEmpty()).toBe(false);
    const errors = result.array();
    expect(errors.some((e: any) => e.path === 'to')).toBe(true);
  });

  it('should fail when from is not a valid date', async () => {
    const req = mockRequest({ from: 'not-a-date', to: '2026-02-13' });
    const result = await runValidators(capacityQueryValidator, req);
    expect(result.isEmpty()).toBe(false);
  });

  it('should fail when to is before from', async () => {
    const req = mockRequest({ from: '2026-02-13', to: '2026-02-09' });
    const result = await runValidators(capacityQueryValidator, req);
    expect(result.isEmpty()).toBe(false);
    const errors = result.array();
    expect(errors.some((e: any) => e.msg?.includes('on or after'))).toBe(true);
  });

  it('should fail when date range exceeds 31 days', async () => {
    const req = mockRequest({ from: '2026-01-01', to: '2026-02-15' });
    const result = await runValidators(capacityQueryValidator, req);
    expect(result.isEmpty()).toBe(false);
    const errors = result.array();
    expect(errors.some((e: any) => e.msg?.includes('31 days'))).toBe(true);
  });
});

describe('capacityDepartmentValidator', () => {
  it('should pass with valid department', async () => {
    const req = mockRequest({ from: '2026-02-09', to: '2026-02-13' }, { dept: 'produktion' });
    const result = await runValidators(capacityDepartmentValidator, req);
    expect(result.isEmpty()).toBe(true);
  });

  it('should fail with invalid department', async () => {
    const req = mockRequest({ from: '2026-02-09', to: '2026-02-13' }, { dept: 'invalid-dept' });
    const result = await runValidators(capacityDepartmentValidator, req);
    expect(result.isEmpty()).toBe(false);
    const errors = result.array();
    expect(errors.some((e: any) => e.path === 'dept')).toBe(true);
  });
});

describe('capacityResourceValidator', () => {
  it('should pass with valid UUID', async () => {
    const req = mockRequest(
      { from: '2026-02-09', to: '2026-02-13' },
      { id: '123e4567-e89b-12d3-a456-426614174000' }
    );
    const result = await runValidators(capacityResourceValidator, req);
    expect(result.isEmpty()).toBe(true);
  });

  it('should fail with invalid UUID', async () => {
    const req = mockRequest(
      { from: '2026-02-09', to: '2026-02-13' },
      { id: 'not-a-uuid' }
    );
    const result = await runValidators(capacityResourceValidator, req);
    expect(result.isEmpty()).toBe(false);
    const errors = result.array();
    expect(errors.some((e: any) => e.path === 'id')).toBe(true);
  });
});
