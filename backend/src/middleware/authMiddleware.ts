import { Request, Response, NextFunction } from 'express';
import { JwtService } from '@services/auth/JwtService';
import { UserRepository } from '@repositories/UserRepository';
import { logger } from '@utils/logger';
import { UnauthorizedError } from '@utils/errors';

/**
 * Authentication middleware for JWT verification.
 * Verifies access token and attaches user data to request.
 * Must be used on protected routes.
 *
 * @example
 * router.get('/protected', authMiddleware, handler);
 */
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Extract token from Authorization header
    const jwtService = new JwtService();
    const token = jwtService.extractTokenFromHeader(req.headers.authorization);

    if (!token) {
      throw new UnauthorizedError('No authentication token provided');
    }

    // Verify token
    let payload;
    try {
      payload = jwtService.verifyAccessToken(token);
    } catch (error) {
      throw new UnauthorizedError(
        error instanceof Error ? error.message : 'Invalid token'
      );
    }

    // Verify user still exists and is active
    const userRepository = new UserRepository();
    const user = await userRepository.findById(payload.userId);

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('Account has been suspended');
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      isActive: user.isActive,
    };

    next();
  } catch (error) {
    const err = error instanceof UnauthorizedError
      ? error
      : new UnauthorizedError('Authentication failed');

    logger.warn('Authentication failed', {
      error: err.message,
      path: req.path,
    });

    res.status(err.statusCode).json({
      error: {
        message: err.message,
        statusCode: err.statusCode,
      },
    });
  }
}

/**
 * Optional authentication middleware.
 * Attempts to authenticate but does not fail if token is missing.
 * Useful for routes that work with or without authentication.
 *
 * @example
 * router.get('/public', optionalAuthMiddleware, handler);
 */
export async function optionalAuthMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Extract token from Authorization header
    const jwtService = new JwtService();
    const token = jwtService.extractTokenFromHeader(req.headers.authorization);

    if (!token) {
      // No token provided, but that's okay
      next();
      return;
    }

    // Verify token
    let payload;
    try {
      payload = jwtService.verifyAccessToken(token);
    } catch (error) {
      // Invalid token, but continue without user
      logger.debug('Optional auth token invalid', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      next();
      return;
    }

    // Verify user still exists and is active
    const userRepository = new UserRepository();
    const user = await userRepository.findById(payload.userId);

    if (user && user.isActive) {
      // Attach user to request
      req.user = {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        isActive: user.isActive,
      };
    }

    next();
  } catch (error) {
    // Log unexpected errors but don't fail
    logger.error('Unexpected error in optional auth middleware', {
      error: error instanceof Error ? error.message : String(error),
    });
    next();
  }
}
