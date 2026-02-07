import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database pool
vi.mock('../../config/database', () => ({
  pool: {
    query: vi.fn(),
  },
}));

import {
  createPendenz,
  getPendenzById,
  listPendenzen,
  updatePendenz,
  archivePendenz,
  createHistorieEntry,
  getHistorie,
  detectChanges,
} from '../pendenzService';
import { pool } from '../../config/database';
import type { Pendenz } from '../../models/pendenz';

const mockedPool = vi.mocked(pool);

const mockPendenz: Pendenz = {
  id: 'pend-1',
  project_id: 'proj-1',
  nr: 1,
  beschreibung: 'Gummidichtungen montieren',
  bereich: 'montage',
  verantwortlich_id: 'user-2',
  erfasst_von_id: 'user-1',
  prioritaet: 'hoch',
  status: 'offen',
  faellig_bis: '2026-02-05',
  erledigt_am: null,
  bemerkungen: 'Verzug durch Lieferant',
  auftragsnummer: '25.0591-001',
  kategorie: 'projekt',
  created_at: '2026-02-04T10:00:00Z',
  updated_at: '2026-02-04T10:00:00Z',
  archived_at: null,
};

const mockPendenzWithNames = {
  ...mockPendenz,
  verantwortlich_name: 'Veli',
  erfasst_von_name: 'Adi',
};

