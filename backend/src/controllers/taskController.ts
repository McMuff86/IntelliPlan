import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import {
  createDependency,
  createTask,
  createWorkSlot,
  deleteDependency,
  deleteTask,
  deleteWorkSlot,
  getDependencyById,
  getTaskById,
  getWorkSlotById,
  isTaskBlocked,
  listDependencies,
  listTasksByProject,
  listWorkSlots,
  listWorkSlotsForCalendar,
  updateTask,
  shiftTaskWithDependents,
} from '../services/taskService';
import { getProjectById } from '../services/projectService';
import { toTaskDependencyResponse, toTaskResponse, toTaskWorkSlotResponse } from '../models/task';
import type { Task } from '../models/task';
import { createProjectActivity } from '../services/activityService';

const getUserId = (req: Request): string | null => {
  if (!req.user) {
    return null;
  }
  return req.user.id;
};

const formatValue = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined || value === '') {
    return 'unset';
  }
  return String(value);
};

const buildTaskUpdateSummary = (before: Task, after: Task): string | null => {
  const changes: string[] = [];

  if (before.title !== after.title) {
    changes.push(`title "${before.title}" -> "${after.title}"`);
  }
  if (before.status !== after.status) {
    changes.push(`status ${before.status} -> ${after.status}`);
  }
  if (before.start_date !== after.start_date) {
    changes.push(`start ${formatValue(before.start_date)} -> ${formatValue(after.start_date)}`);
  }
  if (before.due_date !== after.due_date) {
    changes.push(`due ${formatValue(before.due_date)} -> ${formatValue(after.due_date)}`);
  }
  if (before.duration_minutes !== after.duration_minutes) {
    changes.push(`duration ${formatValue(before.duration_minutes)} -> ${formatValue(after.duration_minutes)}`);
  }
  if (before.resource_label !== after.resource_label) {
    changes.push(`resource ${formatValue(before.resource_label)} -> ${formatValue(after.resource_label)}`);
  }
  if (before.resource_id !== after.resource_id) {
    changes.push(`resourceId ${formatValue(before.resource_id)} -> ${formatValue(after.resource_id)}`);
  }
  if (before.scheduling_mode !== after.scheduling_mode) {
    changes.push(`mode ${before.scheduling_mode} -> ${after.scheduling_mode}`);
  }

  if (changes.length === 0) {
    return null;
  }

  return `Task updated: ${after.title} (${changes.join(', ')})`;
};

export async function listByProject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized: User not found' });
      return;
    }

    const projectId = req.params.projectId as string;
    const project = await getProjectById(projectId, userId);
    if (!project) {
      res.status(404).json({ success: false, error: 'Project not found' });
      return;
    }

    const tasks = await listTasksByProject(projectId, userId);
    res.status(200).json({ success: true, data: tasks.map(toTaskResponse) });
  } catch (error) {
    next(error);
  }
}

