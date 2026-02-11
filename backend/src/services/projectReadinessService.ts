import type { PoolClient } from 'pg';
import { pool } from '../config/database';
import {
  DEFAULT_PROJECT_READINESS_CHECKS,
  READINESS_CHECK_LABELS,
  VALID_READINESS_CHECK_CODES,
  type ProjectReadinessCheck,
  type ProjectReadinessCheckInput,
  type ProjectReadinessSummary,
  type ReadinessCheckCode,
  type ReadinessStatus,
} from '../models/projectReadiness';

type Queryable = Pick<PoolClient, 'query'>;

export class ProjectReadinessValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProjectReadinessValidationError';
  }
}

export interface DefaultReadinessCheckTemplate {
  checkCode: ReadinessCheckCode;
  checkLabel: string;
  status: ReadinessStatus;
}

const CHECK_SORT_ORDER: Record<ReadinessCheckCode, number> = {
  AVOR_DONE: 10,
  MATERIAL_READY: 20,
  FITTINGS_READY: 30,
  PLANS_READY: 40,
  SITE_READY: 50,
};

const assertProjectOwnership = async (
  client: Queryable,
  projectId: string,
  ownerId: string
): Promise<void> => {
  const result = await client.query<{ id: string }>(
    `SELECT id
     FROM projects
     WHERE id = $1 AND owner_id = $2 AND deleted_at IS NULL`,
    [projectId, ownerId]
  );

  if (result.rows.length === 0) {
    throw new Error('Project not found');
  }
};

const listChecksWithClient = async (
  client: Queryable,
  projectId: string,
  ownerId: string
): Promise<ProjectReadinessCheck[]> => {
  const result = await client.query<ProjectReadinessCheck>(
    `SELECT *
     FROM project_readiness_checks
     WHERE project_id = $1
       AND owner_id = $2
       AND deleted_at IS NULL
     ORDER BY
       CASE check_code
         WHEN 'AVOR_DONE' THEN 10
         WHEN 'MATERIAL_READY' THEN 20
         WHEN 'FITTINGS_READY' THEN 30
         WHEN 'PLANS_READY' THEN 40
         WHEN 'SITE_READY' THEN 50
         ELSE 999
       END ASC,
       created_at ASC`,
    [projectId, ownerId]
  );

  return result.rows;
};

const normalizeInputChecks = (
  checks: ProjectReadinessCheckInput[]
): ProjectReadinessCheckInput[] => {
  if (checks.length === 0) {
    throw new ProjectReadinessValidationError('checks must not be empty');
  }

  const uniqueCodes = new Set<ReadinessCheckCode>();
  checks.forEach((check) => {
    if (uniqueCodes.has(check.checkCode)) {
      throw new ProjectReadinessValidationError(`duplicate checkCode: ${check.checkCode}`);
    }
    uniqueCodes.add(check.checkCode);
  });

  return checks;
};

const insertMissingDefaultChecks = async (
  client: Queryable,
  projectId: string,
  ownerId: string
): Promise<void> => {
  await client.query(
    `INSERT INTO project_readiness_checks (project_id, owner_id, check_code, status)
     SELECT $1, $2, c.code, 'pending'
     FROM unnest($3::varchar[]) AS c(code)
     WHERE NOT EXISTS (
       SELECT 1
       FROM project_readiness_checks prc
       WHERE prc.project_id = $1
         AND prc.owner_id = $2
         AND prc.check_code = c.code
         AND prc.deleted_at IS NULL
     )`,
    [projectId, ownerId, DEFAULT_PROJECT_READINESS_CHECKS]
  );
};

export const getDefaultReadinessTemplate = (): DefaultReadinessCheckTemplate[] =>
  DEFAULT_PROJECT_READINESS_CHECKS
    .map((checkCode) => ({
      checkCode,
      checkLabel: READINESS_CHECK_LABELS[checkCode],
      status: 'pending' as ReadinessStatus,
    }))
    .sort((a, b) => CHECK_SORT_ORDER[a.checkCode] - CHECK_SORT_ORDER[b.checkCode]);

export async function initializeProjectReadinessChecks(
  projectId: string,
  ownerId: string
): Promise<ProjectReadinessCheck[]> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await assertProjectOwnership(client, projectId, ownerId);
    await insertMissingDefaultChecks(client, projectId, ownerId);
    const checks = await listChecksWithClient(client, projectId, ownerId);
    await client.query('COMMIT');
    return checks;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function listProjectReadinessChecks(
  projectId: string,
  ownerId: string
): Promise<ProjectReadinessCheck[]> {
  await initializeProjectReadinessChecks(projectId, ownerId);
  return listChecksWithClient(pool, projectId, ownerId);
}

export async function updateProjectReadinessChecks(
  projectId: string,
  ownerId: string,
  checks: ProjectReadinessCheckInput[],
  actorUserId: string
): Promise<ProjectReadinessCheck[]> {
  const normalizedChecks = normalizeInputChecks(checks);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await assertProjectOwnership(client, projectId, ownerId);
    await insertMissingDefaultChecks(client, projectId, ownerId);

    for (const check of normalizedChecks) {
      if (!VALID_READINESS_CHECK_CODES.includes(check.checkCode)) {
        throw new ProjectReadinessValidationError(`invalid checkCode: ${check.checkCode}`);
      }

      const checkedAt =
        check.status === 'pending' ? null : check.checkedAt ?? new Date().toISOString();
      const checkedBy = check.status === 'pending' ? null : actorUserId;

      const updateResult = await client.query(
        `UPDATE project_readiness_checks
         SET status = $1,
             checked_by = $2,
             checked_at = $3,
             comment = $4,
             deleted_at = NULL,
             updated_at = NOW()
         WHERE project_id = $5
           AND owner_id = $6
           AND check_code = $7
           AND deleted_at IS NULL`,
        [check.status, checkedBy, checkedAt, check.comment ?? null, projectId, ownerId, check.checkCode]
      );

      if ((updateResult.rowCount ?? 0) === 0) {
        await client.query(
          `INSERT INTO project_readiness_checks (
             project_id, owner_id, check_code, status, checked_by, checked_at, comment
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [projectId, ownerId, check.checkCode, check.status, checkedBy, checkedAt, check.comment ?? null]
        );
      }
    }

    const result = await listChecksWithClient(client, projectId, ownerId);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function getProjectReadinessSummary(
  projectId: string,
  ownerId: string
): Promise<ProjectReadinessSummary> {
  const checks = await listProjectReadinessChecks(projectId, ownerId);

  const okCount = checks.filter((check) => check.status === 'ok').length;
  const naCount = checks.filter((check) => check.status === 'n_a').length;
  const pendingCount = checks.filter((check) => check.status === 'pending').length;
  const blockedCount = checks.filter((check) => check.status === 'blocked').length;
  const totalChecks = checks.length;

  const updatedAt = checks
    .map((check) => check.updated_at)
    .filter((value): value is string => Boolean(value))
    .sort()
    .slice(-1)[0] ?? null;

  return {
    projectId,
    ownerId,
    totalChecks,
    okCount,
    naCount,
    pendingCount,
    blockedCount,
    isReady: totalChecks > 0 && pendingCount === 0 && blockedCount === 0,
    updatedAt,
  };
}
