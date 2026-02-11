import { pool } from '../config/database';
import type { Task } from '../models/task';

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

type AutoScheduleTaskAction = 'create' | 'update' | 'unchanged' | 'skipped';

interface ExistingTaskSlot {
  task_id: string;
  start_time: string;
  end_time: string;
  is_fixed: boolean;
}

interface ResourceConflictCandidate {
  task_id: string;
  task_title: string;
  resource_id: string;
  resource_name: string | null;
  start_time: string;
  end_time: string;
}

export interface AutoSchedulePreviewTaskSlot {
  startTime: string;
  endTime: string;
}

export interface AutoSchedulePreviewTask {
  taskId: string;
  title: string;
  phaseCode: string | null;
  resourceId: string | null;
  action: AutoScheduleTaskAction;
  reason: string | null;
  durationMinutes: number | null;
  startDate: string | null;
  dueDate: string | null;
  slotCount: number;
  slots: AutoSchedulePreviewTaskSlot[];
}

export interface AutoSchedulePreviewConflict {
  taskId: string;
  taskTitle: string;
  resourceId: string;
  resourceName: string | null;
  proposedStartTime: string;
  proposedEndTime: string;
  conflictTaskId: string;
  conflictTaskTitle: string;
  conflictStartTime: string;
  conflictEndTime: string;
}

export interface AutoSchedulePreviewSummary {
  selectedTaskCount: number;
  scheduledTaskCount: number;
  skippedTaskCount: number;
  createCount: number;
  updateCount: number;
  unchangedCount: number;
  conflictCount: number;
}

export interface AutoSchedulePreviewResult {
  projectId: string;
  ownerId: string;
  endDate: string;
  taskIds: string[];
  summary: AutoSchedulePreviewSummary;
  tasks: AutoSchedulePreviewTask[];
  warnings: string[];
  conflicts: AutoSchedulePreviewConflict[];
  createdAt: string;
}

export interface AutoSchedulePreviewOptions {
  projectId: string;
  ownerId: string;
  taskIds: string[];
  endDate: string;
  includeWeekends: boolean;
  workdayStart: string;
  workdayEnd: string;
}

const toDateKey = (value: Date): string => value.toISOString().split('T')[0];

const parseWorkdayWindow = (
  workdayStart: string,
  workdayEnd: string
): { startH: number; startM: number; endH: number; endM: number; workdayMinutes: number } => {
  const [startH, startM] = workdayStart.split(':').map(Number);
  const [endH, endM] = workdayEnd.split(':').map(Number);
  const workdayMinutes = endH * 60 + endM - (startH * 60 + startM);

  return { startH, startM, endH, endM, workdayMinutes };
};

const buildSummary = (
  taskIds: string[],
  taskPlans: AutoSchedulePreviewTask[],
  conflicts: AutoSchedulePreviewConflict[]
): AutoSchedulePreviewSummary => {
  const createCount = taskPlans.filter((task) => task.action === 'create').length;
  const updateCount = taskPlans.filter((task) => task.action === 'update').length;
  const unchangedCount = taskPlans.filter((task) => task.action === 'unchanged').length;
  const skippedCount = taskPlans.filter((task) => task.action === 'skipped').length;

  return {
    selectedTaskCount: taskIds.length,
    scheduledTaskCount: taskPlans.length - skippedCount,
    skippedTaskCount: skippedCount,
    createCount,
    updateCount,
    unchangedCount,
    conflictCount: conflicts.length,
  };
};

const slotsMatch = (
  existingSlots: ExistingTaskSlot[],
  nextSlots: AutoSchedulePreviewTaskSlot[]
): boolean => {
  if (existingSlots.length !== nextSlots.length) {
    return false;
  }

  for (let i = 0; i < existingSlots.length; i += 1) {
    const existingStart = new Date(existingSlots[i].start_time).getTime();
    const existingEnd = new Date(existingSlots[i].end_time).getTime();
    const nextStart = new Date(nextSlots[i].startTime).getTime();
    const nextEnd = new Date(nextSlots[i].endTime).getTime();
    if (existingStart !== nextStart || existingEnd !== nextEnd) {
      return false;
    }
  }

  return true;
};

const overlap = (aStart: string, aEnd: string, bStart: string, bEnd: string): boolean => {
  const aStartMs = new Date(aStart).getTime();
  const aEndMs = new Date(aEnd).getTime();
  const bStartMs = new Date(bStart).getTime();
  const bEndMs = new Date(bEnd).getTime();
  return aStartMs < bEndMs && bStartMs < aEndMs;
};

