import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { searchAppointments, searchProjects, searchTasks } from '../services/searchService';
import { toAppointmentResponse } from '../models/appointment';
import { toProjectResponse } from '../models/project';
import { toTaskResponse } from '../models/task';

export async function searchAppointmentsHandler(
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

    const userId = req.user?.id || req.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized: User not found' });
      return;
    }

    const { q, from, to, page, limit } = req.query;

    const result = await searchAppointments({
      userId,
      q: q as string | undefined,
      from: from as string | undefined,
      to: to as string | undefined,
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
    });

    res.status(200).json({
      success: true,
      data: {
        appointments: result.items.map(toAppointmentResponse),
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function searchProjectsHandler(
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

    const userId = req.user?.id || req.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized: User not found' });
      return;
    }

    const { q, status, page, limit } = req.query;

    const result = await searchProjects({
      userId,
      q: q as string | undefined,
      status: status as string | undefined,
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
    });

    res.status(200).json({
      success: true,
      data: {
        projects: result.items.map(toProjectResponse),
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function searchTasksHandler(
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

    const userId = req.user?.id || req.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized: User not found' });
      return;
    }

    const { q, projectId, status, page, limit } = req.query;

    const result = await searchTasks({
      userId,
      q: q as string | undefined,
      projectId: projectId as string | undefined,
      status: status as string | undefined,
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
    });

    res.status(200).json({
      success: true,
      data: {
        tasks: result.items.map(toTaskResponse),
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    next(error);
  }
}
