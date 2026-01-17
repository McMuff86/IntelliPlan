import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { createProject, deleteProject, getProjectById, listProjects, updateProject } from '../services/projectService';
import { shiftProjectSchedule } from '../services/taskService';
import { toProjectResponse } from '../models/project';

const getUserId = (req: Request): string | null => {
  if (!req.user) {
    return null;
  }
  return req.user.id;
};

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized: User not found' });
      return;
    }

    const projects = await listProjects(userId);
    res.status(200).json({
      success: true,
      data: projects.map(toProjectResponse),
    });
  } catch (error) {
    next(error);
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
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

    const { name, description, includeWeekends, workdayStart, workdayEnd } = req.body;
    const project = await createProject({
      name,
      description,
      owner_id: userId,
      include_weekends: includeWeekends,
      workday_start: workdayStart,
      workday_end: workdayEnd,
    });

    res.status(201).json({ success: true, data: toProjectResponse(project) });
  } catch (error) {
    next(error);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized: User not found' });
      return;
    }

    const project = await getProjectById(req.params.id as string, userId);
    if (!project) {
      res.status(404).json({ success: false, error: 'Project not found' });
      return;
    }

    res.status(200).json({ success: true, data: toProjectResponse(project) });
  } catch (error) {
    next(error);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
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

    const { name, description, includeWeekends, workdayStart, workdayEnd } = req.body;
    const updated = await updateProject(req.params.id as string, userId, {
      name,
      description,
      include_weekends: includeWeekends,
      workday_start: workdayStart,
      workday_end: workdayEnd,
    });

    if (!updated) {
      res.status(404).json({ success: false, error: 'Project not found' });
      return;
    }

    res.status(200).json({ success: true, data: toProjectResponse(updated) });
  } catch (error) {
    next(error);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized: User not found' });
      return;
    }

    const deleted = await deleteProject(req.params.id as string, userId);
    if (!deleted) {
      res.status(404).json({ success: false, error: 'Project not found' });
      return;
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function shiftSchedule(req: Request, res: Response, next: NextFunction): Promise<void> {
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

    const projectId = req.params.id as string;
    const project = await getProjectById(projectId, userId);
    if (!project) {
      res.status(404).json({ success: false, error: 'Project not found' });
      return;
    }

    const deltaDays = Number(req.body.deltaDays);
    const shiftResult = await shiftProjectSchedule(projectId, userId, deltaDays);

    res.status(200).json({ success: true, data: shiftResult });
  } catch (error) {
    next(error);
  }
}
