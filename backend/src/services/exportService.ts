import { getWeekPlan } from './wochenplanService';

export interface ExportRow {
  orderNumber: string;
  customer: string;
  description: string;
  phase: string;
  department: string;
  date: string;
  halfDay: string;
  worker: string;
  status: string;
  isFixed: string;
  notes: string;
}

/**
 * Generates CSV content for a Wochenplan export.
 * Flattens the hierarchical WeekPlanResponse into one row per assignment slot.
 */
export async function exportWochenplanCSV(
  kw: number,
  year: number,
  ownerId: string,
  department?: string,
): Promise<string> {
  const weekPlan = await getWeekPlan(kw, year, ownerId);

  const rows: ExportRow[] = [];

  for (const section of weekPlan.sections) {
    // If department filter is set, skip non-matching sections
    if (department && section.department !== department) {
      continue;
    }

    for (const task of section.tasks) {
      // Current phase for this section
      const currentPhase = task.phases.find(p => p.plannedKw === kw);
      const phaseCode = currentPhase?.phase ?? '';

      for (const day of task.assignments) {
        // Morning slot
        if (day.morning || day.morningStatusCode) {
          rows.push({
            orderNumber: task.projectOrderNumber || '',
            customer: task.customerName || '',
            description: task.description || '',
            phase: phaseCode,
            department: section.department,
            date: day.date,
            halfDay: 'morning',
            worker: day.morning || '',
            status: day.morningStatusCode || 'assigned',
            isFixed: day.morningDetail?.isFixed ? 'true' : 'false',
            notes: day.morningDetail?.notes || '',
          });
        }

        // Afternoon slot
        if (day.afternoon || day.afternoonStatusCode) {
          rows.push({
            orderNumber: task.projectOrderNumber || '',
            customer: task.customerName || '',
            description: task.description || '',
            phase: phaseCode,
            department: section.department,
            date: day.date,
            halfDay: 'afternoon',
            worker: day.afternoon || '',
            status: day.afternoonStatusCode || 'assigned',
            isFixed: day.afternoonDetail?.isFixed ? 'true' : 'false',
            notes: day.afternoonDetail?.notes || '',
          });
        }

        // If no morning or afternoon, still include a row for unassigned tasks
        if (!day.morning && !day.afternoon && !day.morningStatusCode && !day.afternoonStatusCode) {
          // Only include if this is a task that exists in the plan (has a phase)
          if (phaseCode) {
            rows.push({
              orderNumber: task.projectOrderNumber || '',
              customer: task.customerName || '',
              description: task.description || '',
              phase: phaseCode,
              department: section.department,
              date: day.date,
              halfDay: '',
              worker: '',
              status: 'unassigned',
              isFixed: 'false',
              notes: '',
            });
          }
        }
      }
    }
  }

  return formatCSV(rows);
}

const CSV_HEADERS = [
  'OrderNumber',
  'Customer',
  'Description',
  'Phase',
  'Department',
  'Date',
  'HalfDay',
  'Worker',
  'Status',
  'IsFixed',
  'Notes',
];

function escapeCSVField(field: string): string {
  if (field.includes(',') || field.includes('"') || field.includes('\n') || field.includes('\r')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

function formatCSV(rows: ExportRow[]): string {
  const lines: string[] = [CSV_HEADERS.join(',')];

  for (const row of rows) {
    const fields = [
      row.orderNumber,
      row.customer,
      row.description,
      row.phase,
      row.department,
      row.date,
      row.halfDay,
      row.worker,
      row.status,
      row.isFixed,
      row.notes,
    ];
    lines.push(fields.map(escapeCSVField).join(','));
  }

  return lines.join('\n');
}
