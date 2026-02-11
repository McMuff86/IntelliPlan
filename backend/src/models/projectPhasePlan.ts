import type { PhaseCode } from './task';

export interface ProjectPhasePlan {
  id: string;
  project_id: string;
  owner_id: string;
  phase_code: PhaseCode;
  phase_label: string;
  sequence_order: number;
  is_required: boolean;
  is_enabled: boolean;
  estimated_hours_min: number | string | null;
  estimated_hours_max: number | string | null;
  dependency_phase_codes: PhaseCode[] | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ProjectPhasePlanResponse {
  id: string;
  projectId: string;
  ownerId: string;
  phaseCode: PhaseCode;
  phaseLabel: string;
  sequenceOrder: number;
  isRequired: boolean;
  isEnabled: boolean;
  estimatedHoursMin: number | null;
  estimatedHoursMax: number | null;
  dependencyPhaseCodes: PhaseCode[];
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface ProjectPhasePlanInput {
  phaseCode: PhaseCode;
  phaseLabel?: string;
  sequenceOrder: number;
  isRequired?: boolean;
  isEnabled?: boolean;
  estimatedHoursMin?: number | null;
  estimatedHoursMax?: number | null;
  dependencyPhaseCodes?: PhaseCode[];
  notes?: string | null;
}

export const DEFAULT_PHASE_LABELS: Record<PhaseCode, string> = {
  ZUS: 'Zuschnitt',
  CNC: 'CNC',
  PROD: 'Produktion',
  VORBEH: 'Vorbehandlung',
  NACHBEH: 'Nachbehandlung',
  BESCHL: 'Beschlaege',
  TRANS: 'Transport',
  MONT: 'Montage',
};

export const DEFAULT_PROJECT_PHASE_PLAN: ProjectPhasePlanInput[] = [
  { phaseCode: 'ZUS', phaseLabel: DEFAULT_PHASE_LABELS.ZUS, sequenceOrder: 10, isRequired: true, isEnabled: true },
  { phaseCode: 'CNC', phaseLabel: DEFAULT_PHASE_LABELS.CNC, sequenceOrder: 20, isRequired: true, isEnabled: true },
  { phaseCode: 'PROD', phaseLabel: DEFAULT_PHASE_LABELS.PROD, sequenceOrder: 30, isRequired: true, isEnabled: true },
  { phaseCode: 'VORBEH', phaseLabel: DEFAULT_PHASE_LABELS.VORBEH, sequenceOrder: 40, isRequired: false, isEnabled: false },
  { phaseCode: 'NACHBEH', phaseLabel: DEFAULT_PHASE_LABELS.NACHBEH, sequenceOrder: 50, isRequired: false, isEnabled: false },
  { phaseCode: 'BESCHL', phaseLabel: DEFAULT_PHASE_LABELS.BESCHL, sequenceOrder: 60, isRequired: true, isEnabled: true },
  { phaseCode: 'TRANS', phaseLabel: DEFAULT_PHASE_LABELS.TRANS, sequenceOrder: 70, isRequired: false, isEnabled: true },
  { phaseCode: 'MONT', phaseLabel: DEFAULT_PHASE_LABELS.MONT, sequenceOrder: 80, isRequired: true, isEnabled: true },
];

export const toProjectPhasePlanResponse = (
  plan: ProjectPhasePlan
): ProjectPhasePlanResponse => ({
  id: plan.id,
  projectId: plan.project_id,
  ownerId: plan.owner_id,
  phaseCode: plan.phase_code,
  phaseLabel: plan.phase_label,
  sequenceOrder: plan.sequence_order,
  isRequired: plan.is_required,
  isEnabled: plan.is_enabled,
  estimatedHoursMin:
    plan.estimated_hours_min === null ? null : Number(plan.estimated_hours_min),
  estimatedHoursMax:
    plan.estimated_hours_max === null ? null : Number(plan.estimated_hours_max),
  dependencyPhaseCodes: plan.dependency_phase_codes ?? [],
  notes: plan.notes,
  createdAt: plan.created_at,
  updatedAt: plan.updated_at,
  deletedAt: plan.deleted_at,
});
