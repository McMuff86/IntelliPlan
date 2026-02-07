import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import {
  bulkCreateAssignments,
  createTaskAssignment,
  deleteTaskAssignment,
  getAssignmentsByResource,
  getAssignmentsByTask,
  getTaskAssignmentById,
  listAssignments,
  updateTaskAssignment,
} from '../services/taskAssignmentService';
import { toTaskAssignmentResponse } from '../models/taskAssignment';

const getUserId = (req: Request): string | null => {
  if (!req.user) return null;
  return req.user.id;
};

// ─── List assignments (global query) ──────────────────

export async function list(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized: User not found' });
      return;
    }

    const { from, to, resource_id, status_code, limit, offset } = req.query;

    const result = await listAssignments({
      from: from as string | undefined,
      to: to as string | undefined,
      resourceId: resource_id as string | undefined,
      statusCode: status_code as string | undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      offset: offset ? parseInt(offset as string, 10) : undefined,
    });

    res.status(200).json({
      success: true,
      data: result.data.map(toTaskAssignmentResponse),
      pagination: {
        total: result.total,
        limit: result.limit,
        offset: result.offset,
      },
    });
  } catch (error) {
    next(error);
  }
}

// ─── Get assignments for a task ────────────────────────

export async function listByTask(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized: User not found' });
      return;
    }

    const taskId = req.params.taskId as string;
    const assignments = await getAssignmentsByTask(taskId);

    res.status(200).json({
      success: true,
      data: assignments.map(toTaskAssignmentResponse),
    });
  } catch (error) {
    next(error);
  }
}

// ─── Create assignment for a task ──────────────────────

export async function createForTask(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized: User not found' });
      return;
    }

    const taskId = req.params.taskId as string;
    const { resourceId, assignmentDate, halfDay, notes, isFixed, startTime, statusCode } = req.body;

    const assignment = await createTaskAssignment({
      task_id: taskId,
      resource_id: resourceId,
      assignment_date: assignmentDate,
      half_day: halfDay,
      notes: notes ?? null,
      is_fixed: isFixed ?? false,
      start_time: startTime ?? null,
      status_code: statusCode ?? 'assigned',
    });

    res.status(201).json({ success: true, data: toTaskAssignmentResponse(assignment) });
  } catch (error) {
    // Handle unique constraint violation
    if ((error as any)?.code === '23505') {
      res.status(409).json({
        success: false,
        error: 'Assignment already exists for this task, resource, date, and half-day combination',
      });
      return;
    }
    // Handle FK violation
    if ((error as any)?.code === '23503') {
      res.status(400).json({
        success: false,
        error: 'Referenced task or resource does not exist',
      });
      return;
    }
    next(error);
  }
}

// ─── Bulk create assignments ───────────────────────────

export async function bulkCreateForTask(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized: User not found' });
      return;
    }

    const { assignments } = req.body;

    const results = [];

    for (const item of assignments) {
      const created = await bulkCreateAssignments({
        task_id: item.taskId,
        resource_id: item.resourceId,
        dates: item.dates,
        half_day: item.halfDay,
        is_fixed: item.isFixed ?? false,
        status_code: item.statusCode ?? 'assigned',
      });
      results.push(...created);
    }

    res.status(201).json({
      success: true,
      data: results.map(toTaskAssignmentResponse),
      count: results.length,
    });
  } catch (error) {
    if ((error as any)?.code === '23505') {
      res.status(409).json({
        success: false,
        error: 'One or more assignments already exist for the given task, resource, date, and half-day combination',
      });
      return;
    }
    if ((error as any)?.code === '23503') {
      res.status(400).json({
        success: false,
        error: 'Referenced task or resource does not exist',
      });
      return;
    }
    next(error);
  }
}

// ─── Get single assignment ─────────────────────────────

export async function getById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized: User not found' });
      return;
    }

    const assignment = await getTaskAssignmentById(req.params.id as string);
    if (!assignment) {
      res.status(404).json({ success: false, error: 'Assignment not found' });
      return;
    }

    res.status(200).json({ success: true, data: toTaskAssignmentResponse(assignment) });
  } catch (error) {
    next(error);
  }
}

// ─── Update assignment ─────────────────────────────────

export async function update(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized: User not found' });
      return;
    }

    const { resourceId, assignmentDate, halfDay, notes, isFixed, startTime, statusCode } = req.body;

    const updated = await updateTaskAssignment(req.params.id as string, {
      resource_id: resourceId,
      assignment_date: assignmentDate,
      half_day: halfDay,
      notes,
      is_fixed: isFixed,
      start_time: startTime,
      status_code: statusCode,
    });

    if (!updated) {
      res.status(404).json({ success: false, error: 'Assignment not found' });
      return;
    }

    res.status(200).json({ success: true, data: toTaskAssignmentResponse(updated) });
  } catch (error) {
    if ((error as any)?.code === '23505') {
      res.status(409).json({
        success: false,
        error: 'Assignment already exists for this task, resource, date, and half-day combination',
      });
      return;
    }
    next(error);
  }
}

// ─── Delete (soft delete) assignment ───────────────────

export async function remove(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized: User not found' });
      return;
    }

    const deleted = await deleteTaskAssignment(req.params.id as string);
    if (!deleted) {
      res.status(404).json({ success: false, error: 'Assignment not found' });
      return;
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

// ─── Get assignments for a resource (capacity check) ───

export async function listByResource(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized: User not found' });
      return;
    }

    const resourceId = req.params.resourceId as string;
    const from = req.query.from as string;
    const to = req.query.to as string;

    if (!from || !to) {
      res.status(400).json({ success: false, error: 'from and to query parameters are required' });
      return;
    }

    const assignments = await getAssignmentsByResource(resourceId, from, to);

    res.status(200).json({
      success: true,
      data: assignments.map(toTaskAssignmentResponse),
    });
  } catch (error) {
    next(error);
  }
}
