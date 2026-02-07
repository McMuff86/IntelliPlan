import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import * as capacityService from '../services/capacityService';

export async function getCapacityOverview(
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

    const from = req.query.from as string;
    const to = req.query.to as string;

    const overview = await capacityService.getCapacityOverview({ from, to });

    res.status(200).json({
      success: true,
      data: overview,
    });
  } catch (error) {
    next(error);
  }
}

export async function getDepartmentCapacity(
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

    const dept = req.params.dept as string;
    const from = req.query.from as string;
    const to = req.query.to as string;

    const capacity = await capacityService.getDepartmentCapacity(
      dept,
      { from, to }
    );

    res.status(200).json({
      success: true,
      data: capacity,
    });
  } catch (error) {
    next(error);
  }
}

export async function getResourceCapacity(
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

    const resourceId = req.params.id as string;
    const from = req.query.from as string;
    const to = req.query.to as string;

    const capacity = await capacityService.getResourceCapacity(
      resourceId,
      { from, to }
    );

    if (!capacity) {
      res.status(404).json({
        success: false,
        error: 'Resource not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: capacity,
    });
  } catch (error) {
    next(error);
  }
}
