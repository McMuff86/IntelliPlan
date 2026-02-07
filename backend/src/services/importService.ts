import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import { pool } from '../config/database';
import type { PhaseCode } from '../models/task';
import type { Department, EmployeeType } from '../models/resource';
import type { HalfDay } from '../models/taskAssignment';

// ─── Types ─────────────────────────────────────────────

export interface ParsedWeekSheet {
  kw: number;
  year: number;
  sections: ParsedSection[];
}

export interface ParsedSection {
  sectionName: string;
  department: Department;
  tasks: ParsedTask[];
}

export interface ParsedTask {
  orderNumber: string;
  sachbearbeiter: string;
  customerName: string;
  description: string;
  installationLocation: string;
  phaseKws: { phase: string; kw: number | null }[];
  workerCount: number;
  helperCount: number;
  color: string;
  contactName: string;
  contactPhone: string;
  needsCallback: boolean;
  remarks: string;
  dayAssignments: ParsedDayAssignment[];
}

export interface ParsedDayAssignment {
  dayIndex: number; // 0=Mo, 1=Di, 2=Mi, 3=Do, 4=Fr
  slot: 'morning' | 'afternoon';
  resourceCode: string; // MA-Kürzel
  isFixed: boolean;
  timeNote: string | null;
}

export interface ParsedWeekPlan {
  sheets: ParsedWeekSheet[];
  allResourceCodes: string[];
}

export interface ImportProject {
  orderNumber: string;
  sachbearbeiter: string;
  customerName: string;
  description: string;
  installationLocation: string;
  color: string;
  contactName: string;
  contactPhone: string;
  needsCallback: boolean;
  workerCount: number;
  helperCount: number;
  remarks: string;
}

export interface ImportTask {
  orderNumber: string; // FK to project
  phaseCode: PhaseCode;
  title: string;
  plannedWeek: number | null;
  plannedYear: number | null;
}

export interface ImportPhaseSchedule {
  orderNumber: string;
  phaseCode: string;
  plannedKw: number | null;
  plannedYear: number | null;
}

export interface ImportAssignment {
  orderNumber: string;
  phaseCode: PhaseCode;
  resourceCode: string;
  date: string; // YYYY-MM-DD
  halfDay: HalfDay;
  isFixed: boolean;
  timeNote: string | null;
}

export interface ImportResource {
  shortCode: string;
  name: string;
  department: Department | null;
  employeeType: EmployeeType | null;
}

export interface ImportPlan {
  projects: ImportProject[];
  tasks: ImportTask[];
  phaseSchedules: ImportPhaseSchedule[];
  assignments: ImportAssignment[];
  resources: ImportResource[];
}

export interface ImportSummary {
  projectCount: number;
  taskCount: number;
  resourceCount: number;
  assignmentCount: number;
  phaseScheduleCount: number;
  weeksCovered: number[];
}

export interface ImportValidation {
  valid: boolean;
  warnings: string[];
  errors: string[];
  summary: ImportSummary;
}

export interface ImportResult {
  success: boolean;
  projectsCreated: number;
  projectsUpdated: number;
  tasksCreated: number;
  resourcesCreated: number;
  resourcesUpdated: number;
  assignmentsCreated: number;
  phaseSchedulesCreated: number;
  errors: string[];
}

// ─── Constants ─────────────────────────────────────────

const SECTION_PATTERNS: { pattern: RegExp; department: Department; label: string }[] = [
  { pattern: /^zuschnitt/i, department: 'zuschnitt', label: 'Zuschnitt' },
  { pattern: /^cnc/i, department: 'cnc', label: 'CNC' },
  { pattern: /^produktion/i, department: 'produktion', label: 'Produktion' },
  { pattern: /^vorbehandlung/i, department: 'behandlung', label: 'Vorbehandlung' },
  { pattern: /^nachbehandlung/i, department: 'behandlung', label: 'Nachbehandlung' },
  { pattern: /^behandlung/i, department: 'behandlung', label: 'Behandlung' },
  { pattern: /^beschl[äa]g/i, department: 'beschlaege', label: 'Beschläge' },
  { pattern: /^transport/i, department: 'transport', label: 'Transport' },
  { pattern: /^montage/i, department: 'montage', label: 'Montage' },
  { pattern: /^lehrl/i, department: 'produktion', label: 'Lehrlinge' },
  { pattern: /^fremdmont/i, department: 'montage', label: 'Fremdmonteure' },
  { pattern: /^pension/i, department: 'buero', label: 'Pensionäre' },
  { pattern: /^b[üu]ro/i, department: 'buero', label: 'Büro' },
];

