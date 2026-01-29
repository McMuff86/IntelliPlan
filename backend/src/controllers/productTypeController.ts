import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import {
  listProductTypes,
  getProductTypeById,
  createProductType,
  updateProductType,
  deleteProductType,
} from '../services/productTypeService';
import { toProductTypeResponse } from '../models/productType';

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const industryId = req.query.industryId as string | undefined;
    const productTypes = await listProductTypes(industryId);
    res.status(200).json({ success: true, data: productTypes.map(toProductTypeResponse) });
  } catch (error) {
    next(error);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const pt = await getProductTypeById(req.params.id as string);
    if (!pt) {
      res.status(404).json({ success: false, error: 'Product type not found' });
      return;
    }
    res.status(200).json({ success: true, data: toProductTypeResponse(pt) });
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

    const { industryId, name, description, icon, isActive } = req.body;
    const pt = await createProductType({
      industry_id: industryId,
      name,
      description,
      icon,
      is_active: isActive,
    });
    res.status(201).json({ success: true, data: toProductTypeResponse(pt) });
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

    const { name, description, icon, isActive } = req.body;
    const updated = await updateProductType(req.params.id as string, {
      name,
      description,
      icon,
      is_active: isActive,
    });
    if (!updated) {
      res.status(404).json({ success: false, error: 'Product type not found' });
      return;
    }
    res.status(200).json({ success: true, data: toProductTypeResponse(updated) });
  } catch (error) {
    next(error);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const deleted = await deleteProductType(req.params.id as string);
    if (!deleted) {
      res.status(404).json({ success: false, error: 'Product type not found' });
      return;
    }
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
