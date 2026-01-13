import { Router } from 'express';
import { AuthController } from '@controllers/AuthController';
import { authLimiter, passwordResetLimiter } from '@middleware/rateLimitMiddleware';
import { authMiddleware } from '@middleware/authMiddleware';

/**
 * Authentication routes.
 * All authentication endpoints: register, login, refresh, logout, password reset.
 */
export function createAuthRoutes(): Router {
  const router = Router();
  const controller = new AuthController();

  /**
   * POST /api/v1/auth/register
   * Register a new user account.
   * Rate limited to prevent abuse.
   */
  router.post('/register', authLimiter, controller.register);

  /**
   * POST /api/v1/auth/login
   * Authenticate user and return access + refresh tokens.
   * Rate limited to prevent brute force attacks.
   */
  router.post('/login', authLimiter, controller.login);

  /**
   * POST /api/v1/auth/refresh
   * Refresh access token using refresh token.
   * Returns new access + refresh tokens.
   */
  router.post('/refresh', controller.refresh);

  /**
   * POST /api/v1/auth/logout
   * Logout user by invalidating refresh token.
   * Requires authentication.
   */
  router.post('/logout', authMiddleware, controller.logout);

  /**
   * POST /api/v1/auth/forgot-password
   * Request password reset.
   * Sends reset token via email (future implementation).
   * Rate limited to prevent email spam.
   */
  router.post('/forgot-password', passwordResetLimiter, controller.forgotPassword);

  /**
   * POST /api/v1/auth/reset-password
   * Reset password using reset token.
   * Called from password reset email link.
   */
  router.post('/reset-password', controller.resetPassword);

  return router;
}