// Phase mapping from section department to PhaseCode
const DEPARTMENT_TO_PHASE: Record<string, PhaseCode> = {
  zuschnitt: 'ZUS',
  cnc: 'CNC',
  produktion: 'PROD',
  behandlung: 'VORBEH',
  beschlaege: 'BESCHL',
  transport: 'TRANS',
  montage: 'MONT',
};

// Phase column mapping (columns F-K in Excel = indices 5-10)
const PHASE_COLUMNS: { colIndex: number; phase: string }[] = [
  { colIndex: 6, phase: 'ZUS' },      // F
  { colIndex: 7, phase: 'CNC' },      // G
  { colIndex: 8, phase: 'PROD' },     // H
  { colIndex: 9, phase: 'BEH' },      // I
  { colIndex: 10, phase: 'BESCHL' },  // J
  { colIndex: 11, phase: 'MONT' },    // K
];

// Day columns: R-AA (columns 18-27), 2 per day (morning/afternoon)
const DAY_COLUMNS: { dayIndex: number; morningCol: number; afternoonCol: number }[] = [
  { dayIndex: 0, morningCol: 18, afternoonCol: 19 }, // Mo: R, S
  { dayIndex: 1, morningCol: 20, afternoonCol: 21 }, // Di: T, U
  { dayIndex: 2, morningCol: 22, afternoonCol: 23 }, // Mi: V, W
  { dayIndex: 3, morningCol: 24, afternoonCol: 25 }, // Do: X, Y
  { dayIndex: 4, morningCol: 26, afternoonCol: 27 }, // Fr: Z, AA
];

// Status codes that are NOT real MA assignments
const NON_ASSIGNMENT_CODES = new Set([
  'FREI', 'FEI', 'SB_63', 'SB_64', 'SB_65', 'SB_66', 'SB_67',
  'SB_68', 'SB_69', 'SB_13', 'SB_70', 'SB_71',
  '-', '', 'FIX', 'PRO', 'ZUS', 'CNC',
]);

// ─── Parser ────────────────────────────────────────────

function getCellString(row: ExcelJS.Row, col: number): string {
  const cell = row.getCell(col);
  if (cell === null || cell === undefined) return '';
  const val = cell.value;
  if (val === null || val === undefined) return '';

  // Handle rich text
  if (typeof val === 'object' && 'richText' in val) {
    return (val as ExcelJS.CellRichTextValue).richText
      .map((rt) => rt.text)
      .join('')
      .trim();
  }

  // Handle formula results
  if (typeof val === 'object' && 'result' in val) {
    const result = (val as ExcelJS.CellFormulaValue).result;
    return result !== null && result !== undefined ? String(result).trim() : '';
  }

  return String(val).trim();
}

