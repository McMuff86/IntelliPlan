import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';

import {
  createResource,
  deleteResource,
  getAvailableResourcesForDate,
  getResourceById,
  listResources,
  updateResource,
} from '../services/resourceService';
import type { ListResourcesFilters } from '../services/resourceService';
import { toResourceResponse } from '../models/resource';
import type { Department, EmployeeType, ResourceType, WorkRole } from '../models/resource';

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

    const filters: ListResourcesFilters = {};
    if (req.query.department) {
      filters.department = req.query.department as Department;
    }
    if (req.query.employee_type) {
      filters.employee_type = req.query.employee_type as EmployeeType;
    }
    if (req.query.work_role) {
      filters.work_role = req.query.work_role as WorkRole;
    }
    if (req.query.active !== undefined) {
      filters.is_active = req.query.active === 'true';
    }
    if (req.query.resource_type) {
      filters.resource_type = req.query.resource_type as ResourceType;
    }

    const resources = await listResources(userId, filters);
    res.status(200).json({ success: true, data: resources.map(toResourceResponse) });
  } catch (error) {
    next(error);
  }
}

export async function available(req: Request, res: Response, next: NextFunction): Promise<void> {
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

    const date = req.query.date as string;
    const halfDay = (req.query.half_day as string) || 'full_day';

    const resources = await getAvailableResourcesForDate(userId, date, halfDay as any);
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

    const { name, resourceType, description, isActive, availabilityEnabled, department, employeeType, shortCode, defaultLocation, weeklyHours, workRole, skills } = req.body;
    const resource = await createResource({
      owner_id: userId,
      name,
      resource_type: resourceType,
      description: description ?? null,
      is_active: isActive ?? true,
      availability_enabled: availabilityEnabled ?? false,
      department: department ?? null,
      employee_type: employeeType ?? null,
      short_code: shortCode ?? null,
      default_location: defaultLocation ?? null,
      weekly_hours: weeklyHours ?? null,
      work_role: workRole ?? undefined,
      skills: skills ?? null,
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

    const { name, resourceType, description, isActive, availabilityEnabled, department, employeeType, shortCode, defaultLocation, weeklyHours, workRole, skills } = req.body;
    const updated = await updateResource(req.params.id as string, userId, {
      name,
      resource_type: resourceType,
      description,
      is_active: isActive,
      availability_enabled: availabilityEnabled,
      department,
      employee_type: employeeType,
      short_code: shortCode,
      default_location: defaultLocation,
      weekly_hours: weeklyHours,
      work_role: workRole,
      skills,
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
