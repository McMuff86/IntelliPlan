/**
 * Wochenplan Types
 *
 * Gespiegelt vom Backend (backend/src/services/wochenplanService.ts).
 * Diese Types definieren die Datenstruktur des Wochenplan-Endpoints.
 */

import type { Department, HalfDay, ProductionPhase } from './common';

// ─── API Response ──────────────────────────────────────

/** Complete week plan response from GET /api/v1/wochenplan */
export interface WeekPlanResponse {
  kw: number;
  year: number;
  dateRange: {
    from: string; // ISO date (YYYY-MM-DD)
    to: string;
  };
  sections: WeekPlanSection[];
  capacitySummary: CapacitySummary;
}

// ─── Sections ──────────────────────────────────────────

/** A section groups tasks and resources by department */
export interface WeekPlanSection {
  department: Department;
  label: string;
  tasks: WeekPlanTask[];
  resources: WeekPlanResource[];
  totalHours: {
    planned: number;
    available: number;
  };
}

// ─── Tasks ─────────────────────────────────────────────

/** A task row in the weekly plan */
export interface WeekPlanTask {
  taskId: string;
  projectOrderNumber: string;
  sachbearbeiter: string;
  customerName: string;
  description: string;
  installationLocation: string;
  phases: PhaseSchedule[];
  workerCount: number;
  color: string;
  contactName: string;
  needsCallback: boolean;
  assignments: DayAssignment[];
  remarks: string;
}

/** Phase schedule for a task (all 6 phases, with planned KW or null) */
export interface PhaseSchedule {
  phase: ProductionPhase;
  plannedKw: number | null;
}

/** Daily assignment showing which resource is assigned */
export interface DayAssignment {
  date: string; // ISO date
  dayName: string; // 'Montag', 'Dienstag', etc.
  morning: string | null; // Resource name or null
  afternoon: string | null;
  isFixed: boolean;
  notes: string | null;
}

// ─── Resources ─────────────────────────────────────────

/** A resource (employee) within a section */
export interface WeekPlanResource {
  id: string;
  name: string;
  shortCode?: string; // e.g. 'MA_14'
  department: Department | null;
  employeeType: string | null;
  weeklyHours: number;
}

// ─── Capacity ──────────────────────────────────────────

/** Overall capacity summary for the week */
export interface CapacitySummary {
  totalAvailableHours: number;
  totalPlannedHours: number;
  utilizationPercent: number;
  byDepartment: DepartmentCapacity[];
}

/** Capacity for a single department */
export interface DepartmentCapacity {
  department: string;
  label: string;
  availableHours: number;
  plannedHours: number;
  utilizationPercent: number;
}

// ─── Assignment DTOs ───────────────────────────────────

/** Create a new task assignment */
export interface CreateAssignmentDTO {
  taskId: string;
  resourceId: string;
  assignmentDate: string; // ISO date
  halfDay: HalfDay;
  notes?: string;
  isFixed?: boolean;
  startTime?: string; // HH:mm
}

/** Update an existing task assignment */
export interface UpdateAssignmentDTO {
  resourceId?: string;
  assignmentDate?: string;
  halfDay?: HalfDay;
  notes?: string;
  isFixed?: boolean;
  startTime?: string;
}

// ─── Navigation ────────────────────────────────────────

/** Week navigation state */
export interface WeekNavigationState {
  kw: number;
  year: number;
  isCurrentWeek: boolean;
  dateRange: {
    from: string;
    to: string;
  };
}

// ─── Cell Interaction ──────────────────────────────────

/** Represents a clickable cell in the week plan grid */
export interface WeekPlanCell {
  taskId: string;
  date: string;
  slot: 'morning' | 'afternoon';
  currentResource: string | null;
  isFixed: boolean;
}

/** Assignment drag source/target info */
export interface DragAssignment {
  assignmentId?: string;
  taskId: string;
  resourceId: string;
  fromDate: string;
  fromSlot: HalfDay;
}
