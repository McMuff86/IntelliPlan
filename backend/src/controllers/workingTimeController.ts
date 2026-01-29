import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import {
  createTemplate,
  getTemplates,
  getTemplate,
  updateTemplate,
  deleteTemplate,
  createDefaultTemplates,
} from '../services/workingTimeService';
import { toTemplateResponse } from '../models/workingTimeTemplate';

const getUserId = (req: Request): string | null => {
  return req.userId ?? null;
};

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized: User not found' });
      return;
    }

    const results = await getTemplates(userId);
    res.status(200).json({
      success: true,
      data: results.map((r) => toTemplateResponse(r.template, r.slots)),
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

    const { name, isDefault, slots } = req.body;
    const result = await createTemplate(userId, { name, isDefault, slots });
    res.status(201).json({
      success: true,
      data: toTemplateResponse(result.template, result.slots),
    });
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

    const result = await getTemplate(req.params.id as string, userId);
    if (!result) {
      res.status(404).json({ success: false, error: 'Working time template not found' });
      return;
    }

    res.status(200).json({
      success: true,
      data: toTemplateResponse(result.template, result.slots),
    });
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

    const { name, isDefault, slots } = req.body;
    const result = await updateTemplate(req.params.id as string, userId, { name, isDefault, slots });
    if (!result) {
      res.status(404).json({ success: false, error: 'Working time template not found' });
      return;
    }

    res.status(200).json({
      success: true,
      data: toTemplateResponse(result.template, result.slots),
    });
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

    const deleted = await deleteTemplate(req.params.id as string, userId);
    if (!deleted) {
      res.status(404).json({ success: false, error: 'Working time template not found' });
      return;
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function createDefaults(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized: User not found' });
      return;
    }

    const results = await createDefaultTemplates(userId);
    res.status(201).json({
      success: true,
      data: results.map((r) => toTemplateResponse(r.template, r.slots)),
    });
  } catch (error) {
    next(error);
  }
}
