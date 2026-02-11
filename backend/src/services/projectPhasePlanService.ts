import type { PoolClient } from 'pg';
import { pool } from '../config/database';
import type { PhaseCode, Task } from '../models/task';
import { VALID_PHASE_CODES } from '../models/task';
import {
  DEFAULT_PHASE_LABELS,
  DEFAULT_PROJECT_PHASE_PLAN,
  type ProjectPhasePlan,
  type ProjectPhasePlanInput,
} from '../models/projectPhasePlan';

type Queryable = Pick<PoolClient, 'query'>;

export interface SyncProjectPhasePlanOptions {
  replaceExistingPhaseTasks?: boolean;
}

export class ProjectPhasePlanValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProjectPhasePlanValidationError';
  }
}

export interface SyncProjectPhasePlanResult {
  createdTaskIds: string[];
  updatedTaskIds: string[];
  deletedTaskIds: string[];
  warnings: string[];
}

const ensureProjectOwnership = async (
  client: Queryable,
  projectId: string,
  ownerId: string
): Promise<void> => {
  const projectResult = await client.query<{ id: string }>(
    `SELECT id
     FROM projects
     WHERE id = $1 AND owner_id = $2 AND deleted_at IS NULL`,
    [projectId, ownerId]
  );

  if (projectResult.rows.length === 0) {
    throw new Error('Project not found');
  }
};

const normalizeDependencies = (codes?: PhaseCode[]): PhaseCode[] => {
  if (!codes || codes.length === 0) {
    return [];
  }
  return Array.from(new Set(codes));
};

const resolveDurationMinutes = (plan: ProjectPhasePlan): number | null => {
  const min = plan.estimated_hours_min === null ? null : Number(plan.estimated_hours_min);
  const max = plan.estimated_hours_max === null ? null : Number(plan.estimated_hours_max);

  if (min === null && max === null) {
    return null;
  }
  if (min !== null && max !== null) {
    return Math.round(((min + max) / 2) * 60);
  }

  return Math.round((min ?? max ?? 0) * 60);
};

const resolveTaskTitle = (plan: ProjectPhasePlan): string =>
  plan.phase_label?.trim() || DEFAULT_PHASE_LABELS[plan.phase_code];

export const getDefaultProjectPhasePlan = (): ProjectPhasePlanInput[] =>
  DEFAULT_PROJECT_PHASE_PLAN.map((item) => ({
    ...item,
    dependencyPhaseCodes: item.dependencyPhaseCodes ? [...item.dependencyPhaseCodes] : [],
  }));

export async function listProjectPhasePlan(
  projectId: string,
  ownerId: string
): Promise<ProjectPhasePlan[]> {
  const result = await pool.query<ProjectPhasePlan>(
    `SELECT ppp.*
     FROM project_phase_plans ppp
     JOIN projects p ON p.id = ppp.project_id
     WHERE ppp.project_id = $1
       AND ppp.owner_id = $2
       AND p.owner_id = $2
       AND p.deleted_at IS NULL
       AND ppp.deleted_at IS NULL
     ORDER BY ppp.sequence_order ASC, ppp.created_at ASC`,
    [projectId, ownerId]
  );

  return result.rows;
}

const validatePhasePlanInputs = (phases: ProjectPhasePlanInput[]): void => {
  if (phases.length === 0) {
    throw new ProjectPhasePlanValidationError('phases must not be empty');
  }

  const phaseCodeSet = new Set<PhaseCode>();

  phases.forEach((phase) => {
    if (phaseCodeSet.has(phase.phaseCode)) {
      throw new ProjectPhasePlanValidationError(`duplicate phaseCode: ${phase.phaseCode}`);
    }
    phaseCodeSet.add(phase.phaseCode);

    if (phase.sequenceOrder < 1) {
      throw new ProjectPhasePlanValidationError(
        `invalid sequenceOrder for phaseCode ${phase.phaseCode}`
      );
    }

    const min = phase.estimatedHoursMin ?? null;
    const max = phase.estimatedHoursMax ?? null;
    if (min !== null && max !== null && min > max) {
      throw new ProjectPhasePlanValidationError(
        `estimatedHoursMin must be <= estimatedHoursMax for ${phase.phaseCode}`
      );
    }
  });

  phases.forEach((phase) => {
    const deps = normalizeDependencies(phase.dependencyPhaseCodes);
    deps.forEach((dep) => {
      if (!phaseCodeSet.has(dep)) {
        throw new ProjectPhasePlanValidationError(`dependency ${dep} is not part of phase plan`);
      }
      if (dep === phase.phaseCode) {
        throw new ProjectPhasePlanValidationError(
          `phase ${phase.phaseCode} cannot depend on itself`
        );
      }
    });
  });
};

