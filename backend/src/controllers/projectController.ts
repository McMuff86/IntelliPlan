import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import {
  createProject,
  deleteProject,
  getProjectById,
  listProjects,
  listTrashedProjects,
  permanentDeleteProject,
  restoreProject,
  updateProject,
  updateProjectTaskTemplateId,
} from '../services/projectService';
import { shiftProjectSchedule, autoScheduleProjectTasks } from '../services/taskService';
import { applyTemplateToProject, resetProjectTasks } from '../services/templateApplicationService';
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
    changes.push(
      `description ${formatValue(before.description)} -> ${formatValue(after.description)}`
    );
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
  if (before.work_template !== after.work_template) {
    changes.push(`template ${before.work_template} -> ${after.work_template}`);
  }

  if (changes.length === 0) {
    return null;
  }

  return `Project updated: ${after.name} (${changes.join(', ')})`;
};

const WORK_TEMPLATE_SETTINGS: Record<
  string,
  { includeWeekends: boolean; workdayStart: string; workdayEnd: string }
> = {
  weekday_8_17: {
    includeWeekends: false,
    workdayStart: '08:00',
    workdayEnd: '17:00',
  },
  weekday_8_17_with_weekends: {
    includeWeekends: true,
    workdayStart: '08:00',
    workdayEnd: '17:00',
  },
};

const resolveTemplateDefaults = (template?: string) => {
  if (!template) return null;
  return WORK_TEMPLATE_SETTINGS[template] ?? null;
};