export function getISOWeek(date: Date): { kw: number; year: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const kw = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return { kw, year: d.getUTCFullYear() };
}

const fetchTasksByIds = async (
  projectId: string,
  ownerId: string,
  taskIds: string[]
): Promise<Map<string, Task>> => {
  const taskResult = await pool.query<Task>(
    `SELECT *
     FROM tasks
     WHERE id = ANY($1::uuid[])
       AND owner_id = $2
       AND project_id = $3
       AND deleted_at IS NULL`,
    [taskIds, ownerId, projectId]
  );
  return new Map(taskResult.rows.map((row) => [row.id, row]));
};

const fetchExistingTaskSlots = async (
  ownerId: string,
  taskIds: string[]
): Promise<Map<string, ExistingTaskSlot[]>> => {
  const slotResult = await pool.query<ExistingTaskSlot>(
    `SELECT tws.task_id, tws.start_time, tws.end_time, tws.is_fixed
     FROM task_work_slots tws
     JOIN tasks t ON t.id = tws.task_id
     WHERE tws.task_id = ANY($1::uuid[])
       AND t.owner_id = $2
       AND t.deleted_at IS NULL
     ORDER BY tws.task_id ASC, tws.start_time ASC`,
    [taskIds, ownerId]
  );

  const slotsByTaskId = new Map<string, ExistingTaskSlot[]>();
  slotResult.rows.forEach((slot) => {
    const list = slotsByTaskId.get(slot.task_id);
    if (list) {
      list.push(slot);
    } else {
      slotsByTaskId.set(slot.task_id, [slot]);
    }
  });

  return slotsByTaskId;
};

const fetchResourceConflictCandidates = async (
  ownerId: string,
  resourceIds: string[],
  selectedTaskIds: string[]
): Promise<ResourceConflictCandidate[]> => {
  if (resourceIds.length === 0) {
    return [];
  }

  const result = await pool.query<ResourceConflictCandidate>(
    `SELECT tws.task_id,
            t.title AS task_title,
            t.resource_id,
            r.name AS resource_name,
            tws.start_time,
            tws.end_time
     FROM task_work_slots tws
     JOIN tasks t ON t.id = tws.task_id
     LEFT JOIN resources r ON r.id = t.resource_id
     WHERE t.owner_id = $1
       AND t.deleted_at IS NULL
       AND t.resource_id = ANY($2::uuid[])
       AND NOT (t.id = ANY($3::uuid[]))
     ORDER BY tws.start_time ASC`,
    [ownerId, resourceIds, selectedTaskIds]
  );

  return result.rows;
};