export async function replaceProjectPhasePlan(
  projectId: string,
  ownerId: string,
  phases: ProjectPhasePlanInput[]
): Promise<ProjectPhasePlan[]> {
  validatePhasePlanInputs(phases);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await ensureProjectOwnership(client, projectId, ownerId);

    await client.query(
      `UPDATE project_phase_plans
       SET deleted_at = NOW(), updated_at = NOW()
       WHERE project_id = $1 AND owner_id = $2 AND deleted_at IS NULL`,
      [projectId, ownerId]
    );

    const sortedPhases = [...phases].sort((a, b) => a.sequenceOrder - b.sequenceOrder);

    for (const phase of sortedPhases) {
      await client.query<ProjectPhasePlan>(
        `INSERT INTO project_phase_plans (
           project_id, owner_id, phase_code, phase_label, sequence_order,
           is_required, is_enabled, estimated_hours_min, estimated_hours_max,
           dependency_phase_codes, notes
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::varchar[], $11)`,
        [
          projectId,
          ownerId,
          phase.phaseCode,
          phase.phaseLabel?.trim() || DEFAULT_PHASE_LABELS[phase.phaseCode],
          phase.sequenceOrder,
          phase.isRequired ?? true,
          phase.isEnabled ?? true,
          phase.estimatedHoursMin ?? null,
          phase.estimatedHoursMax ?? null,
          normalizeDependencies(phase.dependencyPhaseCodes),
          phase.notes ?? null,
        ]
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  return listProjectPhasePlan(projectId, ownerId);
}

const removeDependenciesBetweenTasks = async (
  client: Queryable,
  taskIds: string[]
): Promise<void> => {
  if (taskIds.length === 0) {
    return;
  }

  await client.query(
    `DELETE FROM task_dependencies
     WHERE task_id = ANY($1::uuid[]) AND depends_on_task_id = ANY($1::uuid[])`,
    [taskIds]
  );
};

export async function syncProjectPhasePlanToTasks(
  projectId: string,
  ownerId: string,
  options: SyncProjectPhasePlanOptions = {}
): Promise<SyncProjectPhasePlanResult> {
  const createdTaskIds: string[] = [];
  const updatedTaskIds: string[] = [];
  const deletedTaskIds: string[] = [];
  const warnings: string[] = [];
  const replaceExisting = options.replaceExistingPhaseTasks ?? false;

  const fullPlan = await listProjectPhasePlan(projectId, ownerId);
  const activePlan = fullPlan.filter((phase) => phase.is_enabled);

  if (activePlan.length === 0) {
    return {
      createdTaskIds,
      updatedTaskIds,
      deletedTaskIds,
      warnings: ['No enabled phases in project phase plan'],
    };
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await ensureProjectOwnership(client, projectId, ownerId);

    if (replaceExisting) {
      const existingPhaseTasks = await client.query<{ id: string }>(
        `SELECT id
         FROM tasks
         WHERE project_id = $1
           AND owner_id = $2
           AND phase_code = ANY($3::varchar[])
           AND deleted_at IS NULL`,
        [projectId, ownerId, VALID_PHASE_CODES]
      );

      const phaseTaskIds = existingPhaseTasks.rows.map((row) => row.id);
      if (phaseTaskIds.length > 0) {
        await client.query(
          `DELETE FROM task_dependencies
           WHERE task_id = ANY($1::uuid[]) OR depends_on_task_id = ANY($1::uuid[])`,
          [phaseTaskIds]
        );
        await client.query(
          `DELETE FROM task_work_slots
           WHERE task_id = ANY($1::uuid[])`,
          [phaseTaskIds]
        );
        await client.query(
          `UPDATE tasks
           SET deleted_at = NOW(), updated_at = NOW()
           WHERE id = ANY($1::uuid[])`,
          [phaseTaskIds]
        );
        deletedTaskIds.push(...phaseTaskIds);
      }
    }

    const activePhaseCodes = activePlan.map((phase) => phase.phase_code);
    const existingTaskResult = await client.query<Task>(
      `SELECT *
       FROM tasks
       WHERE project_id = $1
         AND owner_id = $2
         AND phase_code = ANY($3::varchar[])
         AND deleted_at IS NULL
       ORDER BY created_at ASC`,
      [projectId, ownerId, activePhaseCodes]
    );

    const tasksByPhase = new Map<PhaseCode, Task[]>();
    existingTaskResult.rows.forEach((task) => {
      const code = task.phase_code;
      if (!code) return;
      const list = tasksByPhase.get(code) ?? [];
      list.push(task);
      tasksByPhase.set(code, list);
    });

    const managedTaskByPhase = new Map<PhaseCode, string>();

    for (const phase of activePlan) {
      const list = tasksByPhase.get(phase.phase_code) ?? [];
      if (list.length > 1) {
        warnings.push(
          `Phase ${phase.phase_code} has ${list.length} tasks; first one is used as managed task`
        );
      }

      const durationMinutes = resolveDurationMinutes(phase);
      const taskTitle = resolveTaskTitle(phase);

      if (list.length > 0) {
        const managedTask = list[0];
        await client.query(
          `UPDATE tasks
           SET title = $1,
               duration_minutes = $2,
               phase_code = $3,
               status = CASE WHEN status = 'done' THEN status ELSE 'planned' END,
               updated_at = NOW()
           WHERE id = $4 AND owner_id = $5`,
          [taskTitle, durationMinutes, phase.phase_code, managedTask.id, ownerId]
        );
        updatedTaskIds.push(managedTask.id);
        managedTaskByPhase.set(phase.phase_code, managedTask.id);
      } else {
        const created = await client.query<{ id: string }>(
          `INSERT INTO tasks (
             project_id, owner_id, title, status, scheduling_mode, duration_minutes, phase_code
           )
           VALUES ($1, $2, $3, 'planned', 'manual', $4, $5)
           RETURNING id`,
          [projectId, ownerId, taskTitle, durationMinutes, phase.phase_code]
        );
        const newTaskId = created.rows[0].id;
        createdTaskIds.push(newTaskId);
        managedTaskByPhase.set(phase.phase_code, newTaskId);
      }
    }

    const managedTaskIds = Array.from(managedTaskByPhase.values());
    await removeDependenciesBetweenTasks(client, managedTaskIds);

    for (let index = 0; index < activePlan.length; index++) {
      const phase = activePlan[index];
      const taskId = managedTaskByPhase.get(phase.phase_code);
      if (!taskId) continue;

      const explicitDeps = normalizeDependencies(phase.dependency_phase_codes ?? []);
      const dependencyCodes = explicitDeps.length > 0
        ? explicitDeps
        : index > 0
          ? [activePlan[index - 1].phase_code]
          : [];

      for (const depCode of dependencyCodes) {
        const depTaskId = managedTaskByPhase.get(depCode);
        if (!depTaskId || depTaskId === taskId) {
          continue;
        }
        await client.query(
          `INSERT INTO task_dependencies (task_id, depends_on_task_id, dependency_type)
           VALUES ($1, $2, 'finish_start')
           ON CONFLICT (task_id, depends_on_task_id, dependency_type) DO NOTHING`,
          [taskId, depTaskId]
        );
      }
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  return {
    createdTaskIds,
    updatedTaskIds,
    deletedTaskIds,
    warnings,
  };
}
