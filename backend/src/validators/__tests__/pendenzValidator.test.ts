import { describe, it, expect } from 'vitest';
import { validationResult } from 'express-validator';
import {
  createPendenzValidator,
  updatePendenzValidator,
  listPendenzenQueryValidator,
} from '../pendenzValidator';

// Helper to run validators against mock request
async function runValidators(validators: any[], body: Record<string, unknown> = {}, query: Record<string, unknown> = {}) {
  const req: any = { body, query, params: {} };
  const res: any = {};
  for (const validator of validators) {
    await validator.run(req);
  }
  return validationResult(req);
}

describe('pendenzValidator', () => {
  describe('createPendenzValidator', () => {
    it('should pass with valid required fields', async () => {
      const result = await runValidators(createPendenzValidator, {
        beschreibung: 'Dichtungen montieren',
        bereich: 'montage',
      });
      expect(result.isEmpty()).toBe(true);
    });

    it('should pass with all fields', async () => {
      const result = await runValidators(createPendenzValidator, {
        beschreibung: 'Dichtungen montieren',
        bereich: 'montage',
        verantwortlichId: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
        prioritaet: 'hoch',
        faelligBis: '2026-02-05',
        bemerkungen: 'Wichtig',
        auftragsnummer: '25.0591-001',
        kategorie: 'projekt',
      });
      expect(result.isEmpty()).toBe(true);
    });

    it('should fail when beschreibung is empty', async () => {
      const result = await runValidators(createPendenzValidator, {
        beschreibung: '',
        bereich: 'montage',
      });
      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some((e: any) => e.path === 'beschreibung')).toBe(true);
    });

    it('should fail when bereich is missing', async () => {
      const result = await runValidators(createPendenzValidator, {
        beschreibung: 'Test',
      });
      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some((e: any) => e.path === 'bereich')).toBe(true);
    });

    it('should fail with invalid bereich', async () => {
      const result = await runValidators(createPendenzValidator, {
        beschreibung: 'Test',
        bereich: 'invalid',
      });
      expect(result.isEmpty()).toBe(false);
    });

    it('should fail with invalid prioritaet', async () => {
      const result = await runValidators(createPendenzValidator, {
        beschreibung: 'Test',
        bereich: 'avor',
        prioritaet: 'urgent',
      });
      expect(result.isEmpty()).toBe(false);
    });

    it('should fail with invalid UUID for verantwortlichId', async () => {
      const result = await runValidators(createPendenzValidator, {
        beschreibung: 'Test',
        bereich: 'avor',
        verantwortlichId: 'not-a-uuid',
      });
      expect(result.isEmpty()).toBe(false);
    });

    it('should fail with invalid date for faelligBis', async () => {
      const result = await runValidators(createPendenzValidator, {
        beschreibung: 'Test',
        bereich: 'avor',
        faelligBis: 'not-a-date',
      });
      expect(result.isEmpty()).toBe(false);
    });

    it('should fail with too long auftragsnummer', async () => {
      const result = await runValidators(createPendenzValidator, {
        beschreibung: 'Test',
        bereich: 'avor',
        auftragsnummer: 'x'.repeat(51),
      });
      expect(result.isEmpty()).toBe(false);
    });
  });

  describe('updatePendenzValidator', () => {
    it('should pass with no fields (empty update is valid)', async () => {
      const result = await runValidators(updatePendenzValidator, {});
      expect(result.isEmpty()).toBe(true);
    });

    it('should pass with valid status change', async () => {
      const result = await runValidators(updatePendenzValidator, {
        status: 'erledigt',
      });
      expect(result.isEmpty()).toBe(true);
    });

    it('should fail with invalid status', async () => {
      const result = await runValidators(updatePendenzValidator, {
        status: 'done',
      });
      expect(result.isEmpty()).toBe(false);
    });

    it('should pass with valid kategorie', async () => {
      const result = await runValidators(updatePendenzValidator, {
        kategorie: 'allgemein',
      });
      expect(result.isEmpty()).toBe(true);
    });
  });

  describe('listPendenzenQueryValidator', () => {
    it('should pass with no query params', async () => {
      const result = await runValidators(listPendenzenQueryValidator, {}, {});
      expect(result.isEmpty()).toBe(true);
    });

    it('should pass with valid filters', async () => {
      const result = await runValidators(listPendenzenQueryValidator, {}, {
        status: 'offen',
        bereich: 'montage',
        sort: '-erstellt_am',
        limit: '20',
        offset: '0',
      });
      expect(result.isEmpty()).toBe(true);
    });

    it('should fail with invalid status filter', async () => {
      const result = await runValidators(listPendenzenQueryValidator, {}, {
        status: 'done',
      });
      expect(result.isEmpty()).toBe(false);
    });

    it('should fail with invalid sort', async () => {
      const result = await runValidators(listPendenzenQueryValidator, {}, {
        sort: 'invalid_field',
      });
      expect(result.isEmpty()).toBe(false);
    });

    it('should fail with limit > 200', async () => {
      const result = await runValidators(listPendenzenQueryValidator, {}, {
        limit: '300',
      });
      expect(result.isEmpty()).toBe(false);
    });

    it('should fail with invalid verantwortlich UUID', async () => {
      const result = await runValidators(listPendenzenQueryValidator, {}, {
        verantwortlich: 'not-uuid',
      });
      expect(result.isEmpty()).toBe(false);
    });
  });
});
