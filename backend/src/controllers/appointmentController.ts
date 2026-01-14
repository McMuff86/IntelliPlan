import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { createAppointment } from '../services/appointmentService';
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
