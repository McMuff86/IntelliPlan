import { pool } from '../config/database';
import {
  Appointment,
  CreateAppointmentDTO,
  UpdateAppointmentDTO,
  OverlapResult,
  toAppointmentResponse,
} from '../models/appointment';
import {
  differenceInMinutes,
  isWeekend,
  parseISO,
  setHours,
  setMinutes,
  setSeconds,
  startOfDay,
  subDays,
  subMinutes,
} from 'date-fns';
import path from 'path';
import { promises as fs } from 'fs';

export interface ReversePlanTaskInput {
  id?: string;
  title: string;
  durationMinutes: number;
  resourceId?: string;
  resourceLabel?: string;
}

export interface ReversePlanResourceInput {
  id: string;
  name: string;
  availability?: { start: string; end: string };
}

export interface ReversePlanResult {
  schedule: {
    taskId?: string;
    title: string;
    startTime: string;
    endTime: string;
    resourceId?: string;
    resourceLabel?: string;
  }[];
  endDate: string;
  timezone: string;
  warnings?: string[];
  promptTemplate?: string;
}

export interface ReversePlanOptions {
  userId: string;
  endDate: string;
  tasks: ReversePlanTaskInput[];
  resources?: ReversePlanResourceInput[];
  timezone?: string;
  includeWeekends?: boolean;
  workdayStart?: string;
  workdayEnd?: string;
}

