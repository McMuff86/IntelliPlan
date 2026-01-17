import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import {
  createDependency,
  createTask,
  createWorkSlot,
  deleteDependency,
  deleteTask,
  deleteWorkSlot,
  getTaskById,
  listDependencies,
  listTasksByProject,
  listWorkSlots,
  updateTask,
} from '../services/taskService';
import { getProjectById } from '../services/projectService';
import { toTaskDependencyResponse, toTaskResponse, toTaskWorkSlotResponse } from '../models/task';

const getUserId = (req: Request): string | null => {
  const user = req.user;
  const header = req.headers['x-user-id'];
  const userId = user?.id || (Array.isArray(header) ? header[0] : header);
  return userId || null;
};

export async function listByProject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized: User ID required' });
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
      res.status(401).json({ success: false, error: 'Unauthorized: User ID required' });
      return;
    }

    const projectId = req.params.projectId as string;
    const project = await getProjectById(projectId, userId);
    if (!project) {
      res.status(404).json({ success: false, error: 'Project not found' });
      return;
    }

    const { title, description, status, schedulingMode, durationMinutes, startDate, dueDate } = req.body;
    const task = await createTask({
      project_id: projectId,
      owner_id: userId,
      title,
      description,
      status,
      scheduling_mode: schedulingMode,
      duration_minutes: durationMinutes ?? null,
      start_date: startDate ?? null,
      due_date: dueDate ?? null,
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
      res.status(401).json({ success: false, error: 'Unauthorized: User ID required' });
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
      res.status(401).json({ success: false, error: 'Unauthorized: User ID required' });
      return;
    }

    const { title, description, status, schedulingMode, durationMinutes, startDate, dueDate } = req.body;
    const updated = await updateTask(req.params.id as string, userId, {
      title,
      description,
      status,
      scheduling_mode: schedulingMode,
      duration_minutes: durationMinutes ?? null,
      start_date: startDate ?? null,
      due_date: dueDate ?? null,
    });

    if (!updated) {
      res.status(404).json({ success: false, error: 'Task not found' });
      return;
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
      res.status(401).json({ success: false, error: 'Unauthorized: User ID required' });
      return;
    }

    const deleted = await deleteTask(req.params.id as string, userId);
    if (!deleted) {
      res.status(404).json({ success: false, error: 'Task not found' });
      return;
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function listTaskDependencies(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized: User ID required' });
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
      res.status(401).json({ success: false, error: 'Unauthorized: User ID required' });
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

    res.status(201).json({ success: true, data: toTaskDependencyResponse(dependency) });
  } catch (error) {
    next(error);
  }
}

export async function removeTaskDependency(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized: User ID required' });
      return;
    }

    const deleted = await deleteDependency(req.params.dependencyId as string, userId);
    if (!deleted) {
      res.status(404).json({ success: false, error: 'Dependency not found' });
      return;
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
      res.status(401).json({ success: false, error: 'Unauthorized: User ID required' });
      return;
    }

    const slots = await listWorkSlots(req.params.id as string, userId);
    res.status(200).json({ success: true, data: slots.map(toTaskWorkSlotResponse) });
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

    const { startTime, endTime, isFixed } = req.body;
    const slot = await createWorkSlot(
      req.params.id as string,
      userId,
      startTime,
      endTime,
      isFixed ?? false
    );

    if (!slot) {
      res.status(404).json({ success: false, error: 'Task not found' });
      return;
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

    const deleted = await deleteWorkSlot(req.params.slotId as string, userId);
    if (!deleted) {
      res.status(404).json({ success: false, error: 'Work slot not found' });
      return;
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
