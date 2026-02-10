import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import {
  getWeekPlan,
  getWeekConflicts,
  quickAssign,
  copyWeek,
  getUnassignedTasks,
  getPhaseMatrix,
  getResourceSchedule,
  getResourcesOverview,
} from '../services/wochenplanService';

export async function getWochenplan(
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

    // Default to current ISO week if not provided
    const now = new Date();
    const currentYear = now.getFullYear();
    // Calculate current ISO week
    const startOfYear = new Date(Date.UTC(currentYear, 0, 1));
    const dayOfYear = Math.floor(
      (now.getTime() - startOfYear.getTime()) / 86400000
    );
    const currentKw = Math.ceil((dayOfYear + startOfYear.getUTCDay() + 1) / 7);

    const kw = req.query.kw ? parseInt(req.query.kw as string, 10) : currentKw;
    const year = req.query.year
      ? parseInt(req.query.year as string, 10)
      : currentYear;

    if (isNaN(kw) || kw < 1 || kw > 53) {
      res.status(400).json({
        success: false,
        error: 'kw must be a number between 1 and 53',
      });
      return;
    }

    if (isNaN(year) || year < 2020 || year > 2099) {
      res.status(400).json({
        success: false,
        error: 'year must be a number between 2020 and 2099',
      });
      return;
    }

    const weekPlan = await getWeekPlan(kw, year);

    res.status(200).json({
      success: true,
      data: weekPlan,
    });
  } catch (error) {
    next(error);
  }
}

// ─── 3.1 Conflict Detection ──────────────────────────

export async function getConflicts(
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

    const kw = parseInt(req.query.kw as string, 10);
    const year = parseInt(req.query.year as string, 10);

    const conflicts = await getWeekConflicts(kw, year);

    res.status(200).json({
      success: true,
      data: conflicts,
    });
  } catch (error) {
    next(error);
  }
}

// ─── 3.2 Quick-Assign Batch ─────────────────────────

export async function assignBatch(
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

    const { assignments } = req.body;

    const result = await quickAssign(assignments);

    if (result.conflicts.length > 0) {
      res.status(409).json({
        success: false,
        error: 'Conflicts detected. No assignments were created.',
        data: { conflicts: result.conflicts },
      });
      return;
    }

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

// ─── 3.3 Copy-Week ──────────────────────────────────

export async function copyWeekHandler(
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

    const { sourceKw, sourceYear, targetKw, targetYear, options } = req.body;

    const result = await copyWeek(
      sourceKw,
      sourceYear,
      targetKw,
      targetYear,
      { includeAssignments: options?.includeAssignments ?? true }
    );

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('already has')) {
      res.status(409).json({
        success: false,
        error: error.message,
      });
      return;
    }
    next(error);
  }
}

// ─── 3.4 Unassigned Tasks ───────────────────────────

export async function getUnassigned(
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

    const kw = parseInt(req.query.kw as string, 10);
    const year = parseInt(req.query.year as string, 10);

    const result = await getUnassignedTasks(kw, year);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

// ─── 3.5 KW-Phase-Matrix ───────────────────────────

export async function getPhaseMatrixHandler(
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

    const fromKw = parseInt(req.query.from_kw as string, 10);
    const toKw = parseInt(req.query.to_kw as string, 10);
    const year = parseInt(req.query.year as string, 10);
    const fromYear = req.query.from_year ? parseInt(req.query.from_year as string, 10) : year;
    const toYear = req.query.to_year ? parseInt(req.query.to_year as string, 10) : year;

    const result = await getPhaseMatrix(fromKw, toKw, fromYear, toYear);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

// ─── 4.1 Resource Weekly Schedule ───────────────────

export async function getResourceScheduleHandler(
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

    const resourceId = req.params.resourceId as string;
    const kw = parseInt(req.query.kw as string, 10);
    const year = parseInt(req.query.year as string, 10);

    const result = await getResourceSchedule(resourceId, kw, year);

    if (!result) {
      res.status(404).json({
        success: false,
        error: 'Resource not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

// ─── 4.2 All-Resources Week Overview ────────────────

export async function getResourcesOverviewHandler(
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

    const kw = parseInt(req.query.kw as string, 10);
    const year = parseInt(req.query.year as string, 10);
    const department = req.query.department as string | undefined;

    const result = await getResourcesOverview(kw, year, department);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}