function getCellNumber(row: ExcelJS.Row, col: number): number {
  const str = getCellString(row, col);
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

function getCellBool(row: ExcelJS.Row, col: number): boolean {
  const str = getCellString(row, col).toLowerCase();
  return str === 'ja' || str === 'yes' || str === 'true' || str === '1' || str === 'x';
}

/**
 * Parse KW number from a string. Handles:
 * "KW06", "KW 06", "6", "KW6", "LW 4" (typo), "-", "0"
 */
export function parseKwNumber(raw: string): number | null {
  if (!raw || raw === '-' || raw === '0' || raw === '') return null;

  const cleaned = raw.replace(/\s+/g, '').toUpperCase();

  // "KW06" or "KW6"
  const kwMatch = cleaned.match(/^(?:KW|LW)(\d{1,2})$/);
  if (kwMatch) {
    const n = parseInt(kwMatch[1], 10);
    return n >= 1 && n <= 53 ? n : null;
  }

  // Just a number "6" or "06"
  const numMatch = cleaned.match(/^(\d{1,2})$/);
  if (numMatch) {
    const n = parseInt(numMatch[1], 10);
    return n >= 1 && n <= 53 ? n : null;
  }

  // Date format "02.02."
  const dateMatch = cleaned.match(/^(\d{1,2})\.(\d{1,2})\.?$/);
  if (dateMatch) {
    // We can't reliably compute KW from just DD.MM without year, return null
    return null;
  }

  return null;
}

/**
 * Extract KW number from sheet name.
 * "KW06" → 6, "KW 6" → 6
 */
export function parseKwFromSheetName(name: string): number | null {
  const match = name.match(/KW\s*(\d{1,2})/i);
  if (!match) return null;
  const kw = parseInt(match[1], 10);
  return kw >= 1 && kw <= 53 ? kw : null;
}

/**
 * Detect section header from a row.
 * Returns the matched section info or null.
 */
function detectSection(row: ExcelJS.Row): { department: Department; label: string } | null {
  const cellA = getCellString(row, 1).trim();
  if (!cellA) return null;

  for (const { pattern, department, label } of SECTION_PATTERNS) {
    if (pattern.test(cellA)) {
      return { department, label };
    }
  }

  return null;
}

/**
 * Check if a row looks like an order row (has an order number in column A).
 * Order numbers match patterns like: "25.0591-201/004", "26.0076-201", "25-0989-201/001"
 */
function isOrderRow(row: ExcelJS.Row): boolean {
  const cellA = getCellString(row, 1);
  if (!cellA) return false;

  // Match common order number patterns
  return /^\d{2}[.\-]\d{3,4}/.test(cellA);
}

/**
 * Check if a row is a "Total" / capacity row that should be skipped.
 */
function isTotalRow(row: ExcelJS.Row): boolean {
  const cellA = getCellString(row, 1).toLowerCase();
  return (
    cellA.startsWith('total') ||
    cellA.startsWith('kapazit') ||
    cellA.startsWith('anwes') ||
    cellA.startsWith('sollzeit') ||
    cellA.startsWith('unprod')
  );
}

/**
 * Check if a cell value represents an actual MA assignment (not a status code).
 */
function isResourceAssignment(value: string): boolean {
  if (!value) return false;
  const upper = value.toUpperCase().trim();
  if (NON_ASSIGNMENT_CODES.has(upper)) return false;
  // Must look like an MA code: MA_xx, Lehrling_xx, Fremdmonteur_xx, etc.
  // Or any non-empty string that isn't a known status code
  return upper.length > 0;
}

/**
 * Parse a single KW-Sheet.
 */
function parseKwSheet(worksheet: ExcelJS.Worksheet, kw: number, year: number): ParsedWeekSheet {
  const sections: ParsedSection[] = [];
  let currentSection: { sectionName: string; department: Department; tasks: ParsedTask[] } | null = null;

  worksheet.eachRow((row, rowNumber) => {
    // Skip very first rows (header area, typically rows 1-4)
    if (rowNumber <= 2) return;

    // Check for Total rows (skip)
    if (isTotalRow(row)) return;

    // Check for section header
    const sectionInfo = detectSection(row);
    if (sectionInfo) {
      // Save previous section if it has tasks
      if (currentSection && currentSection.tasks.length > 0) {
        sections.push(currentSection);
      }
      currentSection = {
        sectionName: sectionInfo.label,
        department: sectionInfo.department,
        tasks: [],
      };
      return;
    }

    // Check for order row
    if (currentSection !== null && isOrderRow(row)) {
      const sec = currentSection;
      const orderNumber = getCellString(row, 1);
      const sachbearbeiter = getCellString(row, 2);
      const customerName = getCellString(row, 3);
      const description = getCellString(row, 4);
      const installationLocation = getCellString(row, 5);
      const workerCount = getCellNumber(row, 12);
      const helperCount = getCellNumber(row, 13);
      const color = getCellString(row, 14);
      const contactName = getCellString(row, 15);
      const contactPhone = getCellString(row, 16);
      const needsCallback = getCellBool(row, 17);
      const remarks = getCellString(row, 28);

      // Parse phase KW columns (F-K)
      const phaseKws = PHASE_COLUMNS.map(({ colIndex, phase }) => ({
        phase,
        kw: parseKwNumber(getCellString(row, colIndex)),
      }));

      // Parse day assignments (R-AA)
      const dayAssignments: ParsedDayAssignment[] = [];

      for (const { dayIndex, morningCol, afternoonCol } of DAY_COLUMNS) {
        const morningVal = getCellString(row, morningCol);
        const afternoonVal = getCellString(row, afternoonCol);

        if (morningVal && isResourceAssignment(morningVal)) {
          const isFixed = morningVal.toLowerCase().includes('fix') ||
            remarks.toLowerCase().includes('fix');
          dayAssignments.push({
            dayIndex,
            slot: 'morning',
            resourceCode: morningVal.replace(/\s*fix\s*/gi, '').trim() || morningVal,
            isFixed,
            timeNote: null,
          });
        }

        if (afternoonVal && isResourceAssignment(afternoonVal)) {
          const isFixed = afternoonVal.toLowerCase().includes('fix') ||
            remarks.toLowerCase().includes('fix');
          dayAssignments.push({
            dayIndex,
            slot: 'afternoon',
            resourceCode: afternoonVal.replace(/\s*fix\s*/gi, '').trim() || afternoonVal,
            isFixed,
            timeNote: null,
          });
        }
      }

      sec.tasks.push({
        orderNumber,
        sachbearbeiter,
        customerName,
        description,
        installationLocation,
        phaseKws,
        workerCount,
        helperCount,
        color,
        contactName,
        contactPhone,
        needsCallback,
        remarks,
        dayAssignments,
      });
    }
  });

  // Don't forget the last section
  if (currentSection !== null && (currentSection as ParsedSection).tasks.length > 0) {
    sections.push(currentSection as ParsedSection);
  }

  return { kw, year, sections };
}

/**
 * Strip images/drawings from an xlsx buffer to avoid ExcelJS crashes
 * on files with embedded images (known bug with media references).
 */
async function stripImagesFromXlsx(buffer: Buffer): Promise<Buffer> {
  const zip = await JSZip.loadAsync(buffer);

  // Remove media files (images), drawing files, and drawing rels
  const toRemove: string[] = [];
  zip.forEach((relativePath) => {
    if (
      relativePath.match(/xl\/media\//) ||
      relativePath.match(/xl\/drawings\//) ||
      relativePath.match(/xl\/drawings\/_rels\//)
    ) {
      toRemove.push(relativePath);
    }
  });

  for (const path of toRemove) {
    zip.remove(path);
  }

  // Also clean up worksheet rels that reference drawings
  const relFiles = Object.keys(zip.files).filter((f) =>
    f.match(/xl\/worksheets\/_rels\/sheet\d+\.xml\.rels/)
  );
  for (const relFile of relFiles) {
    const content = await zip.file(relFile)!.async('string');
    // Remove Relationship entries that reference drawings
    const cleaned = content.replace(
      /<Relationship[^>]*Target="[^"]*drawings[^"]*"[^>]*\/>/g,
      ''
    );
    zip.file(relFile, cleaned);
  }

  return Buffer.from(await zip.generateAsync({ type: 'nodebuffer' }));
}

/**
 * Parse a complete Wochenplan Excel file.
 */
export async function parseWochenplanExcel(buffer: Buffer): Promise<ParsedWeekPlan> {
  const workbook = new ExcelJS.Workbook();

  // Try loading directly first; if it fails (e.g. due to image references),
  // strip images and retry
  try {
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('Cannot read properties of undefined')) {
      // Known ExcelJS bug with embedded images – strip them and retry
      const cleanBuffer = await stripImagesFromXlsx(buffer);
      await workbook.xlsx.load(cleanBuffer as unknown as ExcelJS.Buffer);
    } else {
      throw err;
    }
  }

  const sheets: ParsedWeekSheet[] = [];
  const allResourceCodes = new Set<string>();

  for (const worksheet of workbook.worksheets) {
    const kw = parseKwFromSheetName(worksheet.name);
    if (kw === null) continue; // Skip non-KW sheets (e.g. "Kapazität und Auslastung")

    // Default year: try to infer from context or use current year
    const year = new Date().getFullYear();
    const parsed = parseKwSheet(worksheet, kw, year);

    if (parsed.sections.length > 0) {
      sheets.push(parsed);
    }

    // Collect all resource codes
    for (const section of parsed.sections) {
      for (const task of section.tasks) {
        for (const da of task.dayAssignments) {
          allResourceCodes.add(da.resourceCode);
        }
      }
    }
  }

  return {
    sheets,
    allResourceCodes: Array.from(allResourceCodes).sort(),
  };
}

// ─── Mapping Logic ─────────────────────────────────────

/**
 * Get Monday date for a given ISO week number and year.
 */
function getWeekMonday(kw: number, year: number): Date {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dayOfWeek = jan4.getUTCDay() || 7;
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - (dayOfWeek - 1) + (kw - 1) * 7);
  return monday;
}

/**
 * Get date string for a day in a given week.
 */
function getDateForDay(kw: number, year: number, dayIndex: number): string {
  const monday = getWeekMonday(kw, year);
  const date = new Date(monday);
  date.setUTCDate(monday.getUTCDate() + dayIndex);
  return date.toISOString().slice(0, 10);
}

/**
 * Determine PhaseCode from section label.
 */
function sectionToPhaseCode(sectionName: string): PhaseCode {
  const lower = sectionName.toLowerCase();
  if (lower.includes('zuschnitt')) return 'ZUS';
  if (lower.includes('cnc')) return 'CNC';
  if (lower.includes('produktion')) return 'PROD';
  if (lower.includes('vorbehandlung')) return 'VORBEH';
  if (lower.includes('nachbehandlung')) return 'NACHBEH';
  if (lower.includes('behandlung')) return 'VORBEH';
  if (lower.includes('beschl')) return 'BESCHL';
  if (lower.includes('transport')) return 'TRANS';
  if (lower.includes('montage') || lower.includes('fremdmont')) return 'MONT';
  return 'PROD'; // default
}

/**
 * Infer department/type from resource code.
 */
function inferResourceInfo(code: string): { department: Department | null; employeeType: EmployeeType | null } {
  const lower = code.toLowerCase();
  if (lower.startsWith('lehrling')) return { department: 'produktion', employeeType: 'apprentice' };
  if (lower.startsWith('fremdmonteur')) return { department: 'montage', employeeType: 'temporary' };
  if (lower.startsWith('fremdfirma')) return { department: 'montage', employeeType: 'external_firm' };
  if (lower.startsWith('pensionaer') || lower.startsWith('pensionär')) return { department: 'buero', employeeType: 'pensioner' };
  if (lower.startsWith('buero') || lower.startsWith('büro')) return { department: 'buero', employeeType: 'internal' };
  if (lower.startsWith('maler')) return { department: 'behandlung', employeeType: 'temporary' };
  if (lower.startsWith('ma_')) return { department: null, employeeType: 'internal' };
  return { department: null, employeeType: null };
}

/**
 * Map parsed data to IntelliPlan import plan.
 */
export function mapToIntelliPlan(parsed: ParsedWeekPlan): ImportPlan {
  const projectsMap = new Map<string, ImportProject>();
  const tasksMap = new Map<string, ImportTask>(); // key: orderNumber+phaseCode
  const phaseSchedulesMap = new Map<string, ImportPhaseSchedule>(); // key: orderNumber+phase
  const assignmentsList: ImportAssignment[] = [];
  const resourcesMap = new Map<string, ImportResource>();

  // Process each sheet
  for (const sheet of parsed.sheets) {
    for (const section of sheet.sections) {
      const phaseCode = sectionToPhaseCode(section.sectionName);

      for (const task of section.tasks) {
        // 1. Unique project by order number
        if (!projectsMap.has(task.orderNumber)) {
          projectsMap.set(task.orderNumber, {
            orderNumber: task.orderNumber,
            sachbearbeiter: task.sachbearbeiter,
            customerName: task.customerName,
            description: task.description,
            installationLocation: task.installationLocation,
            color: task.color,
            contactName: task.contactName,
            contactPhone: task.contactPhone,
            needsCallback: task.needsCallback,
            workerCount: task.workerCount,
            helperCount: task.helperCount,
            remarks: task.remarks,
          });
        }

        // 2. Task per project per phase (unique by orderNumber + phaseCode)
        const taskKey = `${task.orderNumber}::${phaseCode}`;
        if (!tasksMap.has(taskKey)) {
          tasksMap.set(taskKey, {
            orderNumber: task.orderNumber,
            phaseCode,
            title: `${section.sectionName}`,
            plannedWeek: sheet.kw,
            plannedYear: sheet.year,
          });
        }

        // 3. Phase schedules from KW columns
        for (const { phase, kw: phaseKw } of task.phaseKws) {
          if (phaseKw !== null) {
            const psKey = `${task.orderNumber}::${phase}`;
            if (!phaseSchedulesMap.has(psKey)) {
              phaseSchedulesMap.set(psKey, {
                orderNumber: task.orderNumber,
                phaseCode: phase,
                plannedKw: phaseKw,
                plannedYear: sheet.year,
              });
            }
          }
        }

        // 4. Day assignments
        for (const da of task.dayAssignments) {
          const date = getDateForDay(sheet.kw, sheet.year, da.dayIndex);
          assignmentsList.push({
            orderNumber: task.orderNumber,
            phaseCode,
            resourceCode: da.resourceCode,
            date,
            halfDay: da.slot as HalfDay,
            isFixed: da.isFixed,
            timeNote: da.timeNote,
          });

          // Collect resources
          if (!resourcesMap.has(da.resourceCode)) {
            const info = inferResourceInfo(da.resourceCode);
            resourcesMap.set(da.resourceCode, {
              shortCode: da.resourceCode,
              name: da.resourceCode, // Will be enriched later
              department: info.department,
              employeeType: info.employeeType,
            });
          }
        }
      }
    }
  }

  return {
    projects: Array.from(projectsMap.values()),
    tasks: Array.from(tasksMap.values()),
    phaseSchedules: Array.from(phaseSchedulesMap.values()),
    assignments: assignmentsList,
    resources: Array.from(resourcesMap.values()),
  };
}

// ─── Validation ────────────────────────────────────────

export async function validateImport(plan: ImportPlan): Promise<ImportValidation> {
  const warnings: string[] = [];
  const errors: string[] = [];

  // 1. Check for empty plan
  if (plan.projects.length === 0) {
    errors.push('Keine Projekte im Import gefunden. Prüfen Sie das Excel-Format.');
  }

  // 2. Check for existing projects (by order number)
  if (plan.projects.length > 0) {
    const orderNumbers = plan.projects.map((p) => p.orderNumber);
    const existing = await pool.query<{ order_number: string }>(
      `SELECT order_number FROM projects WHERE order_number = ANY($1) AND deleted_at IS NULL`,
      [orderNumbers]
    );

    if (existing.rows.length > 0) {
      const existingNrs = existing.rows.map((r) => r.order_number);
      warnings.push(
        `${existingNrs.length} Projekte existieren bereits und werden aktualisiert: ${existingNrs.slice(0, 5).join(', ')}${existingNrs.length > 5 ? ` ... (+${existingNrs.length - 5} weitere)` : ''}`
      );
    }
  }

  // 3. Check for known resources (only if there are resources)
  if (plan.resources.length > 0) {
    const codes = plan.resources.map((r) => r.shortCode);
    const knownResources = await pool.query<{ short_code: string }>(
      `SELECT short_code FROM resources WHERE short_code = ANY($1) AND deleted_at IS NULL`,
      [codes]
    );
    const knownCodes = new Set(knownResources.rows.map((r) => r.short_code));
    const unknownCodes = codes.filter((c) => !knownCodes.has(c));

    if (unknownCodes.length > 0) {
      warnings.push(
        `${unknownCodes.length} unbekannte Mitarbeiter-Kürzel (werden neu erstellt): ${unknownCodes.slice(0, 10).join(', ')}${unknownCodes.length > 10 ? ` ... (+${unknownCodes.length - 10} weitere)` : ''}`
      );
    }
  }

  // 4. Validate order numbers format
  for (const proj of plan.projects) {
    if (!proj.orderNumber || proj.orderNumber.length < 3) {
      errors.push(`Ungültige Auftragsnummer: "${proj.orderNumber}"`);
    }
  }

  // 5. Check for duplicate assignments (same resource, same date, same slot)
  const assignmentKeys = new Set<string>();
  for (const a of plan.assignments) {
    const key = `${a.resourceCode}::${a.date}::${a.halfDay}`;
    if (assignmentKeys.has(key)) {
      warnings.push(
        `Doppelte Zuweisung: ${a.resourceCode} am ${a.date} (${a.halfDay}) für Auftrag ${a.orderNumber}`
      );
    }
    assignmentKeys.add(key);
  }

  // 6. Check resource count (sanity check)
  if (plan.resources.length > 100) {
    warnings.push(`Sehr viele Mitarbeiter (${plan.resources.length}) – bitte prüfen.`);
  }

  const weeksCovered = [
    ...new Set(plan.tasks.filter((t) => t.plannedWeek !== null).map((t) => t.plannedWeek!)),
  ].sort((a, b) => a - b);

  const summary: ImportSummary = {
    projectCount: plan.projects.length,
    taskCount: plan.tasks.length,
    resourceCount: plan.resources.length,
    assignmentCount: plan.assignments.length,
    phaseScheduleCount: plan.phaseSchedules.length,
    weeksCovered,
  };

  return {
    valid: errors.length === 0,
    warnings,
    errors,
    summary,
  };
}

// ─── Execute Import ────────────────────────────────────

// Map production_phase ENUM values used in task_phase_schedules
const PHASE_CODE_TO_DB_PHASE: Record<string, string> = {
  ZUS: 'zuschnitt',
  CNC: 'cnc',
  PROD: 'produktion',
  BEH: 'behandlung',
  VORBEH: 'vorbehandlung',
  NACHBEH: 'nachbehandlung',
  BESCHL: 'beschlaege',
  TRANS: 'transport',
  MONT: 'montage',
};

export async function executeImport(plan: ImportPlan, userId: string): Promise<ImportResult> {
  const client = await pool.connect();
  const result: ImportResult = {
    success: false,
    projectsCreated: 0,
    projectsUpdated: 0,
    tasksCreated: 0,
    resourcesCreated: 0,
    resourcesUpdated: 0,
    assignmentsCreated: 0,
    phaseSchedulesCreated: 0,
    errors: [],
  };

  try {
    await client.query('BEGIN');

    // ── 1. Upsert Resources ──
    const resourceIdByCode = new Map<string, string>();

    for (const res of plan.resources) {
      // Check if resource exists by short_code
      const existing = await client.query<{ id: string }>(
        `SELECT id FROM resources WHERE short_code = $1 AND deleted_at IS NULL`,
        [res.shortCode]
      );

      if (existing.rows.length > 0) {
        resourceIdByCode.set(res.shortCode, existing.rows[0].id);
        result.resourcesUpdated++;
      } else {
        const inserted = await client.query<{ id: string }>(
          `INSERT INTO resources (owner_id, name, resource_type, short_code, department, employee_type, is_active)
           VALUES ($1, $2, 'person', $3, $4, $5, true)
           RETURNING id`,
          [userId, res.name, res.shortCode, res.department, res.employeeType]
        );
        resourceIdByCode.set(res.shortCode, inserted.rows[0].id);
        result.resourcesCreated++;
      }
    }

    // ── 2. Upsert Projects ──
    const projectIdByOrderNr = new Map<string, string>();

    for (const proj of plan.projects) {
      const existing = await client.query<{ id: string }>(
        `SELECT id FROM projects WHERE order_number = $1 AND deleted_at IS NULL`,
        [proj.orderNumber]
      );

      if (existing.rows.length > 0) {
        // Update existing project
        await client.query(
          `UPDATE projects SET
            customer_name = COALESCE(NULLIF($2, ''), customer_name),
            installation_location = COALESCE(NULLIF($3, ''), installation_location),
            color = COALESCE(NULLIF($4, ''), color),
            contact_name = COALESCE(NULLIF($5, ''), contact_name),
            contact_phone = COALESCE(NULLIF($6, ''), contact_phone),
            needs_callback = $7,
            sachbearbeiter = COALESCE(NULLIF($8, ''), sachbearbeiter),
            worker_count = CASE WHEN $9::numeric > 0 THEN $9 ELSE worker_count END,
            helper_count = CASE WHEN $10::numeric > 0 THEN $10 ELSE helper_count END,
            remarks = COALESCE(NULLIF($11, ''), remarks),
            updated_at = NOW()
          WHERE id = $12`,
          [
            proj.orderNumber,
            proj.customerName,
            proj.installationLocation,
            proj.color,
            proj.contactName,
            proj.contactPhone,
            proj.needsCallback,
            proj.sachbearbeiter,
            proj.workerCount,
            proj.helperCount,
            proj.remarks,
            existing.rows[0].id,
          ]
        );
        projectIdByOrderNr.set(proj.orderNumber, existing.rows[0].id);
        result.projectsUpdated++;
      } else {
        const inserted = await client.query<{ id: string }>(
          `INSERT INTO projects (
            owner_id, name, description, order_number,
            customer_name, installation_location, color,
            contact_name, contact_phone, needs_callback,
            sachbearbeiter, worker_count, helper_count, remarks
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          RETURNING id`,
          [
            userId,
            `${proj.orderNumber} – ${proj.customerName || proj.description}`.slice(0, 200),
            proj.description,
            proj.orderNumber,
            proj.customerName,
            proj.installationLocation,
            proj.color,
            proj.contactName,
            proj.contactPhone,
            proj.needsCallback,
            proj.sachbearbeiter,
            proj.workerCount || null,
            proj.helperCount || null,
            proj.remarks,
          ]
        );
        projectIdByOrderNr.set(proj.orderNumber, inserted.rows[0].id);
        result.projectsCreated++;
      }
    }

    // ── 3. Create Tasks ──
    const taskIdByKey = new Map<string, string>(); // key: orderNumber::phaseCode

    for (const task of plan.tasks) {
      const projectId = projectIdByOrderNr.get(task.orderNumber);
      if (!projectId) {
        result.errors.push(`Projekt nicht gefunden für Task: ${task.orderNumber}`);
        continue;
      }

      const taskKey = `${task.orderNumber}::${task.phaseCode}`;

      // Check if task already exists
      const existing = await client.query<{ id: string }>(
        `SELECT t.id FROM tasks t
         WHERE t.project_id = $1 AND t.phase_code = $2 AND t.deleted_at IS NULL`,
        [projectId, task.phaseCode]
      );

      if (existing.rows.length > 0) {
        taskIdByKey.set(taskKey, existing.rows[0].id);
        // Update planned_week/year if needed
        await client.query(
          `UPDATE tasks SET planned_week = COALESCE($1, planned_week), planned_year = COALESCE($2, planned_year)
           WHERE id = $3`,
          [task.plannedWeek, task.plannedYear, existing.rows[0].id]
        );
      } else {
        const inserted = await client.query<{ id: string }>(
          `INSERT INTO tasks (
            project_id, owner_id, title, phase_code,
            planned_week, planned_year, status, scheduling_mode
          ) VALUES ($1, $2, $3, $4, $5, $6, 'planned', 'manual')
          RETURNING id`,
          [projectId, userId, task.title, task.phaseCode, task.plannedWeek, task.plannedYear]
        );
        taskIdByKey.set(taskKey, inserted.rows[0].id);
        result.tasksCreated++;
      }
    }

    // ── 4. Create Phase Schedules ──
    for (const ps of plan.phaseSchedules) {
      // Find the task for this order+phase
      const phaseCode = PHASE_CODE_TO_DB_PHASE[ps.phaseCode] || ps.phaseCode.toLowerCase();

      // Find task by matching order number
      const projectId = projectIdByOrderNr.get(ps.orderNumber);
      if (!projectId) continue;

      // Get any task for this project (we attach phase schedules to the primary task)
      // Find the task that matches this specific phase
      const phaseToTaskPhaseCode: Record<string, PhaseCode> = {
        ZUS: 'ZUS', CNC: 'CNC', PROD: 'PROD',
        BEH: 'VORBEH', BESCHL: 'BESCHL', MONT: 'MONT',
      };
      const taskPhaseCode = phaseToTaskPhaseCode[ps.phaseCode] || 'PROD';
      const taskKey = `${ps.orderNumber}::${taskPhaseCode}`;
      let taskId = taskIdByKey.get(taskKey);

      // If no exact match, find any task for this project
      if (!taskId) {
        for (const [key, id] of taskIdByKey) {
          if (key.startsWith(`${ps.orderNumber}::`)) {
            taskId = id;
            break;
          }
        }
      }

      if (!taskId) continue;

      try {
        await client.query(
          `INSERT INTO task_phase_schedules (task_id, phase, planned_kw, planned_year)
           VALUES ($1, $2::production_phase, $3, $4)
           ON CONFLICT (task_id, phase) DO UPDATE SET
             planned_kw = EXCLUDED.planned_kw,
             planned_year = EXCLUDED.planned_year,
             updated_at = NOW()`,
          [taskId, phaseCode, ps.plannedKw, ps.plannedYear]
        );
        result.phaseSchedulesCreated++;
      } catch (err) {
        // Silently skip invalid phase values
        const errMsg = err instanceof Error ? err.message : String(err);
        if (!errMsg.includes('invalid input value for enum')) {
          throw err;
        }
      }
    }

    // ── 5. Create Assignments ──
    for (const assignment of plan.assignments) {
      const taskKey = `${assignment.orderNumber}::${assignment.phaseCode}`;
      const taskId = taskIdByKey.get(taskKey);
      const resourceId = resourceIdByCode.get(assignment.resourceCode);

      if (!taskId || !resourceId) continue;

      try {
        await client.query(
          `INSERT INTO task_assignments (
            task_id, resource_id, assignment_date, half_day,
            is_fixed, notes, status_code
          ) VALUES ($1, $2, $3, $4, $5, $6, 'assigned')
          ON CONFLICT (task_id, resource_id, assignment_date, half_day) DO UPDATE SET
            is_fixed = EXCLUDED.is_fixed,
            notes = EXCLUDED.notes,
            updated_at = NOW()`,
          [taskId, resourceId, assignment.date, assignment.halfDay, assignment.isFixed, assignment.timeNote]
        );
        result.assignmentsCreated++;
      } catch (err) {
        // Skip duplicate/constraint violations gracefully
        const errMsg = err instanceof Error ? err.message : String(err);
        if (!errMsg.includes('duplicate key') && !errMsg.includes('unique constraint')) {
          throw err;
        }
      }
    }

    await client.query('COMMIT');
    result.success = true;
  } catch (error) {
    await client.query('ROLLBACK');
    result.errors.push(
      `Import fehlgeschlagen: ${error instanceof Error ? error.message : String(error)}`
    );
  } finally {
    client.release();
  }

  return result;
}