export async function createInProject(req: Request, res: Response, next: NextFunction): Promise<void> {
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

    const projectId = req.params.projectId as string;
    const project = await getProjectById(projectId, userId);
    if (!project) {
      res.status(404).json({ success: false, error: 'Project not found' });
      return;
    }

  const { title, description, status, schedulingMode, durationMinutes, resourceLabel, resourceId, startDate, dueDate } =
    req.body;
  const task = await createTask({
    project_id: projectId,
    owner_id: userId,
    title,
    description,
    status,
    scheduling_mode: schedulingMode,
    duration_minutes: durationMinutes ?? null,
    resource_label: resourceLabel ?? null,
    resource_id: resourceId ?? null,
    start_date: startDate ?? null,
    due_date: dueDate ?? null,
  });

    await createProjectActivity({
      project_id: projectId,
      actor_user_id: userId,
      entity_type: 'task',
      action: 'created',
      summary: `Task created: ${task.title}`,
      metadata: { taskId: task.id, projectId },
    });

    res.status(201).json({ success: true, data: toTaskResponse(task) });
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

    const task = await getTaskById(req.params.id as string, userId);
    if (!task) {
      res.status(404).json({ success: false, error: 'Task not found' });
      return;
    }

    res.status(200).json({ success: true, data: toTaskResponse(task) });
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

    const existingTask = await getTaskById(req.params.id as string, userId);
    if (!existingTask) {
      res.status(404).json({ success: false, error: 'Task not found' });
      return;
    }

  const { title, description, status, schedulingMode, durationMinutes, resourceLabel, resourceId, startDate, dueDate } =
    req.body;
    if (status === 'in_progress') {
      const blocked = await isTaskBlocked(req.params.id as string, userId);
      if (blocked) {
        res.status(409).json({ success: false, error: 'Task is blocked by unfinished dependencies' });
        return;
      }
    }
    const updated = await updateTask(req.params.id as string, userId, {
      title,
      description,
      status,
      scheduling_mode: schedulingMode,
      duration_minutes: durationMinutes ?? null,
      resource_label: resourceLabel ?? null,
      resource_id: resourceId ?? null,
      start_date: startDate ?? null,
      due_date: dueDate ?? null,
    });

    if (!updated) {
      res.status(404).json({ success: false, error: 'Task not found' });
      return;
    }

    const summary = buildTaskUpdateSummary(existingTask as Task, updated);
    if (summary) {
      await createProjectActivity({
        project_id: existingTask.project_id,
        actor_user_id: userId,
        entity_type: 'task',
        action: 'updated',
        summary,
        metadata: { taskId: updated.id, projectId: existingTask.project_id },
      });
    }

    res.status(200).json({ success: true, data: toTaskResponse(updated) });
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

    const existingTask = await getTaskById(req.params.id as string, userId);
    if (!existingTask) {
      res.status(404).json({ success: false, error: 'Task not found' });
      return;
    }

    const deleted = await deleteTask(req.params.id as string, userId);
    if (!deleted) {
      res.status(404).json({ success: false, error: 'Task not found' });
      return;
    }

    await createProjectActivity({
      project_id: existingTask.project_id,
      actor_user_id: userId,
      entity_type: 'task',
      action: 'deleted',
      summary: `Task deleted: ${existingTask.title}`,
      metadata: { taskId: existingTask.id, projectId: existingTask.project_id },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function listTaskDependencies(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized: User not found' });
      return;
    }

    const dependencies = await listDependencies(req.params.id as string, userId);
    res.status(200).json({ success: true, data: dependencies.map(toTaskDependencyResponse) });
  } catch (error) {
    next(error);
  }
}

export async function createTaskDependency(req: Request, res: Response, next: NextFunction): Promise<void> {
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

    const { dependsOnTaskId, dependencyType } = req.body;
    const dependency = await createDependency(
      req.params.id as string,
      userId,
      dependsOnTaskId,
      dependencyType
    );

    if (!dependency) {
      res.status(404).json({ success: false, error: 'Task not found' });
      return;
    }

    const task = await getTaskById(req.params.id as string, userId);
    const dependsOnTask = await getTaskById(dependsOnTaskId, userId);
    if (task && dependsOnTask) {
      await createProjectActivity({
        project_id: task.project_id,
        actor_user_id: userId,
        entity_type: 'dependency',
        action: 'created',
        summary: `Dependency added: ${task.title} depends on ${dependsOnTask.title} (${dependencyType})`,
        metadata: {
          taskId: task.id,
          dependsOnTaskId,
          dependencyType,
          projectId: task.project_id,
        },
      });
    }

    res.status(201).json({ success: true, data: toTaskDependencyResponse(dependency) });
  } catch (error) {
    next(error);
  }
}

export async function removeTaskDependency(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized: User not found' });
      return;
    }

    const existingDependency = await getDependencyById(req.params.dependencyId as string, userId);
    const deleted = await deleteDependency(req.params.dependencyId as string, userId);
    if (!deleted) {
      res.status(404).json({ success: false, error: 'Dependency not found' });
      return;
    }

    if (existingDependency) {
      const task = await getTaskById(existingDependency.task_id, userId);
      const dependsOnTask = await getTaskById(existingDependency.depends_on_task_id, userId);
      if (task && dependsOnTask) {
        await createProjectActivity({
          project_id: task.project_id,
          actor_user_id: userId,
          entity_type: 'dependency',
          action: 'deleted',
          summary: `Dependency removed: ${task.title} no longer depends on ${dependsOnTask.title} (${existingDependency.dependency_type})`,
          metadata: {
            taskId: task.id,
            dependsOnTaskId: existingDependency.depends_on_task_id,
            dependencyType: existingDependency.dependency_type,
            projectId: task.project_id,
          },
        });
      }
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function listTaskWorkSlots(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized: User not found' });
      return;
    }

    const slots = await listWorkSlots(req.params.id as string, userId);
    res.status(200).json({ success: true, data: slots.map(toTaskWorkSlotResponse) });
  } catch (error) {
    next(error);
  }
}

