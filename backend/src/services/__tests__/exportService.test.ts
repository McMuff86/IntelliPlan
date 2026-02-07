import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock wochenplanService
vi.mock('../wochenplanService', () => ({
  getWeekPlan: vi.fn(),
}));

import { exportWochenplanCSV } from '../exportService';
import { getWeekPlan } from '../wochenplanService';
import type { WeekPlanResponse } from '../wochenplanService';

const mockedGetWeekPlan = vi.mocked(getWeekPlan);

beforeEach(() => {
  vi.clearAllMocks();
});

function makeWeekPlan(overrides: Partial<WeekPlanResponse> = {}): WeekPlanResponse {
  return {
    kw: 6,
    year: 2026,
    dateRange: { from: '2026-02-02', to: '2026-02-06' },
    sections: [],
    capacitySummary: {
      totalAvailableHours: 0,
      totalPlannedHours: 0,
      utilizationPercent: 0,
      byDepartment: [],
    },
    ...overrides,
  };
}

describe('exportWochenplanCSV', () => {
  it('should return CSV header when no data', async () => {
    mockedGetWeekPlan.mockResolvedValueOnce(makeWeekPlan());

    const csv = await exportWochenplanCSV(6, 2026);

    expect(csv).toBe('OrderNumber,Customer,Description,Phase,Department,Date,HalfDay,Worker,Status,IsFixed,Notes');
  });

  it('should export morning and afternoon assignments', async () => {
    mockedGetWeekPlan.mockResolvedValueOnce(makeWeekPlan({
      sections: [{
        department: 'montage',
        label: 'Montage',
        tasks: [{
          taskId: 'task-1',
          projectOrderNumber: '2026-001',
          sachbearbeiter: 'MH',
          customerName: 'Müller AG',
          description: 'Küche einbauen',
          installationLocation: 'Zürich',
          phases: [{ phase: 'MONT', plannedKw: 6 }],
          workerCount: 2,
          helperCount: 0,
          color: 'weiss',
          contactName: 'Hans',
          needsCallback: false,
          assignments: [{
            date: '2026-02-02',
            dayName: 'Montag',
            morning: 'MA_01',
            afternoon: 'MA_02',
            morningStatusCode: null,
            afternoonStatusCode: null,
            morningDetail: {
              assignmentId: 'a-1',
              resourceId: 'r-1',
              resourceName: 'Max',
              halfDay: 'morning',
              isFixed: true,
              notes: 'early start',
              statusCode: null,
            },
            afternoonDetail: {
              assignmentId: 'a-2',
              resourceId: 'r-2',
              resourceName: 'Hans',
              halfDay: 'afternoon',
              isFixed: false,
              notes: null,
              statusCode: null,
            },
            isFixed: true,
            notes: 'early start',
          }],
          remarks: 'Urgent',
        }],
        resources: [],
        totalHours: { planned: 8, available: 42.5 },
      }],
    }));

    const csv = await exportWochenplanCSV(6, 2026);
    const lines = csv.split('\n');

    expect(lines).toHaveLength(3); // header + 2 slots
    expect(lines[0]).toBe('OrderNumber,Customer,Description,Phase,Department,Date,HalfDay,Worker,Status,IsFixed,Notes');

    // Morning row
    expect(lines[1]).toContain('2026-001');
    expect(lines[1]).toContain('Müller AG');
    expect(lines[1]).toContain('Küche einbauen');
    expect(lines[1]).toContain('MONT');
    expect(lines[1]).toContain('montage');
    expect(lines[1]).toContain('2026-02-02');
    expect(lines[1]).toContain('morning');
    expect(lines[1]).toContain('MA_01');
    expect(lines[1]).toContain('true'); // isFixed

    // Afternoon row
    expect(lines[2]).toContain('afternoon');
    expect(lines[2]).toContain('MA_02');
    expect(lines[2]).toContain('false'); // isFixed
  });

  it('should filter by department', async () => {
    mockedGetWeekPlan.mockResolvedValueOnce(makeWeekPlan({
      sections: [
        {
          department: 'montage',
          label: 'Montage',
          tasks: [{
            taskId: 'task-1',
            projectOrderNumber: '2026-001',
            sachbearbeiter: 'MH',
            customerName: 'Müller',
            description: 'Montage task',
            installationLocation: '',
            phases: [{ phase: 'MONT', plannedKw: 6 }],
            workerCount: 1,
            helperCount: 0,
            color: '',
            contactName: '',
            needsCallback: false,
            assignments: [{
              date: '2026-02-02',
              dayName: 'Montag',
              morning: 'MA_01',
              afternoon: null,
              morningStatusCode: null,
              afternoonStatusCode: null,
              morningDetail: {
                assignmentId: 'a-1',
                resourceId: 'r-1',
                resourceName: 'Max',
                halfDay: 'morning',
                isFixed: false,
                notes: null,
                statusCode: null,
              },
              afternoonDetail: null,
              isFixed: false,
              notes: null,
            }],
            remarks: '',
          }],
          resources: [],
          totalHours: { planned: 4.25, available: 42.5 },
        },
        {
          department: 'produktion',
          label: 'Produktion',
          tasks: [{
            taskId: 'task-2',
            projectOrderNumber: '2026-002',
            sachbearbeiter: 'AB',
            customerName: 'Schmidt',
            description: 'Prod task',
            installationLocation: '',
            phases: [{ phase: 'PROD', plannedKw: 6 }],
            workerCount: 1,
            helperCount: 0,
            color: '',
            contactName: '',
            needsCallback: false,
            assignments: [{
              date: '2026-02-02',
              dayName: 'Montag',
              morning: 'MA_05',
              afternoon: null,
              morningStatusCode: null,
              afternoonStatusCode: null,
              morningDetail: {
                assignmentId: 'a-3',
                resourceId: 'r-5',
                resourceName: 'Karl',
                halfDay: 'morning',
                isFixed: false,
                notes: null,
                statusCode: null,
              },
              afternoonDetail: null,
              isFixed: false,
              notes: null,
            }],
            remarks: '',
          }],
          resources: [],
          totalHours: { planned: 4.25, available: 42.5 },
        },
      ],
    }));

    const csv = await exportWochenplanCSV(6, 2026, 'montage');
    const lines = csv.split('\n');

    expect(lines).toHaveLength(2); // header + 1 montage row (produktion filtered out)
    expect(lines[1]).toContain('montage');
    expect(lines[1]).not.toContain('produktion');
  });

  it('should escape CSV fields with commas and quotes', async () => {
    mockedGetWeekPlan.mockResolvedValueOnce(makeWeekPlan({
      sections: [{
        department: 'montage',
        label: 'Montage',
        tasks: [{
          taskId: 'task-1',
          projectOrderNumber: '2026-001',
          sachbearbeiter: 'MH',
          customerName: 'Müller, Meier & Co.',
          description: 'Kitchen "deluxe"',
          installationLocation: '',
          phases: [{ phase: 'MONT', plannedKw: 6 }],
          workerCount: 1,
          helperCount: 0,
          color: '',
          contactName: '',
          needsCallback: false,
          assignments: [{
            date: '2026-02-02',
            dayName: 'Montag',
            morning: 'MA_01',
            afternoon: null,
            morningStatusCode: null,
            afternoonStatusCode: null,
            morningDetail: {
              assignmentId: 'a-1',
              resourceId: 'r-1',
              resourceName: 'Max',
              halfDay: 'morning',
              isFixed: false,
              notes: null,
              statusCode: null,
            },
            afternoonDetail: null,
            isFixed: false,
            notes: null,
          }],
          remarks: '',
        }],
        resources: [],
        totalHours: { planned: 4.25, available: 42.5 },
      }],
    }));

    const csv = await exportWochenplanCSV(6, 2026);
    const lines = csv.split('\n');

    // Comma in customer name should be quoted
    expect(lines[1]).toContain('"Müller, Meier & Co."');
    // Quotes in description should be double-escaped
    expect(lines[1]).toContain('"Kitchen ""deluxe"""');
  });

  it('should include unassigned rows for tasks with phase codes', async () => {
    mockedGetWeekPlan.mockResolvedValueOnce(makeWeekPlan({
      sections: [{
        department: 'cnc',
        label: 'CNC',
        tasks: [{
          taskId: 'task-1',
          projectOrderNumber: '2026-010',
          sachbearbeiter: 'AB',
          customerName: 'Test',
          description: 'CNC work',
          installationLocation: '',
          phases: [{ phase: 'CNC', plannedKw: 6 }],
          workerCount: 1,
          helperCount: 0,
          color: '',
          contactName: '',
          needsCallback: false,
          assignments: [{
            date: '2026-02-02',
            dayName: 'Montag',
            morning: null,
            afternoon: null,
            morningStatusCode: null,
            afternoonStatusCode: null,
            morningDetail: null,
            afternoonDetail: null,
            isFixed: false,
            notes: null,
          }],
          remarks: '',
        }],
        resources: [],
        totalHours: { planned: 0, available: 42.5 },
      }],
    }));

    const csv = await exportWochenplanCSV(6, 2026);
    const lines = csv.split('\n');

    expect(lines).toHaveLength(2); // header + 1 unassigned row
    expect(lines[1]).toContain('unassigned');
    expect(lines[1]).toContain('CNC');
  });

  it('should handle status codes (sick, vacation)', async () => {
    mockedGetWeekPlan.mockResolvedValueOnce(makeWeekPlan({
      sections: [{
        department: 'montage',
        label: 'Montage',
        tasks: [{
          taskId: 'task-1',
          projectOrderNumber: '2026-001',
          sachbearbeiter: 'MH',
          customerName: 'Test',
          description: 'Task',
          installationLocation: '',
          phases: [{ phase: 'MONT', plannedKw: 6 }],
          workerCount: 1,
          helperCount: 0,
          color: '',
          contactName: '',
          needsCallback: false,
          assignments: [{
            date: '2026-02-02',
            dayName: 'Montag',
            morning: 'MA_01',
            afternoon: null,
            morningStatusCode: 'sick',
            afternoonStatusCode: null,
            morningDetail: {
              assignmentId: 'a-1',
              resourceId: 'r-1',
              resourceName: 'Max',
              halfDay: 'morning',
              isFixed: false,
              notes: null,
              statusCode: 'sick',
            },
            afternoonDetail: null,
            isFixed: false,
            notes: null,
          }],
          remarks: '',
        }],
        resources: [],
        totalHours: { planned: 4.25, available: 42.5 },
      }],
    }));

    const csv = await exportWochenplanCSV(6, 2026);
    const lines = csv.split('\n');

    expect(lines[1]).toContain('sick');
  });
});