const inferTemplate = (
  includeWeekends?: boolean,
  workdayStart?: string,
  workdayEnd?: string
): string => {
  const resolvedStart = workdayStart ?? '08:00';
  const resolvedEnd = workdayEnd ?? '17:00';
  const resolvedWeekends = includeWeekends ?? true;

  if (resolvedStart === '08:00' && resolvedEnd === '17:00') {
    return resolvedWeekends ? 'weekday_8_17_with_weekends' : 'weekday_8_17';
  }

  return 'custom';
};

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized: User not found' });
      return;
    }

    const { limit, offset } = req.query;
    const result = await listProjects({
      ownerId: userId,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      offset: offset ? parseInt(offset as string, 10) : undefined,
    });
    res.status(200).json({
      success: true,
      data: result.data.map(toProjectResponse),
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

    const {
      name, description, includeWeekends, workdayStart, workdayEnd, workTemplate, taskTemplateId,
      orderNumber, customerName, installationLocation, color, contactName, contactPhone,
      needsCallback, sachbearbeiter, workerCount, helperCount, remarks,
    } = req.body;
    const templateDefaults = resolveTemplateDefaults(workTemplate);
    const resolvedIncludeWeekends = templateDefaults
      ? templateDefaults.includeWeekends
      : includeWeekends;
    const resolvedWorkdayStart = templateDefaults ? templateDefaults.workdayStart : workdayStart;
    const resolvedWorkdayEnd = templateDefaults ? templateDefaults.workdayEnd : workdayEnd;
    const resolvedTemplate =
      workTemplate ??
      inferTemplate(resolvedIncludeWeekends, resolvedWorkdayStart, resolvedWorkdayEnd);
    const project = await createProject({
      name,
      description,
      owner_id: userId,
      include_weekends: resolvedIncludeWeekends,
      workday_start: resolvedWorkdayStart,
      workday_end: resolvedWorkdayEnd,
      work_template: resolvedTemplate,
      task_template_id: taskTemplateId,
      order_number: orderNumber,
      customer_name: customerName,
      installation_location: installationLocation,
      color,
      contact_name: contactName,
      contact_phone: contactPhone,
      needs_callback: needsCallback,
      sachbearbeiter,
      worker_count: workerCount,
      helper_count: helperCount,
      remarks,
    });

    // Apply task template if provided
    if (taskTemplateId) {
      await applyTemplateToProject(project.id, taskTemplateId, userId);
    }

    await createProjectActivity({
      project_id: project.id,
      actor_user_id: userId,
      entity_type: 'project',
      action: 'created',
      summary: `Project created: ${project.name}${taskTemplateId ? ' (with template)' : ''}`,
      metadata: { projectId: project.id, taskTemplateId },
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

    const {
      name, description, includeWeekends, workdayStart, workdayEnd, workTemplate,
      orderNumber, customerName, installationLocation, color, contactName, contactPhone,
      needsCallback, sachbearbeiter, workerCount, helperCount, remarks,
    } = req.body;
    const templateDefaults = resolveTemplateDefaults(workTemplate);
    const resolvedIncludeWeekends = templateDefaults
      ? templateDefaults.includeWeekends
      : includeWeekends;
    const resolvedWorkdayStart = templateDefaults ? templateDefaults.workdayStart : workdayStart;
    const resolvedWorkdayEnd = templateDefaults ? templateDefaults.workdayEnd : workdayEnd;
    const existing = await getProjectById(req.params.id as string, userId);
    if (!existing) {
      res.status(404).json({ success: false, error: 'Project not found' });
      return;
    }

    const updated = await updateProject(req.params.id as string, userId, {
      name,
      description,
      include_weekends: resolvedIncludeWeekends,
      workday_start: resolvedWorkdayStart,
      workday_end: resolvedWorkdayEnd,
      work_template: workTemplate,
      order_number: orderNumber,
      customer_name: customerName,
      installation_location: installationLocation,
      color,
      contact_name: contactName,
      contact_phone: contactPhone,
      needs_callback: needsCallback,
      sachbearbeiter,
      worker_count: workerCount,
      helper_count: helperCount,
      remarks,
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

export async function shiftSchedule(
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

export async function applyTemplate(req: Request, res: Response, next: NextFunction): Promise<void> {
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

    const { templateId, mode, durationOverrides, multiplier } = req.body;
    if (!templateId) {
      res.status(400).json({ success: false, error: 'templateId is required' });
      return;
    }

    const overrides = durationOverrides && typeof durationOverrides === 'object' ? durationOverrides as Record<string, number> : undefined;
    const mult = typeof multiplier === 'number' && multiplier > 0 ? multiplier : undefined;

    const resolvedMode = mode === 'append' ? 'append' : 'replace';
    let tasks;
    if (resolvedMode === 'replace') {
      tasks = await resetProjectTasks(projectId, templateId, userId, overrides, mult);
    } else {
      tasks = await applyTemplateToProject(projectId, templateId, userId, overrides, mult);
    }

    await updateProjectTaskTemplateId(projectId, userId, templateId);

    await createProjectActivity({
      project_id: projectId,
      actor_user_id: userId,
      entity_type: 'project',
      action: 'template_applied',
      summary: `Template applied to project: ${project.name} (mode: ${resolvedMode})`,
      metadata: { projectId, templateId, mode: resolvedMode, taskCount: tasks.length },
    });

    res.status(200).json({ success: true, data: { taskCount: tasks.length } });
  } catch (error) {
    next(error);
  }
}

export async function resetProjectToTemplate(req: Request, res: Response, next: NextFunction): Promise<void> {
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

    if (!project.task_template_id) {
      res.status(400).json({ success: false, error: 'Project has no task template assigned' });
      return;
    }

    const tasks = await resetProjectTasks(projectId, project.task_template_id, userId);

    await createProjectActivity({
      project_id: projectId,
      actor_user_id: userId,
      entity_type: 'project',
      action: 'template_reset',
      summary: `Project tasks reset to template: ${project.name}`,
      metadata: { projectId, templateId: project.task_template_id, taskCount: tasks.length },
    });

    res.status(200).json({ success: true, data: { taskCount: tasks.length } });
  } catch (error) {
    next(error);
  }
}

export async function autoSchedule(req: Request, res: Response, next: NextFunction): Promise<void> {
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

    const { taskIds, endDate } = req.body;
    const result = await autoScheduleProjectTasks(
      projectId,
      userId,
      taskIds,
      endDate,
      project.include_weekends,
      project.workday_start,
      project.workday_end
    );

    await createProjectActivity({
      project_id: projectId,
      actor_user_id: userId,
      entity_type: 'project',
      action: 'auto_scheduled',
      summary: `Auto-scheduled ${result.scheduledTaskIds.length} tasks (deadline: ${endDate})`,
      metadata: { projectId, endDate, scheduledTaskIds: result.scheduledTaskIds, skippedTaskIds: result.skippedTaskIds },
    });

    res.status(200).json({ success: true, data: result });
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

export async function listTrash(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized: User not found' });
      return;
    }

    const projects = await listTrashedProjects(userId);
    res.status(200).json({ success: true, data: projects.map(toProjectResponse) });
  } catch (error) {
    next(error);
  }
}

export async function restore(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized: User not found' });
      return;
    }

    const project = await restoreProject(req.params.id as string, userId);
    if (!project) {
      res.status(404).json({ success: false, error: 'Project not found in trash' });
      return;
    }

    res.status(200).json({ success: true, data: toProjectResponse(project) });
  } catch (error) {
    next(error);
  }
}

export async function permanentRemove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized: User not found' });
      return;
    }

    const deleted = await permanentDeleteProject(req.params.id as string, userId);
    if (!deleted) {
      res.status(404).json({ success: false, error: 'Project not found in trash' });
      return;
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