describe('pendenzService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createPendenz', () => {
    it('should insert a pendenz with auto-incremented nr', async () => {
      // First call: getNextNr
      mockedPool.query.mockResolvedValueOnce({ rows: [{ max_nr: 5 }], rowCount: 1 } as any);
      // Second call: INSERT
      mockedPool.query.mockResolvedValueOnce({ rows: [mockPendenz], rowCount: 1 } as any);
      // Third call: re-fetch with names (getPendenzById)
      mockedPool.query.mockResolvedValueOnce({ rows: [mockPendenzWithNames], rowCount: 1 } as any);

      const result = await createPendenz({
        project_id: 'proj-1',
        erfasst_von_id: 'user-1',
        beschreibung: 'Gummidichtungen montieren',
        bereich: 'montage',
        verantwortlich_id: 'user-2',
        prioritaet: 'hoch',
        faellig_bis: '2026-02-05',
        bemerkungen: 'Verzug durch Lieferant',
        auftragsnummer: '25.0591-001',
      });

      expect(result.erfasst_von_name).toBe('Adi');
      expect(result.verantwortlich_name).toBe('Veli');

      // Check that nr was set to 6 (max_nr 5 + 1)
      const insertParams = mockedPool.query.mock.calls[1][1] as any[];
      expect(insertParams[1]).toBe(6); // nr
      expect(insertParams[2]).toBe('Gummidichtungen montieren');
    });

    it('should start nr at 1 for empty project', async () => {
      mockedPool.query.mockResolvedValueOnce({ rows: [{ max_nr: null }], rowCount: 1 } as any);
      mockedPool.query.mockResolvedValueOnce({ rows: [mockPendenz], rowCount: 1 } as any);
      mockedPool.query.mockResolvedValueOnce({ rows: [mockPendenzWithNames], rowCount: 1 } as any);

      await createPendenz({
        project_id: 'proj-1',
        erfasst_von_id: 'user-1',
        beschreibung: 'Test',
        bereich: 'avor',
      });

      const insertParams = mockedPool.query.mock.calls[1][1] as any[];
      expect(insertParams[1]).toBe(1); // nr starts at 1
    });

    it('should use default values for optional fields', async () => {
      mockedPool.query.mockResolvedValueOnce({ rows: [{ max_nr: null }], rowCount: 1 } as any);
      mockedPool.query.mockResolvedValueOnce({ rows: [mockPendenz], rowCount: 1 } as any);
      mockedPool.query.mockResolvedValueOnce({ rows: [mockPendenzWithNames], rowCount: 1 } as any);

      await createPendenz({
        project_id: 'proj-1',
        erfasst_von_id: 'user-1',
        beschreibung: 'Minimal pendenz',
        bereich: 'planung',
      });

      const insertParams = mockedPool.query.mock.calls[1][1] as any[];
      expect(insertParams[5]).toBe('user-1'); // erfasst_von_id
      expect(insertParams[6]).toBe('mittel'); // default prioritaet
      expect(insertParams[7]).toBeNull(); // faellig_bis
      expect(insertParams[8]).toBeNull(); // bemerkungen
      expect(insertParams[9]).toBeNull(); // auftragsnummer
      expect(insertParams[10]).toBe('projekt'); // default kategorie
    });
  });

  describe('getPendenzById', () => {
    it('should return pendenz with joined user names', async () => {
      mockedPool.query.mockResolvedValueOnce({ rows: [mockPendenzWithNames], rowCount: 1 } as any);

      const result = await getPendenzById('pend-1');

      expect(result).not.toBeNull();
      expect(result!.beschreibung).toBe('Gummidichtungen montieren');
      expect(result!.verantwortlich_name).toBe('Veli');
      expect(result!.erfasst_von_name).toBe('Adi');
    });

    it('should return null for non-existent pendenz', async () => {
      mockedPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      const result = await getPendenzById('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('listPendenzen', () => {
    it('should return paginated results with default filters', async () => {
      mockedPool.query.mockResolvedValueOnce({ rows: [{ count: '3' }], rowCount: 1 } as any);
      mockedPool.query.mockResolvedValueOnce({ rows: [mockPendenzWithNames], rowCount: 1 } as any);

      const result = await listPendenzen({ projectId: 'proj-1' });

      expect(result.total).toBe(3);
      expect(result.limit).toBe(50);
      expect(result.offset).toBe(0);
      expect(result.data).toHaveLength(1);
    });

    it('should apply status filter', async () => {
      mockedPool.query.mockResolvedValueOnce({ rows: [{ count: '1' }], rowCount: 1 } as any);
      mockedPool.query.mockResolvedValueOnce({ rows: [mockPendenzWithNames], rowCount: 1 } as any);

      await listPendenzen({ projectId: 'proj-1', status: 'offen' });

      const countQuery = mockedPool.query.mock.calls[0][0] as string;
      expect(countQuery).toContain('p.status = $2');
      const countParams = mockedPool.query.mock.calls[0][1] as any[];
      expect(countParams[1]).toBe('offen');
    });

    it('should apply ueberfaellig filter', async () => {
      mockedPool.query.mockResolvedValueOnce({ rows: [{ count: '1' }], rowCount: 1 } as any);
      mockedPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      await listPendenzen({ projectId: 'proj-1', ueberfaellig: true });

      const countQuery = mockedPool.query.mock.calls[0][0] as string;
      expect(countQuery).toContain('p.faellig_bis < CURRENT_DATE');
    });

    it('should apply custom sort', async () => {
      mockedPool.query.mockResolvedValueOnce({ rows: [{ count: '1' }], rowCount: 1 } as any);
      mockedPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      await listPendenzen({ projectId: 'proj-1', sort: '-erstellt_am' });

      const dataQuery = mockedPool.query.mock.calls[1][0] as string;
      expect(dataQuery).toContain('p.created_at DESC');
    });
  });

  describe('updatePendenz', () => {
    it('should update specified fields only', async () => {
      mockedPool.query.mockResolvedValueOnce({ rows: [mockPendenz], rowCount: 1 } as any);
      mockedPool.query.mockResolvedValueOnce({ rows: [mockPendenzWithNames], rowCount: 1 } as any);

      await updatePendenz('pend-1', { status: 'in_arbeit' });

      const updateQuery = mockedPool.query.mock.calls[0][0] as string;
      expect(updateQuery).toContain('status = $1');
      expect(updateQuery).toContain('erledigt_am = NULL'); // auto-clear when not erledigt
      const params = mockedPool.query.mock.calls[0][1] as any[];
      expect(params[0]).toBe('in_arbeit');
    });

    it('should auto-set erledigt_am when status becomes erledigt', async () => {
      mockedPool.query.mockResolvedValueOnce({ rows: [mockPendenz], rowCount: 1 } as any);
      mockedPool.query.mockResolvedValueOnce({ rows: [mockPendenzWithNames], rowCount: 1 } as any);

      await updatePendenz('pend-1', { status: 'erledigt' });

      const updateQuery = mockedPool.query.mock.calls[0][0] as string;
      expect(updateQuery).toContain('erledigt_am = CURRENT_DATE');
    });

    it('should return null for non-existent pendenz', async () => {
      mockedPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      const result = await updatePendenz('non-existent', { status: 'erledigt' });
      expect(result).toBeNull();
    });
  });

  describe('archivePendenz', () => {
    it('should set archived_at and return true', async () => {
      mockedPool.query.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any);

      const result = await archivePendenz('pend-1');
      expect(result).toBe(true);

      const query = mockedPool.query.mock.calls[0][0] as string;
      expect(query).toContain('archived_at = NOW()');
    });

    it('should return false for non-existent pendenz', async () => {
      mockedPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      const result = await archivePendenz('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('createHistorieEntry', () => {
    it('should insert a historie entry', async () => {
      mockedPool.query.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any);

      await createHistorieEntry({
        pendenzId: 'pend-1',
        userId: 'user-1',
        aktion: 'erstellt',
      });

      const params = mockedPool.query.mock.calls[0][1] as any[];
      expect(params[0]).toBe('pend-1');
      expect(params[1]).toBe('user-1');
      expect(params[2]).toBe('erstellt');
    });

    it('should handle field-level change tracking', async () => {
      mockedPool.query.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any);

      await createHistorieEntry({
        pendenzId: 'pend-1',
        userId: 'user-1',
        aktion: 'status_geaendert',
        feld: 'status',
        alterWert: 'offen',
        neuerWert: 'in_arbeit',
      });

      const params = mockedPool.query.mock.calls[0][1] as any[];
      expect(params[3]).toBe('status');
      expect(params[4]).toBe('offen');
      expect(params[5]).toBe('in_arbeit');
    });
  });

  describe('getHistorie', () => {
    it('should return historie entries ordered by timestamp', async () => {
      const mockHistorie = [
        { id: 'h-1', pendenz_id: 'pend-1', user_id: 'user-1', aktion: 'erstellt', feld: null, alter_wert: null, neuer_wert: null, created_at: '2026-02-04T10:00:00Z' },
        { id: 'h-2', pendenz_id: 'pend-1', user_id: 'user-1', aktion: 'status_geaendert', feld: 'status', alter_wert: 'offen', neuer_wert: 'in_arbeit', created_at: '2026-02-04T11:00:00Z' },
      ];
      mockedPool.query.mockResolvedValueOnce({ rows: mockHistorie, rowCount: 2 } as any);

      const result = await getHistorie('pend-1');

      expect(result).toHaveLength(2);
      expect(result[0].aktion).toBe('erstellt');
    });
  });

  describe('detectChanges', () => {
    it('should detect status change', () => {
      const before: Pendenz = { ...mockPendenz, status: 'offen' };
      const after: Pendenz = { ...mockPendenz, status: 'in_arbeit' };

      const changes = detectChanges(before, after);

      expect(changes).toHaveLength(1);
      expect(changes[0]).toEqual({
        feld: 'status',
        alterWert: 'offen',
        neuerWert: 'in_arbeit',
      });
    });

    it('should detect multiple changes', () => {
      const before: Pendenz = { ...mockPendenz };
      const after: Pendenz = {
        ...mockPendenz,
        status: 'erledigt',
        prioritaet: 'niedrig',
        bemerkungen: 'Alles erledigt',
      };

      const changes = detectChanges(before, after);

      expect(changes).toHaveLength(3);
      const changedFields = changes.map(c => c.feld);
      expect(changedFields).toContain('status');
      expect(changedFields).toContain('prioritaet');
      expect(changedFields).toContain('bemerkungen');
    });

    it('should return empty array for no changes', () => {
      const changes = detectChanges(mockPendenz, { ...mockPendenz });
      expect(changes).toHaveLength(0);
    });

    it('should handle null to value change', () => {
      const before: Pendenz = { ...mockPendenz, erledigt_am: null };
      const after: Pendenz = { ...mockPendenz, erledigt_am: '2026-02-04' };

      const changes = detectChanges(before, after);

      expect(changes).toHaveLength(1);
      expect(changes[0]).toEqual({
        feld: 'erledigt_am',
        alterWert: null,
        neuerWert: '2026-02-04',
      });
    });
  });
});
