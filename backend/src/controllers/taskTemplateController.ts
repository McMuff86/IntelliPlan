import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import {
  listTaskTemplates,
  getTaskTemplateById,
  createTaskTemplate,
  updateTaskTemplate,
  deleteTaskTemplate,
} from '../services/taskTemplateService';
import { toTaskTemplateResponse } from '../models/taskTemplate';

const getUserId = (req: Request): string | null => {
  if (!req.user) return null;
  return req.user.id;
};

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const productTypeId = req.query.productTypeId as string | undefined;
    const templates = await listTaskTemplates({
      productTypeId,
      ownerId: userId,
      includeSystem: true,
    });
    res.status(200).json({ success: true, data: templates.map(toTaskTemplateResponse) });
  } catch (error) {
    next(error);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const template = await getTaskTemplateById(req.params.id as string);
    if (!template) {
      res.status(404).json({ success: false, error: 'Task template not found' });
      return;
    }

    // Users can see system templates or their own
    if (!template.is_system && template.owner_id !== userId) {
      res.status(403).json({ success: false, error: 'Forbidden' });
      return;
    }

    res.status(200).json({ success: true, data: toTaskTemplateResponse(template) });
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
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { productTypeId, name, description, tasks, isDefault } = req.body;
    const template = await createTaskTemplate({
      product_type_id: productTypeId,
      name,
      description,
      tasks,
      is_default: isDefault,
      is_system: false,
      owner_id: userId,
    });
    res.status(201).json({ success: true, data: toTaskTemplateResponse(template) });
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
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const existing = await getTaskTemplateById(req.params.id as string);
    if (!existing) {
      res.status(404).json({ success: false, error: 'Task template not found' });
      return;
    }

    if (existing.is_system) {
      res.status(403).json({ success: false, error: 'System templates cannot be modified' });
      return;
    }

    if (existing.owner_id !== userId) {
      res.status(403).json({ success: false, error: 'Forbidden' });
      return;
    }

    const { name, description, tasks, isDefault } = req.body;
    const updated = await updateTaskTemplate(req.params.id as string, {
      name,
      description,
      tasks,
      is_default: isDefault,
    });
    if (!updated) {
      res.status(404).json({ success: false, error: 'Task template not found' });
      return;
    }
    res.status(200).json({ success: true, data: toTaskTemplateResponse(updated) });
  } catch (error) {
    next(error);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const existing = await getTaskTemplateById(req.params.id as string);
    if (!existing) {
      res.status(404).json({ success: false, error: 'Task template not found' });
      return;
    }

    if (existing.is_system) {
      res.status(403).json({ success: false, error: 'System templates cannot be deleted' });
      return;
    }

    if (existing.owner_id !== userId) {
      res.status(403).json({ success: false, error: 'Forbidden' });
      return;
    }

    const deleted = await deleteTaskTemplate(req.params.id as string);
    if (!deleted) {
      res.status(404).json({ success: false, error: 'Task template not found' });
      return;
    }
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
