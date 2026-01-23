import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import {
  createAppointment,
  getAppointments,
  getAppointmentById,
  getAppointmentOwner,
  updateAppointment,
  deleteAppointment,
  checkOverlap,
  reversePlanSchedule,
} from '../services/appointmentService';
import { Appointment, toAppointmentResponse } from '../models/appointment';
import { generateConflictSuggestions } from '../services/aiConflictService';

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
    const userId = req.user?.id || req.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized: User not found',
      });
      return;
    }
    const force = req.query.force === 'true';

    const overlapResult = await checkOverlap({
      userId,
      startTime,
      endTime,
    });

    if (overlapResult.hasOverlap && !force) {
      // Generate AI-powered suggestions for conflict resolution
      const aiSuggestions = await generateConflictSuggestions({
        requestedStart: startTime,
        requestedEnd: endTime,
        conflicts: overlapResult.conflicts.map((c) => ({
          id: c.id,
          title: c.title,
          description: c.description,
          start_time: new Date(c.startTime),
          end_time: new Date(c.endTime),
          timezone: c.timezone,
          user_id: c.userId,
          created_at: new Date(c.createdAt),
          updated_at: new Date(c.updatedAt),
          deleted_at: null,
        })) as Appointment[],
        userId,
        title,
      });

      res.status(409).json({
        success: false,
        error: 'Scheduling conflict detected',
        conflicts: overlapResult.conflicts,
        aiSuggestions: aiSuggestions.suggestions,
        conflictPattern: aiSuggestions.conflictPattern,
        historicalContext: aiSuggestions.historicalContext,
      });
      return;
    }

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
    const user = req.user;
    const userId = user?.id || req.userId;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized: User not found',
      });
      return;
    }
    const isAdmin = user?.role === 'admin';
    const isTeamUser = user?.role === 'team';
    const { start, end, limit, offset, userId: filterUserId, includeTeam } = req.query;

    const result = await getAppointments({
      userId,
      start: start as string | undefined,
      end: end as string | undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      offset: offset ? parseInt(offset as string, 10) : undefined,
      isAdmin,
      filterUserId: filterUserId as string | undefined,
      teamId: user?.team_id || undefined,
      includeTeam: isTeamUser && includeTeam === 'true',
    });

    res.status(200).json({
      success: true,
      data: result.data.map((apt) => ({
        ...toAppointmentResponse(apt),
        isOwn: apt.user_id === userId,
      })),
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
    const user = req.user;
    const userId = user?.id || req.userId;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized: User not found',
      });
      return;
    }
    const isAdmin = user?.role === 'admin';
    const isTeamUser = user?.role === 'team';
    const id = req.params.id as string;

    const appointment = await getAppointmentById({
      id,
      userId,
      isAdmin,
      teamId: isTeamUser ? user?.team_id || undefined : undefined,
    });

    if (!appointment) {
      res.status(404).json({
        success: false,
        error: 'Appointment not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        ...toAppointmentResponse(appointment),
        isOwn: appointment.user_id === userId,
      },
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
    const user = req.user;
    const userId = user?.id || req.userId;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized: User not found',
      });
      return;
    }
    const isAdmin = user?.role === 'admin';

    const owner = await getAppointmentOwner(id);

    if (!owner) {
      res.status(404).json({
        success: false,
        error: 'Appointment not found',
      });
      return;
    }

    if (owner !== userId && !isAdmin) {
      res.status(403).json({
        success: false,
        error: 'Forbidden: You do not have permission to update this appointment',
      });
      return;
    }

    const { title, description, startTime, endTime, timezone } = req.body;
    const force = req.query.force === 'true';

    if (startTime || endTime) {
      const appointmentOwnerId = isAdmin ? owner : userId;
      const existingAppointment = await getAppointmentById(id, appointmentOwnerId, isAdmin);
      if (existingAppointment) {
        const checkStartTime = startTime || existingAppointment.start_time.toISOString();
        const checkEndTime = endTime || existingAppointment.end_time.toISOString();

        const overlapResult = await checkOverlap({
          userId: appointmentOwnerId,
          startTime: checkStartTime,
          endTime: checkEndTime,
          excludeId: id,
        });

        if (overlapResult.hasOverlap && !force) {
          // Generate AI-powered suggestions for conflict resolution
          const aiSuggestions = await generateConflictSuggestions({
            requestedStart: checkStartTime,
            requestedEnd: checkEndTime,
            conflicts: overlapResult.conflicts.map((c) => ({
              id: c.id,
              title: c.title,
              description: c.description,
              start_time: new Date(c.startTime),
              end_time: new Date(c.endTime),
              timezone: c.timezone,
              user_id: c.userId,
              created_at: new Date(c.createdAt),
              updated_at: new Date(c.updatedAt),
              deleted_at: null,
            })) as Appointment[],
            userId: appointmentOwnerId,
            title,
          });

          res.status(409).json({
            success: false,
            error: 'Scheduling conflict detected',
            conflicts: overlapResult.conflicts,
            aiSuggestions: aiSuggestions.suggestions,
            conflictPattern: aiSuggestions.conflictPattern,
            historicalContext: aiSuggestions.historicalContext,
          });
          return;
        }
      }
    }

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

export async function reversePlan(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    const userId = req.user?.id || req.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized: User not found' });
      return;
    }

    const { endDate, tasks, resources, timezone, includeWeekends, workdayStart, workdayEnd } =
      req.body;
    const result = await reversePlanSchedule({
      userId,
      endDate,
      tasks,
      resources,
      timezone,
      includeWeekends,
      workdayStart,
      workdayEnd,
    });

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    const user = req.user;
    const userId = user?.id || req.userId;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized: User not found',
      });
      return;
    }
    const isAdmin = user?.role === 'admin';

    const owner = await getAppointmentOwner(id);

    if (!owner) {
      res.status(404).json({
        success: false,
        error: 'Appointment not found',
      });
      return;
    }

    if (owner !== userId && !isAdmin) {
      res.status(403).json({
        success: false,
        error: 'Forbidden: You do not have permission to delete this appointment',
      });
      return;
    }

    await deleteAppointment(id);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
