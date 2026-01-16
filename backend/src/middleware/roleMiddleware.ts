import type { Request, Response, NextFunction } from 'express';
import { getUserById } from '../services/userService';
import type { User } from '../models/user';
import { UserRole } from '../models/user';

declare module 'express-serve-static-core' {
  interface Request {
    user?: User;
  }
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
