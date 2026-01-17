import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import {
  createResource,
  deleteResource,
  getResourceById,
  listResources,
  updateResource,
} from '../services/resourceService';
import { toResourceResponse } from '../models/resource';

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

    const resources = await listResources(userId);
    res.status(200).json({ success: true, data: resources.map(toResourceResponse) });
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

    const { name, resourceType, description, isActive, availabilityEnabled } = req.body;
    const resource = await createResource({
      owner_id: userId,
      name,
      resource_type: resourceType,
      description: description ?? null,
      is_active: isActive ?? true,
      availability_enabled: availabilityEnabled ?? false,
    });

    res.status(201).json({ success: true, data: toResourceResponse(resource) });
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

    const resource = await getResourceById(req.params.id as string, userId);
    if (!resource) {
      res.status(404).json({ success: false, error: 'Resource not found' });
      return;
    }

    res.status(200).json({ success: true, data: toResourceResponse(resource) });
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

    const { name, resourceType, description, isActive, availabilityEnabled } = req.body;
    const updated = await updateResource(req.params.id as string, userId, {
      name,
      resource_type: resourceType,
      description,
      is_active: isActive,
      availability_enabled: availabilityEnabled,
    });

    if (!updated) {
      res.status(404).json({ success: false, error: 'Resource not found' });
      return;
    }

    res.status(200).json({ success: true, data: toResourceResponse(updated) });
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

    const deleted = await deleteResource(req.params.id as string, userId);
    if (!deleted) {
      res.status(404).json({ success: false, error: 'Resource not found' });
      return;
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