export async function buildAutoSchedulePreview(
  options: AutoSchedulePreviewOptions
): Promise<AutoSchedulePreviewResult> {
  const {
    projectId,
    ownerId,
    taskIds,
    endDate,
    includeWeekends,
    workdayStart,
    workdayEnd,
  } = options;

  const warnings: string[] = [];
  const taskMap = await fetchTasksByIds(projectId, ownerId, taskIds);
  const existingSlotsByTaskId = await fetchExistingTaskSlots(ownerId, taskIds);
  const taskPlans: AutoSchedulePreviewTask[] = [];

  const { startH, startM, endH, endM, workdayMinutes } = parseWorkdayWindow(
    workdayStart,
    workdayEnd
  );

  if (workdayMinutes <= 0) {
    taskIds.forEach((taskId) => {
      const task = taskMap.get(taskId);
      const title = task?.title ?? taskId;
      taskPlans.push({
        taskId,
        title,
        phaseCode: task?.phase_code ?? null,
        resourceId: task?.resource_id ?? null,
        action: 'skipped',
        reason: 'Invalid workday configuration',
        durationMinutes: task?.duration_minutes ?? null,
        startDate: null,
        dueDate: null,
        slotCount: 0,
        slots: [],
      });
    });
    warnings.push('Invalid workday configuration');

    return {
      projectId,
      ownerId,
      endDate,
      taskIds,
      summary: buildSummary(taskIds, taskPlans, []),
      tasks: taskPlans,
      warnings,
      conflicts: [],
      createdAt: new Date().toISOString(),
    };
  }

  let cursor = new Date(`${endDate}T00:00:00`);
  cursor.setHours(endH, endM, 0, 0);

  const isWorkday = (date: Date): boolean => {
    const day = date.getDay();
    if (includeWeekends) {
      return true;
    }
    return day !== 0 && day !== 6;
  };

  const prevWorkday = (date: Date): Date => {
    const d = new Date(date);
    d.setDate(d.getDate() - 1);
    while (!isWorkday(d)) {
      d.setDate(d.getDate() - 1);
    }
    return d;
  };

  for (let i = taskIds.length - 1; i >= 0; i -= 1) {
    const taskId = taskIds[i];
    const task = taskMap.get(taskId);

    if (!task) {
      warnings.push(`Task ${taskId} not found`);
      taskPlans.push({
        taskId,
        title: taskId,
        phaseCode: null,
        resourceId: null,
        action: 'skipped',
        reason: 'Task not found',
        durationMinutes: null,
        startDate: null,
        dueDate: null,
        slotCount: 0,
        slots: [],
      });
      continue;
    }

    const existingSlots = existingSlotsByTaskId.get(taskId) ?? [];
    if (existingSlots.some((slot) => slot.is_fixed)) {
      warnings.push(`Task "${task.title}" has fixed work slots and was skipped`);
      taskPlans.push({
        taskId,
        title: task.title,
        phaseCode: task.phase_code,
        resourceId: task.resource_id,
        action: 'skipped',
        reason: 'Has fixed work slots',
        durationMinutes: task.duration_minutes,
        startDate: task.start_date,
        dueDate: task.due_date,
        slotCount: 0,
        slots: [],
      });
      continue;
    }

    if (!task.duration_minutes || task.duration_minutes <= 0) {
      warnings.push(`Task "${task.title}" has no duration, skipped`);
      taskPlans.push({
        taskId,
        title: task.title,
        phaseCode: task.phase_code,
        resourceId: task.resource_id,
        action: 'skipped',
        reason: 'No duration configured',
        durationMinutes: task.duration_minutes,
        startDate: null,
        dueDate: null,
        slotCount: 0,
        slots: [],
      });
      continue;
    }

    while (!isWorkday(cursor)) {
      const prev = prevWorkday(cursor);
      cursor = new Date(prev);
      cursor.setHours(endH, endM, 0, 0);
    }

    let remainingMinutes = task.duration_minutes;
    const slots: AutoSchedulePreviewTaskSlot[] = [];

    while (remainingMinutes > 0) {
      const cursorMinutesInDay = cursor.getHours() * 60 + cursor.getMinutes();
      const workdayStartMinutes = startH * 60 + startM;
      const availableInDay = cursorMinutesInDay - workdayStartMinutes;

      if (availableInDay <= 0) {
        const prev = prevWorkday(cursor);
        cursor = new Date(prev);
        cursor.setHours(endH, endM, 0, 0);
        continue;
      }

      const slotMinutes = Math.min(remainingMinutes, availableInDay);
      const slotEnd = new Date(cursor);
      const slotStart = new Date(cursor);
      slotStart.setMinutes(slotStart.getMinutes() - slotMinutes);

      slots.unshift({
        startTime: slotStart.toISOString(),
        endTime: slotEnd.toISOString(),
      });
      remainingMinutes -= slotMinutes;
      cursor = new Date(slotStart);

      if (cursor.getHours() * 60 + cursor.getMinutes() <= workdayStartMinutes) {
        const prev = prevWorkday(cursor);
        cursor = new Date(prev);
        cursor.setHours(endH, endM, 0, 0);
      }
    }

    const startDate = slots[0] ? toDateKey(new Date(slots[0].startTime)) : null;
    const dueDate = slots[slots.length - 1]
      ? toDateKey(new Date(slots[slots.length - 1].endTime))
      : null;

    const hasExistingSchedule =
      existingSlots.length > 0 || task.start_date !== null || task.due_date !== null;

    let action: AutoScheduleTaskAction = 'create';
    if (hasExistingSchedule) {
      const sameDates = task.start_date === startDate && task.due_date === dueDate;
      action = sameDates && slotsMatch(existingSlots, slots) ? 'unchanged' : 'update';
    }

    taskPlans.push({
      taskId,
      title: task.title,
      phaseCode: task.phase_code,
      resourceId: task.resource_id,
      action,
      reason: null,
      durationMinutes: task.duration_minutes,
      startDate,
      dueDate,
      slotCount: slots.length,
      slots,
    });
  }

  taskPlans.sort(
    (a, b) => taskIds.indexOf(a.taskId) - taskIds.indexOf(b.taskId)
  );

  const resourceIds = Array.from(
    new Set(
      taskPlans
        .filter((task) => task.action !== 'skipped' && Boolean(task.resourceId))
        .map((task) => task.resourceId as string)
    )
  );

  const conflictCandidates = await fetchResourceConflictCandidates(
    ownerId,
    resourceIds,
    taskIds
  );

  const conflicts: AutoSchedulePreviewConflict[] = [];
  taskPlans
    .filter((task) => task.action !== 'skipped' && task.resourceId)
    .forEach((task) => {
      const candidates = conflictCandidates.filter(
        (candidate) => candidate.resource_id === task.resourceId
      );

      task.slots.forEach((slot) => {
        candidates.forEach((candidate) => {
          if (overlap(slot.startTime, slot.endTime, candidate.start_time, candidate.end_time)) {
            conflicts.push({
              taskId: task.taskId,
              taskTitle: task.title,
              resourceId: task.resourceId as string,
              resourceName: candidate.resource_name,
              proposedStartTime: slot.startTime,
              proposedEndTime: slot.endTime,
              conflictTaskId: candidate.task_id,
              conflictTaskTitle: candidate.task_title,
              conflictStartTime: candidate.start_time,
              conflictEndTime: candidate.end_time,
            });
          }
        });
      });
    });

  if (conflicts.length > 0) {
    warnings.push(`Detected ${conflicts.length} resource conflict(s) in the preview`);
  }

  return {
    projectId,
    ownerId,
    endDate,
    taskIds,
    summary: buildSummary(taskIds, taskPlans, conflicts),
    tasks: taskPlans,
    warnings,
    conflicts,
    createdAt: new Date().toISOString(),
  };
}