export interface ListAppointmentsOptions {
  userId: string;
  start?: string;
  end?: string;
  limit?: number;
  offset?: number;
  isAdmin?: boolean;
  filterUserId?: string;
  teamId?: string;
  includeTeam?: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

export async function createAppointment(data: CreateAppointmentDTO): Promise<Appointment> {
  const { title, description, start_time, end_time, timezone = 'UTC', user_id } = data;

  const result = await pool.query<Appointment>(
    `INSERT INTO appointments (title, description, start_time, end_time, timezone, user_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [title, description || null, start_time, end_time, timezone, user_id]
  );

  return result.rows[0];
}

export async function getAppointments(
  options: ListAppointmentsOptions
): Promise<PaginatedResult<Appointment>> {
  const {
    userId,
    start,
    end,
    limit = 50,
    offset = 0,
    isAdmin = false,
    filterUserId,
    teamId,
    includeTeam = false,
  } = options;
  const params: (string | number)[] = [];
  let whereClause = 'WHERE a.deleted_at IS NULL';
  let paramIndex = 1;
  let joinClause = '';

  if (isAdmin) {
    if (filterUserId) {
      whereClause += ` AND a.user_id = $${paramIndex}`;
      params.push(filterUserId);
      paramIndex++;
    }
  } else if (includeTeam && teamId) {
    joinClause = ' JOIN users u ON a.user_id = u.id';
    whereClause += ` AND u.team_id = $${paramIndex}`;
    params.push(teamId);
    paramIndex++;
  } else {
    whereClause += ` AND a.user_id = $${paramIndex}`;
    params.push(userId);
    paramIndex++;
  }

  if (start) {
    whereClause += ` AND a.start_time >= $${paramIndex}`;
    params.push(start);
    paramIndex++;
  }

  if (end) {
    whereClause += ` AND a.end_time <= $${paramIndex}`;
    params.push(end);
    paramIndex++;
  }

  const countResult = await pool.query<{ count: string }>(
    `SELECT COUNT(*) as count FROM appointments a${joinClause} ${whereClause}`,
    params
  );

  params.push(limit, offset);
  const result = await pool.query<Appointment>(
    `SELECT a.* FROM appointments a${joinClause} ${whereClause} ORDER BY a.start_time ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    params
  );

  return {
    data: result.rows,
    total: parseInt(countResult.rows[0].count, 10),
    limit,
    offset,
  };
}

export interface GetAppointmentByIdOptions {
  id: string;
  userId: string;
  isAdmin?: boolean;
  teamId?: string;
}

export async function getAppointmentById(
  options: GetAppointmentByIdOptions
): Promise<Appointment | null>;
export async function getAppointmentById(
  id: string,
  userId: string,
  isAdmin?: boolean
): Promise<Appointment | null>;
export async function getAppointmentById(
  idOrOptions: string | GetAppointmentByIdOptions,
  userIdArg?: string,
  isAdminArg?: boolean
): Promise<Appointment | null> {
  let id: string;
  let userId: string;
  let isAdmin = false;
  let teamId: string | undefined;

  if (typeof idOrOptions === 'object') {
    id = idOrOptions.id;
    userId = idOrOptions.userId;
    isAdmin = idOrOptions.isAdmin || false;
    teamId = idOrOptions.teamId;
  } else {
    id = idOrOptions;
    userId = userIdArg!;
    isAdmin = isAdminArg || false;
  }

  if (isAdmin) {
    const result = await pool.query<Appointment>(
      `SELECT * FROM appointments WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );
    return result.rows[0] || null;
  }

  if (teamId) {
    const result = await pool.query<Appointment>(
      `SELECT a.* FROM appointments a
       JOIN users u ON a.user_id = u.id
       WHERE a.id = $1 AND a.deleted_at IS NULL AND u.team_id = $2`,
      [id, teamId]
    );
    return result.rows[0] || null;
  }

  const result = await pool.query<Appointment>(
    `SELECT * FROM appointments WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
    [id, userId]
  );

  return result.rows[0] || null;
}

export async function getAppointmentOwner(id: string): Promise<string | null> {
  const result = await pool.query<{ user_id: string }>(
    `SELECT user_id FROM appointments WHERE id = $1 AND deleted_at IS NULL`,
    [id]
  );

  return result.rows[0]?.user_id || null;
}

export async function updateAppointment(
  id: string,
  data: UpdateAppointmentDTO
): Promise<Appointment | null> {
  const fields: string[] = [];
  const values: (string | undefined)[] = [];
  let paramIndex = 1;

  if (data.title !== undefined) {
    fields.push(`title = $${paramIndex++}`);
    values.push(data.title);
  }
  if (data.description !== undefined) {
    fields.push(`description = $${paramIndex++}`);
    values.push(data.description);
  }
  if (data.start_time !== undefined) {
    fields.push(`start_time = $${paramIndex++}`);
    values.push(data.start_time);
  }
  if (data.end_time !== undefined) {
    fields.push(`end_time = $${paramIndex++}`);
    values.push(data.end_time);
  }
  if (data.timezone !== undefined) {
    fields.push(`timezone = $${paramIndex++}`);
    values.push(data.timezone);
  }

  if (fields.length === 0) {
    return getAppointmentById(id, '');
  }

  fields.push(`updated_at = NOW()`);
  values.push(id);

  const result = await pool.query<Appointment>(
    `UPDATE appointments SET ${fields.join(', ')} WHERE id = $${paramIndex} AND deleted_at IS NULL RETURNING *`,
    values
  );

  return result.rows[0] || null;
}

export async function deleteAppointment(id: string): Promise<boolean> {
  const result = await pool.query(
    `UPDATE appointments SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL`,
    [id]
  );

  return result.rowCount !== null && result.rowCount > 0;
}

export interface CheckOverlapOptions {
  userId: string;
  startTime: string;
  endTime: string;
  excludeId?: string;
}

export async function checkOverlap(options: CheckOverlapOptions): Promise<OverlapResult> {
  const { userId, startTime, endTime, excludeId } = options;

  const params: string[] = [userId, startTime, endTime];
  let excludeClause = '';

  if (excludeId) {
    excludeClause = ' AND id != $4';
    params.push(excludeId);
  }

  const result = await pool.query<Appointment>(
    `SELECT * FROM appointments 
     WHERE user_id = $1 
       AND deleted_at IS NULL
       AND start_time < $3 
       AND end_time > $2
       ${excludeClause}
     ORDER BY start_time ASC`,
    params
  );

  return {
    hasOverlap: result.rows.length > 0,
    conflicts: result.rows.map(toAppointmentResponse),
  };
}

const parseTimeString = (value: string) => {
  const [hours, minutes] = value.split(':').map((part) => Number(part));
  return { hours: Number.isNaN(hours) ? 0 : hours, minutes: Number.isNaN(minutes) ? 0 : minutes };
};

const setTimeOnDate = (date: Date, timeValue: string): Date => {
  const { hours, minutes } = parseTimeString(timeValue);
  return setSeconds(setMinutes(setHours(date, hours), minutes), 0);
};

const moveToPreviousWorkdayEnd = (
  date: Date,
  includeWeekends: boolean,
  workdayEnd: string
): Date => {
  let cursor = subDays(startOfDay(date), 1);
  while (!includeWeekends && isWeekend(cursor)) {
    cursor = subDays(cursor, 1);
  }
  return setTimeOnDate(cursor, workdayEnd);
};

const normalizeEndDate = (
  date: Date,
  includeWeekends: boolean,
  workdayStart: string,
  workdayEnd: string
): Date => {
  let cursor = date;
  while (!includeWeekends && isWeekend(cursor)) {
    cursor = moveToPreviousWorkdayEnd(cursor, includeWeekends, workdayEnd);
  }

  const startBoundary = setTimeOnDate(cursor, workdayStart);
  const endBoundary = setTimeOnDate(cursor, workdayEnd);

  if (cursor > endBoundary) {
    return endBoundary;
  }

  if (cursor <= startBoundary) {
    return moveToPreviousWorkdayEnd(cursor, includeWeekends, workdayEnd);
  }

  return cursor;
};

const scheduleBackwards = (
  endDate: Date,
  durationMinutes: number,
  includeWeekends: boolean,
  workdayStart: string,
  workdayEnd: string
): { start: Date; end: Date } => {
  let remaining = durationMinutes;
  let cursorEnd = normalizeEndDate(endDate, includeWeekends, workdayStart, workdayEnd);

  while (remaining > 0) {
    if (!includeWeekends && isWeekend(cursorEnd)) {
      cursorEnd = moveToPreviousWorkdayEnd(cursorEnd, includeWeekends, workdayEnd);
      continue;
    }

    const dayStart = setTimeOnDate(cursorEnd, workdayStart);
    const dayEnd = setTimeOnDate(cursorEnd, workdayEnd);
    const usableEnd = cursorEnd > dayEnd ? dayEnd : cursorEnd;

    if (usableEnd <= dayStart) {
      cursorEnd = moveToPreviousWorkdayEnd(cursorEnd, includeWeekends, workdayEnd);
      continue;
    }

    const availableMinutes = differenceInMinutes(usableEnd, dayStart);
    if (remaining <= availableMinutes) {
      const start = subMinutes(usableEnd, remaining);
      return { start, end: usableEnd };
    }

    remaining -= availableMinutes;
    cursorEnd = moveToPreviousWorkdayEnd(usableEnd, includeWeekends, workdayEnd);
  }

  return { start: cursorEnd, end: cursorEnd };
};

const loadReversePlanTemplate = async (): Promise<string | undefined> => {
  const beadsDir = process.env.BEADS_DIR || path.join(process.cwd(), 'beads');
  const templatePath = path.join(beadsDir, 'templates', 'reverse-planning.md');
  try {
    const content = await fs.readFile(templatePath, 'utf-8');
    return content.trim();
  } catch {
    return undefined;
  }
};

export async function reversePlanSchedule(options: ReversePlanOptions): Promise<ReversePlanResult> {
  const {
    userId,
    endDate,
    tasks,
    timezone = 'UTC',
    includeWeekends = true,
    workdayStart = '08:00',
    workdayEnd = '17:00',
  } = options;

  const warnings: string[] = [];
  const planEndDate = parseISO(endDate);
  if (Number.isNaN(planEndDate.getTime())) {
    throw new Error('Invalid endDate');
  }

  const promptTemplate = await loadReversePlanTemplate();

  let cursorEnd = planEndDate;
  const schedule: ReversePlanResult['schedule'] = [];

  for (let i = tasks.length - 1; i >= 0; i -= 1) {
    const task = tasks[i];
    const durationMinutes = Number(task.durationMinutes);
    if (!durationMinutes || durationMinutes <= 0) {
      warnings.push(`Skipped task "${task.title}" due to invalid duration.`);
      continue;
    }

    let attempt = 0;
    let slot = scheduleBackwards(
      cursorEnd,
      durationMinutes,
      includeWeekends,
      workdayStart,
      workdayEnd
    );

    while (attempt < 25) {
      const overlap = await checkOverlap({
        userId,
        startTime: slot.start.toISOString(),
        endTime: slot.end.toISOString(),
      });
      if (!overlap.hasOverlap) {
        break;
      }

      const earliestConflict = overlap.conflicts
        .map((conflict) => new Date(conflict.startTime))
        .sort((a, b) => a.getTime() - b.getTime())[0];

      cursorEnd = earliestConflict || slot.start;
      slot = scheduleBackwards(
        cursorEnd,
        durationMinutes,
        includeWeekends,
        workdayStart,
        workdayEnd
      );
      attempt += 1;
    }

    if (attempt >= 25) {
      warnings.push(`Could not place task "${task.title}" due to conflicts.`);
      continue;
    }

    schedule.push({
      taskId: task.id,
      title: task.title,
      startTime: slot.start.toISOString(),
      endTime: slot.end.toISOString(),
      resourceId: task.resourceId,
      resourceLabel: task.resourceLabel,
    });
    cursorEnd = slot.start;
  }

  return {
    schedule: schedule.reverse(),
    endDate,
    timezone,
    warnings: warnings.length > 0 ? warnings : undefined,
    promptTemplate,
  };
}
