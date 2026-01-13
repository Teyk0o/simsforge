import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '@utils/errors';
import { logger } from '@utils/logger';

type UserRole = 'user' | 'creator' | 'admin';

/**
 * Role-based access control middleware.
 * Checks if authenticated user has required role.
 * Must be used AFTER authMiddleware.
 *
 * @param allowedRoles Array of roles allowed to access route
 * @returns Middleware function
 *
 * @example
 * router.post('/creators', authMiddleware, requireRole(['creator', 'admin']), handler);
 */
export function requireRole(allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Check if user is authenticated
    if (!req.user) {
      const error = new ForbiddenError('Authentication required');
      res.status(error.statusCode).json({
        error: {
          message: error.message,
          statusCode: error.statusCode,
        },
      });
      return;
    }

    // Check if user role is allowed
    if (!allowedRoles.includes(req.user.role as UserRole)) {
      logger.warn('Unauthorized role access attempt', {
        userId: req.user.id,
        userRole: req.user.role,
        requiredRoles: allowedRoles,
        path: req.path,
      });

      const error = new ForbiddenError(
        `This action requires one of these roles: ${allowedRoles.join(', ')}`
      );
      res.status(error.statusCode).json({
        error: {
          message: error.message,
          statusCode: error.statusCode,
        },
      });
      return;
    }

    next();
  };
}

/**
 * Require creator role.
 * Shorthand for requireRole(['creator', 'admin'])
 *
 * @example
 * router.post('/mods', authMiddleware, requireCreator, handler);
 */
export const requireCreator = requireRole(['creator', 'admin']);

/**
 * Require admin role.
 * Shorthand for requireRole(['admin'])
 *
 * @example
 * router.get('/admin/reports', authMiddleware, requireAdmin, handler);
 */
export const requireAdmin = requireRole(['admin']);