export async function listCalendarWorkSlots(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized: User not found' });
      return;
    }

    const slots = await listWorkSlotsForCalendar(userId);
    const response = slots.map((slot) => ({
      id: slot.id,
      taskId: slot.task_id,
      taskTitle: slot.task_title,
      projectId: slot.project_id,
      projectName: slot.project_name,
      startTime: slot.start_time,
      endTime: slot.end_time,
      isFixed: slot.is_fixed,
      isAllDay: slot.is_all_day,
      taskDurationMinutes: slot.task_duration_minutes,
    }));

    res.status(200).json({ success: true, data: response });
  } catch (error) {
    next(error);
  }
}

export async function createTaskWorkSlot(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized: User ID required' });
      return;
    }

    const { startTime, endTime, isFixed, isAllDay } = req.body;
    const slot = await createWorkSlot(
      req.params.id as string,
      userId,
      startTime,
      endTime,
      isFixed ?? false,
      isAllDay ?? false
    );

    if (!slot) {
      res.status(404).json({ success: false, error: 'Task not found' });
      return;
    }

    const task = await getTaskById(req.params.id as string, userId);
    if (task) {
      const slotLabel = slot.is_all_day ? 'all day' : `${startTime} - ${endTime}`;
      await createProjectActivity({
        project_id: task.project_id,
        actor_user_id: userId,
        entity_type: 'work_slot',
        action: 'created',
        summary: `Work slot added: ${task.title} (${slotLabel})`,
        metadata: {
          taskId: task.id,
          workSlotId: slot.id,
          startTime,
          endTime,
          isFixed: slot.is_fixed,
          isAllDay: slot.is_all_day,
          projectId: task.project_id,
        },
      });
    }

    res.status(201).json({ success: true, data: toTaskWorkSlotResponse(slot) });
  } catch (error) {
    next(error);
  }
}

export async function removeTaskWorkSlot(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized: User ID required' });
      return;
    }

    const existingSlot = await getWorkSlotById(req.params.slotId as string, userId);
    const deleted = await deleteWorkSlot(req.params.slotId as string, userId);
    if (!deleted) {
      res.status(404).json({ success: false, error: 'Work slot not found' });
      return;
    }

    if (existingSlot) {
      const task = await getTaskById(existingSlot.task_id, userId);
      if (task) {
        const slotLabel = existingSlot.is_all_day
          ? 'all day'
          : `${existingSlot.start_time} - ${existingSlot.end_time}`;
        await createProjectActivity({
          project_id: task.project_id,
          actor_user_id: userId,
          entity_type: 'work_slot',
          action: 'deleted',
          summary: `Work slot removed: ${task.title} (${slotLabel})`,
          metadata: {
            taskId: task.id,
            workSlotId: existingSlot.id,
            startTime: existingSlot.start_time,
            endTime: existingSlot.end_time,
            isFixed: existingSlot.is_fixed,
            isAllDay: existingSlot.is_all_day,
            projectId: task.project_id,
          },
        });
      }
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

    const taskId = req.params.id as string;
    const deltaDays = Number(req.body.deltaDays);
    const cascade = Boolean(req.body.cascade);
    const shiftBlock = Boolean(req.body.shiftBlock);

    const shiftResult = await shiftTaskWithDependents(taskId, userId, deltaDays, cascade, shiftBlock);

    const task = await getTaskById(taskId, userId);
    if (task) {
      const shiftMode = shiftBlock ? 'block' : cascade ? 'cascade' : 'single';
      await createProjectActivity({
        project_id: task.project_id,
        actor_user_id: userId,
        entity_type: 'task',
        action: 'shifted',
        summary: `Task schedule shifted: ${task.title} by ${deltaDays} days (${shiftMode})`,
        metadata: {
          taskId,
          deltaDays,
          shiftMode,
          shiftedTaskIds: shiftResult.shiftedTaskIds,
          projectId: task.project_id,
        },
      });
    }

    res.status(200).json({
      success: true,
      data: shiftResult,
    });
  } catch (error) {
    next(error);
  }
}
