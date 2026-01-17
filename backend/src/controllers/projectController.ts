import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { createProject, deleteProject, getProjectById, listProjects, updateProject } from '../services/projectService';
import { shiftProjectSchedule } from '../services/taskService';
import { createProjectActivity, listProjectActivity } from '../services/activityService';
import { toProjectResponse } from '../models/project';
import type { Project } from '../models/project';
import { toProjectActivityResponse } from '../models/activity';

const getUserId = (req: Request): string | null => {
  if (!req.user) {
    return null;
  }
  return req.user.id;
};

const formatValue = (value: string | boolean | null | undefined): string => {
  if (value === null || value === undefined || value === '') {
    return 'unset';
  }
  return String(value);
};

const buildProjectUpdateSummary = (before: Project, after: Project): string | null => {
  const changes: string[] = [];

  if (before.name !== after.name) {
    changes.push(`name "${before.name}" -> "${after.name}"`);
  }
  if (before.description !== after.description) {
    changes.push(`description ${formatValue(before.description)} -> ${formatValue(after.description)}`);
  }
  if (before.include_weekends !== after.include_weekends) {
    changes.push(`weekends ${before.include_weekends} -> ${after.include_weekends}`);
  }
  if (before.workday_start !== after.workday_start) {
    changes.push(`workday start ${before.workday_start} -> ${after.workday_start}`);
  }
  if (before.workday_end !== after.workday_end) {
    changes.push(`workday end ${before.workday_end} -> ${after.workday_end}`);
  }

  if (changes.length === 0) {
    return null;
  }

  return `Project updated: ${after.name} (${changes.join(', ')})`;
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

    await createProjectActivity({
      project_id: project.id,
      actor_user_id: userId,
      entity_type: 'project',
      action: 'created',
      summary: `Project created: ${project.name}`,
      metadata: { projectId: project.id },
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
    const existing = await getProjectById(req.params.id as string, userId);
    if (!existing) {
      res.status(404).json({ success: false, error: 'Project not found' });
      return;
    }

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

    const summary = buildProjectUpdateSummary(existing, updated);
    if (summary) {
      await createProjectActivity({
        project_id: updated.id,
        actor_user_id: userId,
        entity_type: 'project',
        action: 'updated',
        summary,
        metadata: { projectId: updated.id },
      });
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

    await createProjectActivity({
      project_id: projectId,
      actor_user_id: userId,
      entity_type: 'project',
      action: 'shifted',
      summary: `Project schedule shifted by ${deltaDays} days`,
      metadata: { projectId, deltaDays, shiftedTaskIds: shiftResult.shiftedTaskIds },
    });

    res.status(200).json({ success: true, data: shiftResult });
  } catch (error) {
    next(error);
  }
}

export async function listActivity(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
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

    const activity = await listProjectActivity(projectId, userId);
    res.status(200).json({ success: true, data: activity.map(toProjectActivityResponse) });
  } catch (error) {
    next(error);
  }
}
