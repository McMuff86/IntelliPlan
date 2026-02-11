export type ReadinessCheckCode =
  | 'AVOR_DONE'
  | 'MATERIAL_READY'
  | 'FITTINGS_READY'
  | 'PLANS_READY'
  | 'SITE_READY';

export type ReadinessStatus = 'pending' | 'ok' | 'blocked' | 'n_a';

export const VALID_READINESS_CHECK_CODES: ReadinessCheckCode[] = [
  'AVOR_DONE',
  'MATERIAL_READY',
  'FITTINGS_READY',
  'PLANS_READY',
  'SITE_READY',
];

export const VALID_READINESS_STATUSES: ReadinessStatus[] = ['pending', 'ok', 'blocked', 'n_a'];

export interface ProjectReadinessCheck {
  id: string;
  project_id: string;
  owner_id: string;
  check_code: ReadinessCheckCode;
  status: ReadinessStatus;
  checked_by: string | null;
  checked_at: string | null;
  comment: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ProjectReadinessCheckResponse {
  id: string;
  projectId: string;
  ownerId: string;
  checkCode: ReadinessCheckCode;
  checkLabel: string;
  status: ReadinessStatus;
  checkedBy: string | null;
  checkedAt: string | null;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface ProjectReadinessCheckInput {
  checkCode: ReadinessCheckCode;
  status: ReadinessStatus;
  comment?: string | null;
  checkedAt?: string | null;
}

export interface ProjectReadinessSummary {
  projectId: string;
  ownerId: string;
  totalChecks: number;
  okCount: number;
  naCount: number;
  pendingCount: number;
  blockedCount: number;
  isReady: boolean;
  updatedAt: string | null;
}

export const READINESS_CHECK_LABELS: Record<ReadinessCheckCode, string> = {
  AVOR_DONE: 'AVOR completed',
  MATERIAL_READY: 'Material available',
  FITTINGS_READY: 'Fittings available',
  PLANS_READY: 'Plans approved',
  SITE_READY: 'Site release',
};

export const DEFAULT_PROJECT_READINESS_CHECKS: ReadinessCheckCode[] = [
  'AVOR_DONE',
  'MATERIAL_READY',
  'FITTINGS_READY',
  'PLANS_READY',
  'SITE_READY',
];

export const toProjectReadinessCheckResponse = (
  check: ProjectReadinessCheck
): ProjectReadinessCheckResponse => ({
  id: check.id,
  projectId: check.project_id,
  ownerId: check.owner_id,
  checkCode: check.check_code,
  checkLabel: READINESS_CHECK_LABELS[check.check_code],
  status: check.status,
  checkedBy: check.checked_by,
  checkedAt: check.checked_at,
  comment: check.comment,
  createdAt: check.created_at,
  updatedAt: check.updated_at,
  deletedAt: check.deleted_at,
});
