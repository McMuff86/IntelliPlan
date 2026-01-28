import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import {
  createReminder,
  getRemindersForAppointment,
  getUpcomingReminders,
  dismissReminder,
  deleteReminder,
} from '../services/reminderService';
import { toReminderResponse } from '../models/reminder';

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

    const userId = req.user?.id || req.userId;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized: User not found',
      });
      return;
    }

    const { appointmentId, offsetMinutes, remindAt } = req.body;

    const reminder = await createReminder(userId, {
      appointmentId,
      offsetMinutes,
      remindAt,
    });

    res.status(201).json({
      success: true,
      data: toReminderResponse(reminder),
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Appointment not found') {
      res.status(404).json({
        success: false,
        error: 'Appointment not found',
      });
      return;
    }
    next(error);
  }
}

export async function getUpcoming(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.id || req.userId;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized: User not found',
      });
      return;
    }

    const reminders = await getUpcomingReminders(userId);

    res.status(200).json({
      success: true,
      data: reminders.map(toReminderResponse),
    });
  } catch (error) {
    next(error);
  }
}

export async function getForAppointment(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.id || req.userId;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized: User not found',
      });
      return;
    }

    const appointmentId = req.params.id as string;

    const reminders = await getRemindersForAppointment(appointmentId, userId);

    res.status(200).json({
      success: true,
      data: reminders.map(toReminderResponse),
    });
  } catch (error) {
    next(error);
  }
}

export async function dismiss(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.id || req.userId;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized: User not found',
      });
      return;
    }

    const id = req.params.id as string;

    const reminder = await dismissReminder(id, userId);

    if (!reminder) {
      res.status(404).json({
        success: false,
        error: 'Reminder not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: toReminderResponse(reminder),
    });
  } catch (error) {
    next(error);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.id || req.userId;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized: User not found',
      });
      return;
    }

    const id = req.params.id as string;

    const deleted = await deleteReminder(id, userId);

    if (!deleted) {
      res.status(404).json({
        success: false,
        error: 'Reminder not found',
      });
      return;
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
