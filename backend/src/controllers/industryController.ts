import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import {
  listIndustries,
  getIndustryById,
  createIndustry,
  updateIndustry,
  deleteIndustry,
} from '../services/industryService';
import { toIndustryResponse } from '../models/industry';

export async function list(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const industries = await listIndustries();
    res.status(200).json({ success: true, data: industries.map(toIndustryResponse) });
  } catch (error) {
    next(error);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const industry = await getIndustryById(req.params.id as string);
    if (!industry) {
      res.status(404).json({ success: false, error: 'Industry not found' });
      return;
    }
    res.status(200).json({ success: true, data: toIndustryResponse(industry) });
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

    const { name, description, icon, settings } = req.body;
    const industry = await createIndustry({ name, description, icon, settings });
    res.status(201).json({ success: true, data: toIndustryResponse(industry) });
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

    const { name, description, icon, settings } = req.body;
    const updated = await updateIndustry(req.params.id as string, { name, description, icon, settings });
    if (!updated) {
      res.status(404).json({ success: false, error: 'Industry not found' });
      return;
    }
    res.status(200).json({ success: true, data: toIndustryResponse(updated) });
  } catch (error) {
    next(error);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const deleted = await deleteIndustry(req.params.id as string);
    if (!deleted) {
      res.status(404).json({ success: false, error: 'Industry not found' });
      return;
    }
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
