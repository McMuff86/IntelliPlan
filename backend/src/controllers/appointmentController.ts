import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { createAppointment, getAppointments, getAppointmentById, getAppointmentOwner, updateAppointment } from '../services/appointmentService';
import { toAppointmentResponse } from '../models/appointment';

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        errors: errors.array(),
      });
      return;
    }

    const { title, description, startTime, endTime, timezone } = req.body;
    
    const userId = req.headers['x-user-id'] as string || 'temp-user-id';

    const appointment = await createAppointment({
      title,
      description,
      start_time: startTime,
      end_time: endTime,
      timezone,
      user_id: userId,
    });

    res.status(201).json({
      success: true,
      data: toAppointmentResponse(appointment),
    });
  } catch (error) {
    next(error);
  }
}

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.headers['x-user-id'] as string || 'temp-user-id';
    const { start, end, limit, offset } = req.query;

    const result = await getAppointments({
      userId,
      start: start as string | undefined,
      end: end as string | undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      offset: offset ? parseInt(offset as string, 10) : undefined,
    });

    res.status(200).json({
      success: true,
      data: result.data.map(toAppointmentResponse),
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

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userIdHeader = req.headers['x-user-id'];
    const userId = (Array.isArray(userIdHeader) ? userIdHeader[0] : userIdHeader) || 'temp-user-id';
    const id = req.params.id as string;

    const appointment = await getAppointmentById(id, userId);

    if (!appointment) {
      res.status(404).json({
        success: false,
        error: 'Appointment not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: toAppointmentResponse(appointment),
    });
  } catch (error) {
    next(error);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        errors: errors.array(),
      });
      return;
    }

    const id = req.params.id as string;
    const userIdHeader = req.headers['x-user-id'];
    const userId = (Array.isArray(userIdHeader) ? userIdHeader[0] : userIdHeader) || 'temp-user-id';

    const owner = await getAppointmentOwner(id);

    if (!owner) {
      res.status(404).json({
        success: false,
        error: 'Appointment not found',
      });
      return;
    }

    if (owner !== userId) {
      res.status(403).json({
        success: false,
        error: 'Forbidden: You do not have permission to update this appointment',
      });
      return;
    }

    const { title, description, startTime, endTime, timezone } = req.body;

    const updated = await updateAppointment(id, {
      title,
      description,
      start_time: startTime,
      end_time: endTime,
      timezone,
    });

    if (!updated) {
      res.status(404).json({
        success: false,
        error: 'Appointment not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: toAppointmentResponse(updated),
    });
  } catch (error) {
    next(error);
  }
}
