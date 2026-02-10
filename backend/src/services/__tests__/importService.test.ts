import { describe, it, expect, vi, beforeEach } from 'vitest';
import ExcelJS from 'exceljs';

// Mock the database pool
vi.mock('../../config/database', () => ({
  pool: {
    query: vi.fn(),
    connect: vi.fn(),
  },
}));

import {
  parseWochenplanExcel,
  mapToIntelliPlan,
  validateImport,
  parseKwNumber,
  parseKwFromSheetName,
} from '../importService';
import type { ParsedWeekPlan, ImportPlan } from '../importService';
import { pool } from '../../config/database';

const mockedPool = vi.mocked(pool);

// ─── Helpers: Build Excel fixtures programmatically ────

async function buildTestExcel(options: {
  sheets: Array<{
    name: string;
    rows: (string | number | boolean | null)[][];
  }>;
}): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();

  for (const sheet of options.sheets) {
    const ws = workbook.addWorksheet(sheet.name);
    for (const rowData of sheet.rows) {
      ws.addRow(rowData);
    }
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Build a minimal KW-sheet with a ZUSCHNITT section and one order.
 */
function buildMinimalKwSheet(kw: number = 6, overrides?: {
  orderNumber?: string;
  customerName?: string;
  dayAssignments?: Record<number, string>; // colIndex → value
}): { name: string; rows: (string | number | boolean | null)[][] } {
  const orderNr = overrides?.orderNumber ?? '25.0591-201/004';
  const customer = overrides?.customerName ?? 'Kunde_006';

  // Row 1: KW header
  // Row 2: Column headers
  // Row 3: Section header
  // Row 4+: Order rows
  const rows: (string | number | boolean | null)[][] = [
    [`KW${String(kw).padStart(2, '0')} / 02.02. - 06.02.2026`],
    ['Auftragsnr.', 'SB', 'Kunde', 'Arbeit', 'Ort', null, 'KW ZUS', 'KW CNC', 'KW PROD', 'KW BEH', 'KW BESCHL', 'KW MONT'],
    ['Zuschnitt'], // Section header
  ];

  // Order row: cols A-AB (1-28)
  const orderRow: (string | number | boolean | null)[] = new Array(28).fill(null);
  orderRow[0] = orderNr;         // A: Auftragsnr.
  orderRow[1] = 'SB_60';        // B: Sachbearbeiter
  orderRow[2] = customer;        // C: Kunde
  orderRow[3] = 'Liftabschlusstüren 5.OG'; // D: Arbeit
  orderRow[4] = 'Mühlau';       // E: Ort
  orderRow[5] = `KW${kw}`;      // F: KW ZUS
  orderRow[6] = `KW${kw - 1}`;  // G: KW CNC
  orderRow[7] = `KW${kw - 1}`;  // H: KW PROD
  orderRow[8] = `KW${kw}`;      // I: KW BEH
  orderRow[9] = `KW${kw}`;      // J: KW BESCHL
  orderRow[10] = `KW${kw + 1}`; // K: KW MONT
  orderRow[11] = 6;              // L: Arbeiter (Tage)
  orderRow[12] = 2;              // M: Hilfskraft (Tage)
  orderRow[13] = 'RAL 9016';    // N: Farbe
  orderRow[14] = 'Kontakt_003'; // O: Kontakt
  orderRow[15] = '041 123 45 67'; // P: Tel
  orderRow[16] = 'Ja';          // Q: Anrufen?

  // Day columns (R=17, S=18, ..., AA=26) → 0-indexed: 17-26
  // R(18)=Mo AM, S(19)=Mo PM, T(20)=Di AM, U(21)=Di PM, ...
  if (overrides?.dayAssignments) {
    for (const [col, val] of Object.entries(overrides.dayAssignments)) {
      orderRow[parseInt(col) - 1] = val; // Convert 1-indexed to 0-indexed for array
    }
  } else {
    orderRow[17] = 'MA_13'; // R: Mo AM
    orderRow[18] = 'MA_13'; // S: Mo PM
    orderRow[19] = 'MA_28'; // T: Di AM
  }

  orderRow[27] = 'fix ab 08:00 Uhr'; // AB: Bemerkungen

  rows.push(orderRow);

  return { name: `KW${String(kw).padStart(2, '0')}`, rows };
}

// ─── Tests ─────────────────────────────────────────────

describe('importService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════
  // parseKwNumber
  // ═══════════════════════════════════════════════════════

  describe('parseKwNumber', () => {
    it('should parse "KW06" → 6', () => {
      expect(parseKwNumber('KW06')).toBe(6);
    });

    it('should parse "KW 06" → 6', () => {
      expect(parseKwNumber('KW 06')).toBe(6);
    });

    it('should parse "6" → 6', () => {
      expect(parseKwNumber('6')).toBe(6);
    });

    it('should parse "KW8" → 8', () => {
      expect(parseKwNumber('KW8')).toBe(8);
    });

    it('should parse "LW 4" (typo) → 4', () => {
      expect(parseKwNumber('LW 4')).toBe(4);
    });

    it('should return null for "-"', () => {
      expect(parseKwNumber('-')).toBeNull();
    });

    it('should return null for "0"', () => {
      expect(parseKwNumber('0')).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(parseKwNumber('')).toBeNull();
    });

    it('should return null for "02.02."', () => {
      expect(parseKwNumber('02.02.')).toBeNull();
    });

    it('should handle "53" as valid', () => {
      expect(parseKwNumber('53')).toBe(53);
    });

    it('should return null for "54" (out of range)', () => {
      expect(parseKwNumber('54')).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════
  // parseKwFromSheetName
  // ═══════════════════════════════════════════════════════

  describe('parseKwFromSheetName', () => {
    it('should parse "KW06" → 6', () => {
      expect(parseKwFromSheetName('KW06')).toBe(6);
    });

    it('should parse "KW 12" → 12', () => {
      expect(parseKwFromSheetName('KW 12')).toBe(12);
    });

    it('should return null for non-KW sheets', () => {
      expect(parseKwFromSheetName('Kapazität und Auslastung')).toBeNull();
      expect(parseKwFromSheetName('Dropdown')).toBeNull();
      expect(parseKwFromSheetName('Legende')).toBeNull();
    });

    it('should handle lowercase "kw06"', () => {
      expect(parseKwFromSheetName('kw06')).toBe(6);
    });
  });

  // ═══════════════════════════════════════════════════════
  // parseWochenplanExcel – Basic Parsing
  // ═══════════════════════════════════════════════════════

  describe('parseWochenplanExcel', () => {
    it('should parse a minimal Excel with one KW sheet', async () => {
      const buffer = await buildTestExcel({
        sheets: [buildMinimalKwSheet(6)],
      });

      const result = await parseWochenplanExcel(buffer);

      expect(result.sheets).toHaveLength(1);
      expect(result.sheets[0].kw).toBe(6);
      expect(result.sheets[0].sections).toHaveLength(1);
      expect(result.sheets[0].sections[0].sectionName).toBe('Zuschnitt');
      expect(result.sheets[0].sections[0].tasks).toHaveLength(1);
    });

    it('should parse order number from column A', async () => {
      const buffer = await buildTestExcel({
        sheets: [buildMinimalKwSheet(6, { orderNumber: '26.0076-201' })],
      });

      const result = await parseWochenplanExcel(buffer);
      const task = result.sheets[0].sections[0].tasks[0];

      expect(task.orderNumber).toBe('26.0076-201');
    });

    it('should parse customer name from column C', async () => {
      const buffer = await buildTestExcel({
        sheets: [buildMinimalKwSheet(6, { customerName: 'TestKunde_123' })],
      });

      const result = await parseWochenplanExcel(buffer);
      const task = result.sheets[0].sections[0].tasks[0];

      expect(task.customerName).toBe('TestKunde_123');
    });

    it('should parse MA assignments from day columns', async () => {
      const buffer = await buildTestExcel({
        sheets: [buildMinimalKwSheet(6)],
      });

      const result = await parseWochenplanExcel(buffer);
      const task = result.sheets[0].sections[0].tasks[0];

      expect(task.dayAssignments.length).toBeGreaterThan(0);

      const moMorning = task.dayAssignments.find(
        (a) => a.dayIndex === 0 && a.slot === 'morning'
      );
      expect(moMorning).toBeDefined();
      expect(moMorning!.resourceCode).toBe('MA_13');
    });

    it('should skip non-KW sheets (e.g., "Dropdown")', async () => {
      const buffer = await buildTestExcel({
        sheets: [
          buildMinimalKwSheet(6),
          { name: 'Dropdown', rows: [['A', 'B', 'C']] },
          { name: 'Kapazität und Auslastung', rows: [['Data']] },
        ],
      });

      const result = await parseWochenplanExcel(buffer);

      expect(result.sheets).toHaveLength(1);
      expect(result.sheets[0].kw).toBe(6);
    });

    it('should parse multiple KW sheets', async () => {
      const buffer = await buildTestExcel({
        sheets: [
          buildMinimalKwSheet(5),
          buildMinimalKwSheet(6),
          buildMinimalKwSheet(7),
        ],
      });

      const result = await parseWochenplanExcel(buffer);

      expect(result.sheets).toHaveLength(3);
      expect(result.sheets.map((s) => s.kw).sort()).toEqual([5, 6, 7]);
    });

    it('should collect all unique resource codes', async () => {
      const buffer = await buildTestExcel({
        sheets: [buildMinimalKwSheet(6)],
      });

      const result = await parseWochenplanExcel(buffer);

      expect(result.allResourceCodes).toContain('MA_13');
      expect(result.allResourceCodes).toContain('MA_28');
    });

    it('should skip "Total" and "Kapazität" rows', async () => {
      const sheet = buildMinimalKwSheet(6);
      // Add Total row after the order
      sheet.rows.push(['Total Auftragszeiten Zuschnitt', null, null, null, null, null, null, null, null, null, null, null, 12.5]);
      // Add Kapazität row
      sheet.rows.push(['Kapazität Zuschnitt', null, null, null, null, null, null, null, null, null, null, null, 10]);

      const buffer = await buildTestExcel({ sheets: [sheet] });
      const result = await parseWochenplanExcel(buffer);

      // Should still only have 1 task (the order), not the Total/Kapazität rows
      expect(result.sheets[0].sections[0].tasks).toHaveLength(1);
    });

    it('should not treat FREI as a resource assignment', async () => {
      const buffer = await buildTestExcel({
        sheets: [buildMinimalKwSheet(6, {
          dayAssignments: {
            18: 'FREI',  // Mo AM → should be ignored
            19: 'MA_13', // Mo PM → should be kept
          },
        })],
      });

      const result = await parseWochenplanExcel(buffer);
      const task = result.sheets[0].sections[0].tasks[0];

      const codes = task.dayAssignments.map((a) => a.resourceCode);
      expect(codes).not.toContain('FREI');
      expect(codes).toContain('MA_13');
    });

    it('should handle empty Excel gracefully', async () => {
      const buffer = await buildTestExcel({
        sheets: [{ name: 'KW01', rows: [['Header only']] }],
      });

      const result = await parseWochenplanExcel(buffer);

      expect(result.sheets).toHaveLength(0);
      expect(result.allResourceCodes).toHaveLength(0);
    });
  });

  // ═══════════════════════════════════════════════════════
  // mapToIntelliPlan
  // ═══════════════════════════════════════════════════════

  describe('mapToIntelliPlan', () => {
    it('should extract unique projects by order number', async () => {
      const buffer = await buildTestExcel({
        sheets: [buildMinimalKwSheet(6)],
      });

      const parsed = await parseWochenplanExcel(buffer);
      const plan = mapToIntelliPlan(parsed);

      expect(plan.projects).toHaveLength(1);
      expect(plan.projects[0].orderNumber).toBe('25.0591-201/004');
    });

    it('should deduplicate projects across sheets', async () => {
      // Same order in KW5 and KW6
      const sheet5 = buildMinimalKwSheet(5, { orderNumber: '25.0591-201/004' });
      const sheet6 = buildMinimalKwSheet(6, { orderNumber: '25.0591-201/004' });

      const buffer = await buildTestExcel({ sheets: [sheet5, sheet6] });
      const parsed = await parseWochenplanExcel(buffer);
      const plan = mapToIntelliPlan(parsed);

      // Should be 1 unique project
      expect(plan.projects).toHaveLength(1);
    });

    it('should create tasks per project per phase', async () => {
      const buffer = await buildTestExcel({
        sheets: [buildMinimalKwSheet(6)],
      });

      const parsed = await parseWochenplanExcel(buffer);
      const plan = mapToIntelliPlan(parsed);

      // Should have at least 1 task (for ZUS section)
      expect(plan.tasks.length).toBeGreaterThanOrEqual(1);
      expect(plan.tasks[0].phaseCode).toBe('ZUS');
    });

    it('should create phase schedules from KW columns', async () => {
      const buffer = await buildTestExcel({
        sheets: [buildMinimalKwSheet(6)],
      });

      const parsed = await parseWochenplanExcel(buffer);
      const plan = mapToIntelliPlan(parsed);

      expect(plan.phaseSchedules.length).toBeGreaterThan(0);

      // Should have phase schedules for ZUS, CNC, PROD, BEH, BESCHL, MONT
      const phases = plan.phaseSchedules.map((ps) => ps.phaseCode);
      expect(phases).toContain('ZUS');
      expect(phases).toContain('CNC');
    });

    it('should create assignments with correct dates', async () => {
      const buffer = await buildTestExcel({
        sheets: [buildMinimalKwSheet(6)],
      });

      const parsed = await parseWochenplanExcel(buffer);
      const plan = mapToIntelliPlan(parsed);

      expect(plan.assignments.length).toBeGreaterThan(0);

      // All assignments should be dates in KW6 2026 (Mon 2026-02-02 to Fri 2026-02-06)
      for (const a of plan.assignments) {
        expect(a.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    });

    it('should extract unique resources', async () => {
      const buffer = await buildTestExcel({
        sheets: [buildMinimalKwSheet(6)],
      });

      const parsed = await parseWochenplanExcel(buffer);
      const plan = mapToIntelliPlan(parsed);

      expect(plan.resources.length).toBeGreaterThan(0);

      const codes = plan.resources.map((r) => r.shortCode);
      expect(codes).toContain('MA_13');
    });

    it('should map project fields correctly', async () => {
      const buffer = await buildTestExcel({
        sheets: [buildMinimalKwSheet(6)],
      });

      const parsed = await parseWochenplanExcel(buffer);
      const plan = mapToIntelliPlan(parsed);

      const proj = plan.projects[0];
      expect(proj.sachbearbeiter).toBe('SB_60');
      expect(proj.customerName).toBe('Kunde_006');
      expect(proj.description).toBe('Liftabschlusstüren 5.OG');
      expect(proj.installationLocation).toBe('Mühlau');
      expect(proj.color).toBe('RAL 9016');
      expect(proj.needsCallback).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════
  // validateImport
  // ═══════════════════════════════════════════════════════

  describe('validateImport', () => {
    const makePlan = (overrides: Partial<ImportPlan> = {}): ImportPlan => ({
      projects: [
        {
          orderNumber: '25.0591-201/004',
          sachbearbeiter: 'SB_60',
          customerName: 'Kunde_006',
          description: 'Test',
          installationLocation: 'Ort',
          color: 'RAL 9016',
          contactName: 'Kontakt',
          contactPhone: '012 345 67 89',
          needsCallback: false,
          workerCount: 2,
          helperCount: 1,
          remarks: '',
        },
      ],
      tasks: [
        {
          orderNumber: '25.0591-201/004',
          phaseCode: 'ZUS',
          title: 'Zuschnitt',
          plannedWeek: 6,
          plannedYear: 2026,
        },
      ],
      phaseSchedules: [],
      assignments: [
        {
          orderNumber: '25.0591-201/004',
          phaseCode: 'ZUS',
          resourceCode: 'MA_13',
          date: '2026-02-02',
          halfDay: 'morning',
          isFixed: false,
          timeNote: null,
        },
      ],
      resources: [
        {
          shortCode: 'MA_13',
          name: 'MA_13',
          department: null,
          employeeType: 'internal',
          workRole: 'arbeiter',
        },
      ],
      ...overrides,
    });

    it('should return valid=true for a good plan', async () => {
      // Mock: no existing projects
      mockedPool.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any) // existing projects
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any); // known resources

      const validation = await validateImport(makePlan(), 'owner-1');

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should return error for empty plan', async () => {
      const validation = await validateImport(makePlan({
        projects: [],
        tasks: [],
        assignments: [],
        resources: [],
        phaseSchedules: [],
      }), 'owner-1');

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Keine Projekte im Import gefunden. Prüfen Sie das Excel-Format.');
    });

    it('should warn about existing projects', async () => {
      mockedPool.query
        .mockResolvedValueOnce({
          rows: [{ order_number: '25.0591-201/004' }],
          rowCount: 1,
        } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      const validation = await validateImport(makePlan(), 'owner-1');

      expect(validation.warnings.some((w) => w.includes('existieren bereits'))).toBe(true);
    });

    it('should warn about unknown resources', async () => {
      mockedPool.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any) // no existing projects
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any); // no known resources

      const validation = await validateImport(makePlan(), 'owner-1');

      expect(validation.warnings.some((w) => w.includes('unbekannte Mitarbeiter'))).toBe(true);
    });

    it('should include correct summary counts', async () => {
      mockedPool.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      const validation = await validateImport(makePlan(), 'owner-1');

      expect(validation.summary.projectCount).toBe(1);
      expect(validation.summary.taskCount).toBe(1);
      expect(validation.summary.resourceCount).toBe(1);
      expect(validation.summary.assignmentCount).toBe(1);
    });

    it('should scope validation queries by owner_id', async () => {
      mockedPool.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      await validateImport(makePlan(), 'owner-scope-1');

      const projectSql = mockedPool.query.mock.calls[0][0] as string;
      const projectParams = mockedPool.query.mock.calls[0][1] as unknown[];
      expect(projectSql).toContain('owner_id = $2');
      expect(projectParams[1]).toBe('owner-scope-1');

      const resourceSql = mockedPool.query.mock.calls[1][0] as string;
      const resourceParams = mockedPool.query.mock.calls[1][1] as unknown[];
      expect(resourceSql).toContain('owner_id = $2');
      expect(resourceParams[1]).toBe('owner-scope-1');
    });

    it('should detect duplicate assignments as warning', async () => {
      mockedPool.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      const plan = makePlan({
        assignments: [
          {
            orderNumber: '25.0591-201/004',
            phaseCode: 'ZUS',
            resourceCode: 'MA_13',
            date: '2026-02-02',
            halfDay: 'morning',
            isFixed: false,
            timeNote: null,
          },
          {
            orderNumber: '25.0591-201/004',
            phaseCode: 'PROD',
            resourceCode: 'MA_13',
            date: '2026-02-02',
            halfDay: 'morning',
            isFixed: false,
            timeNote: null,
          },
        ],
      });

      const validation = await validateImport(plan, 'owner-1');

      expect(validation.warnings.some((w) => w.includes('Doppelte Zuweisung'))).toBe(true);
    });

    it('should report weeksCovered correctly', async () => {
      mockedPool.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      const plan = makePlan({
        tasks: [
          { orderNumber: '25.0591-201/004', phaseCode: 'ZUS', title: 'ZUS', plannedWeek: 6, plannedYear: 2026 },
          { orderNumber: '25.0591-201/004', phaseCode: 'CNC', title: 'CNC', plannedWeek: 5, plannedYear: 2026 },
        ],
      });

      const validation = await validateImport(plan, 'owner-1');

      expect(validation.summary.weeksCovered).toEqual([5, 6]);
    });
  });

  // ═══════════════════════════════════════════════════════
  // Multiple sections
  // ═══════════════════════════════════════════════════════

  describe('parseWochenplanExcel – multiple sections', () => {
    it('should parse multiple sections in one sheet', async () => {
      const rows: (string | number | boolean | null)[][] = [
        [`KW06 / 02.02. - 06.02.2026`],
        ['Headers...'],
        ['Zuschnitt'],
      ];

      // Order in Zuschnitt
      const orderRow1: (string | number | boolean | null)[] = new Array(28).fill(null);
      orderRow1[0] = '25.0591-201/004';
      orderRow1[1] = 'SB_60';
      orderRow1[2] = 'Kunde_006';
      orderRow1[3] = 'Liftabschluss';
      rows.push(orderRow1);

      // CNC section
      rows.push(['CNC']);

      // Order in CNC
      const orderRow2: (string | number | boolean | null)[] = new Array(28).fill(null);
      orderRow2[0] = '25.0591-201/004';
      orderRow2[1] = 'SB_60';
      orderRow2[2] = 'Kunde_006';
      orderRow2[3] = 'Liftabschluss';
      rows.push(orderRow2);

      // Produktion section
      rows.push(['Produktion']);

      const orderRow3: (string | number | boolean | null)[] = new Array(28).fill(null);
      orderRow3[0] = '26.0001-001';
      orderRow3[1] = 'SB_61';
      orderRow3[2] = 'Kunde_123';
      orderRow3[3] = 'Küche';
      rows.push(orderRow3);

      const buffer = await buildTestExcel({
        sheets: [{ name: 'KW06', rows }],
      });

      const result = await parseWochenplanExcel(buffer);

      expect(result.sheets[0].sections).toHaveLength(3);
      expect(result.sheets[0].sections[0].sectionName).toBe('Zuschnitt');
      expect(result.sheets[0].sections[1].sectionName).toBe('CNC');
      expect(result.sheets[0].sections[2].sectionName).toBe('Produktion');
    });
  });

  // ═══════════════════════════════════════════════════════
  // Edge cases
  // ═══════════════════════════════════════════════════════

  describe('edge cases', () => {
    it('should handle Excel with only non-KW sheets', async () => {
      const buffer = await buildTestExcel({
        sheets: [
          { name: 'Dropdown', rows: [['A']] },
          { name: 'Legende', rows: [['B']] },
        ],
      });

      const result = await parseWochenplanExcel(buffer);
      expect(result.sheets).toHaveLength(0);
    });

    it('should handle KW with no valid order rows', async () => {
      const buffer = await buildTestExcel({
        sheets: [{
          name: 'KW10',
          rows: [
            ['KW10 Header'],
            ['Column heads'],
            ['Zuschnitt'],
            ['Not an order number', 'abc'],
            ['Another non-order', 'xyz'],
          ],
        }],
      });

      const result = await parseWochenplanExcel(buffer);
      // Sheet parsed but no valid sections (no tasks)
      expect(result.sheets).toHaveLength(0);
    });

    it('should infer resource info for Lehrling codes', async () => {
      const buffer = await buildTestExcel({
        sheets: [buildMinimalKwSheet(6, {
          dayAssignments: {
            18: 'Lehrling_01',
          },
        })],
      });

      const parsed = await parseWochenplanExcel(buffer);
      const plan = mapToIntelliPlan(parsed);

      const lehrling = plan.resources.find((r) => r.shortCode === 'Lehrling_01');
      expect(lehrling).toBeDefined();
      expect(lehrling!.employeeType).toBe('apprentice');
    });
  });
});
