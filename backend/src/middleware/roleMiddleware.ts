import type { Request, Response, NextFunction } from 'express';
import { getUserById } from '../services/userService';
import type { User } from '../models/user';
import { UserRole } from '../models/user';

declare module 'express-serve-static-core' {
  interface Request {
    user?: User;
    userId?: string;
  }
}

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function requireUserId(req: Request, res: Response, next: NextFunction): void {
  const userIdHeader = req.headers['x-user-id'];
  const userId = Array.isArray(userIdHeader) ? userIdHeader[0] : userIdHeader;

  if (!userId) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized: User ID required',
    });
    return;
  }

  if (!uuidRegex.test(userId)) {
    res.status(400).json({
      success: false,
      error: 'Invalid user id format',
    });
    return;
  }

  req.userId = userId;
  next();
}

export function requireRole(...allowedRoles: UserRole[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userIdHeader = req.headers['x-user-id'];
      const userId = Array.isArray(userIdHeader) ? userIdHeader[0] : userIdHeader;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized: User ID required',
        });
        return;
      }

      const user = await getUserById(userId);

      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized: User not found',
        });
        return;
      }

      if (!allowedRoles.includes(user.role)) {
        res.status(403).json({
          success: false,
          error: 'Forbidden: Insufficient permissions',
        });
        return;
      }

      req.user = user;
      next();
    } catch (error) {
      next(error);
    }
  };
}

export async function loadUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userIdHeader = req.headers['x-user-id'];
    const userId = Array.isArray(userIdHeader) ? userIdHeader[0] : userIdHeader;

    if (userId) {
      const user = await getUserById(userId);
      if (user) {
        req.user = user;
      }
    }

    next();
  } catch (error) {
    next(error);
  }
}
