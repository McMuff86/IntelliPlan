/**
 * Common Shared Types
 *
 * Wiederverwendbare Typen die von mehreren Features genutzt werden.
 */

// ─── Pagination ────────────────────────────────────────

export interface PaginationState {
  page: number;
  limit: number;
  total: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

// ─── Sorting ───────────────────────────────────────────

export type SortOrder = 'asc' | 'desc';

export interface SortConfig<T extends string = string> {
  field: T;
  order: SortOrder;
}

// ─── Date & Time ───────────────────────────────────────

/** ISO date range (YYYY-MM-DD) */
export interface DateRange {
  from: string;
  to: string;
}

/** Calendar week representation */
export interface CalendarWeek {
  kw: number;
  year: number;
}

/** Week date range with individual dates */
export interface WeekDateRange extends DateRange {
  dates: string[];
  kw: number;
  year: number;
}

// ─── Filter ────────────────────────────────────────────

export interface FilterOption<T = string> {
  label: string;
  value: T;
  count?: number;
}

export interface ActiveFilter {
  field: string;
  value: string | string[];
  operator?: 'eq' | 'neq' | 'in' | 'like' | 'gte' | 'lte';
}

// ─── Selection ─────────────────────────────────────────

export interface SelectOption<T = string> {
  label: string;
  value: T;
  disabled?: boolean;
  group?: string;
}

// ─── Entities ──────────────────────────────────────────

/** Base entity fields present on all DB records */
export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

/** Soft-deletable entity */
export interface SoftDeletable {
  deletedAt: string | null;
}

// ─── Schreinerei-spezifisch ────────────────────────────

/** Abteilungen in der Schreinerei */
export type Department =
  | 'zuschnitt'
  | 'cnc'
  | 'produktion'
  | 'behandlung'
  | 'beschlaege'
  | 'montage'
  | 'transport'
  | 'buero';

/** Mitarbeiter-Typen */
export type EmployeeType =
  | 'internal'
  | 'temporary'
  | 'external_firm'
  | 'pensioner'
  | 'apprentice';

/** Produktionsphasen (in Reihenfolge) */
export const PRODUCTION_PHASES = [
  'zuschnitt',
  'cnc',
  'produktion',
  'behandlung',
  'beschlaege',
  'montage',
] as const;

export type ProductionPhase = (typeof PRODUCTION_PHASES)[number];

/** Department display labels */
export const DEPARTMENT_LABELS: Record<Department, string> = {
  zuschnitt: 'Zuschnitt',
  cnc: 'CNC',
  produktion: 'Produktion',
  behandlung: 'Behandlung',
  beschlaege: 'Beschläge',
  montage: 'Montage',
  transport: 'Transport',
  buero: 'Büro',
};

/** Half-day slot assignment */
export type HalfDay = 'morning' | 'afternoon' | 'full_day';

/** Absence/Status codes for resources */
export type StatusCode =
  | 'FREI'    // Ferien
  | 'FEI'     // Feiertag
  | 'KRANK'   // Krank
  | 'SCHULE'  // Berufsschule
  | 'MILITAER' // Militär
  | 'UNFALL'  // Unfall
  | 'HO';     // Home Office