export interface AutoScheduleApplyResult {
  scheduledTaskIds: string[];
  skippedTaskIds: string[];
  warnings: string[];
}

export async function applyAutoSchedulePreview(
  ownerId: string,
  preview: AutoSchedulePreviewResult
): Promise<AutoScheduleApplyResult> {
  const warnings = [...preview.warnings];
  const scheduledTaskIds: string[] = [];
  const skippedTaskIds: string[] = preview.tasks
    .filter((task) => task.action === 'skipped')
    .map((task) => task.taskId);

  const rewrittenTaskIds = preview.tasks
    .filter((task) => task.action === 'create' || task.action === 'update')
    .map((task) => task.taskId);

  if (rewrittenTaskIds.length > 0) {
    await pool.query(
      `DELETE FROM task_work_slots
       WHERE task_id = ANY($1::uuid[])
         AND task_id IN (SELECT id FROM tasks WHERE owner_id = $2)`,
      [rewrittenTaskIds, ownerId]
    );
  }

  for (const task of preview.tasks) {
    if (task.action === 'skipped') {
      continue;
    }

    if (task.action === 'create' || task.action === 'update') {
      await pool.query(
        `UPDATE tasks
         SET start_date = $1,
             due_date = $2,
             updated_at = NOW()
         WHERE id = $3
           AND owner_id = $4`,
        [task.startDate, task.dueDate, task.taskId, ownerId]
      );

      for (const slot of task.slots) {
        await pool.query(
          `INSERT INTO task_work_slots (task_id, start_time, end_time, is_fixed, is_all_day, reminder_enabled)
           VALUES ($1, $2, $3, false, false, false)`,
          [task.taskId, slot.startTime, slot.endTime]
        );
      }
    }

    if (task.phaseCode && task.dueDate) {
      const dbPhase = PHASE_CODE_TO_DB_PHASE[task.phaseCode] ?? task.phaseCode.toLowerCase();
      const { kw, year } = getISOWeek(new Date(`${task.dueDate}T00:00:00`));
      try {
        await pool.query(
          `INSERT INTO task_phase_schedules (task_id, phase, planned_kw, planned_year, status)
           VALUES ($1, $2::production_phase, $3, $4, 'planned')
           ON CONFLICT (task_id, phase) DO UPDATE SET
             planned_kw = EXCLUDED.planned_kw,
             planned_year = EXCLUDED.planned_year,
             updated_at = NOW()`,
          [task.taskId, dbPhase, kw, year]
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        warnings.push(`Task "${task.title}": phase schedule publish failed (${message})`);
      }
    } else if (!task.phaseCode) {
      warnings.push(`Task "${task.title}" has no phase_code, skipped Wochenplan publish`);
    }

    scheduledTaskIds.push(task.taskId);
  }

  return {
    scheduledTaskIds,
    skippedTaskIds,
    warnings,
  };
}
