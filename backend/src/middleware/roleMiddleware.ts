import type { Request, Response, NextFunction } from 'express';
import { getUserById } from '../services/userService';
import { verifyToken, isTokenBlacklisted } from '../services/authService';
import { hasPermission } from '../services/permissionService';
import type { User } from '../models/user';
import { UserRole } from '../models/user';

declare module 'express-serve-static-core' {
  interface Request {
    user?: User;
    userId?: string;
  }
}

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const resolveUserId = (req: Request): string | null => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    if (isTokenBlacklisted(token)) {
      return null;
    }
    return verifyToken(token);
  }

  return null;
};

export function requireUserId(req: Request, res: Response, next: NextFunction): void {
  const userId = resolveUserId(req);

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
      const userId = resolveUserId(req);

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
      req.userId = user.id;
      next();
    } catch (error) {
      next(error);
    }
  };
}

export async function loadUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = resolveUserId(req);

    if (userId) {
      const user = await getUserById(userId);
      if (user) {
        req.user = user;
        req.userId = user.id;
      }
    }

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Permission-based authorization middleware.
 * Checks if the authenticated user's role grants the required permission(s).
 * All listed permissions must be present (AND logic).
 *
 * Usage:
 *   router.post('/projects', requirePermission('projects:write'), handler);
 *   router.delete('/projects/:id', requirePermission('projects:delete', 'projects:write'), handler);
 */
export function requirePermission(...requiredPermissions: string[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = resolveUserId(req);

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

      // Check each required permission
      for (const permission of requiredPermissions) {
        const allowed = await hasPermission(userId, permission);
        if (!allowed) {
          res.status(403).json({
            success: false,
            error: 'Forbidden: Insufficient permissions',
          });
          return;
        }
      }

      req.user = user;
      req.userId = user.id;
      next();
    } catch (error) {
      next(error);
    }
  };
}
