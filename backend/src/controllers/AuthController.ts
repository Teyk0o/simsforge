import { Request, Response } from 'express';
import { AuthService, SessionMetadata } from '@services/auth/AuthService';
import { PasswordService } from '@services/auth/PasswordService';
import { JwtService } from '@services/auth/JwtService';
import { UserRepository } from '@repositories/UserRepository';
import { SessionRepository } from '@repositories/SessionRepository';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  logoutSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '@validators/auth.validator';
import { asyncHandler } from '@middleware/errorMiddleware';
import { logger } from '@utils/logger';

/**
 * Authentication controller handling all auth-related HTTP requests.
 */
export class AuthController {
  private authService: AuthService;

  constructor() {
    const passwordService = new PasswordService();
    const jwtService = new JwtService();
    const userRepository = new UserRepository();
    const sessionRepository = new SessionRepository();

    this.authService = new AuthService(
      passwordService,
      jwtService,
      userRepository,
      sessionRepository
    );
  }

  /**
   * POST /api/v1/auth/register
   * Register a new user account.
   */
  public register = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    // Validate request
    const data = registerSchema.parse(req.body);

    // Get session metadata
    const metadata: SessionMetadata = {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    };

    // Register user
    const result = await this.authService.register(data, metadata);

    logger.info('User registration successful', {
      userId: result.user.id,
      email: result.user.email,
    });

    res.status(201).json({
      data: result,
      success: true,
    });
  });

  /**
   * POST /api/v1/auth/login
   * Authenticate user and return tokens.
   */
  public login = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    // Validate request
    const credentials = loginSchema.parse(req.body);

    // Get session metadata
    const metadata: SessionMetadata = {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    };

    // Login user
    const result = await this.authService.login(credentials, metadata);

    logger.info('User login successful', {
      userId: result.user.id,
      email: result.user.email,
    });

    res.status(200).json({
      data: result,
      success: true,
    });
  });

  /**
   * POST /api/v1/auth/refresh
   * Refresh access token using refresh token.
   */
  public refresh = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    // Validate request
    const data = refreshTokenSchema.parse(req.body);

    // Refresh tokens
    const result = await this.authService.refreshTokens(data.refreshToken);

    logger.info('Tokens refreshed successfully');

    res.status(200).json({
      data: result,
      success: true,
    });
  });

  /**
   * POST /api/v1/auth/logout
   * Logout user by invalidating refresh token.
   */
  public logout = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    // Check authentication
    if (!req.user) {
      res.status(401).json({
        error: {
          message: 'Unauthorized',
          statusCode: 401,
        },
      });
      return;
    }

    // Validate request
    const data = logoutSchema.parse(req.body);

    // Logout user
    await this.authService.logout(req.user.id, data.refreshToken);

    logger.info('User logout successful', {
      userId: req.user.id,
    });

    res.status(200).json({
      data: { success: true },
      success: true,
    });
  });

  /**
   * POST /api/v1/auth/forgot-password
   * Request password reset by sending reset token via email.
   */
  public forgotPassword = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      // Validate request
      const data = forgotPasswordSchema.parse(req.body);

      // Request password reset
      await this.authService.requestPasswordReset(data.email);

      logger.info('Password reset requested', {
        email: data.email,
      });

      // Always return success to prevent email enumeration
      res.status(200).json({
        data: {
          message: 'If an account exists with this email, a password reset link has been sent.',
        },
        success: true,
      });
    }
  );

  /**
   * POST /api/v1/auth/reset-password
   * Reset password using reset token.
   */
  public resetPassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    // Validate request
    const data = resetPasswordSchema.parse(req.body);

    // Reset password
    await this.authService.resetPassword(data.token, data.newPassword);

    logger.info('Password reset successful');

    res.status(200).json({
      data: { message: 'Password reset successful. Please login with your new password.' },
      success: true,
    });
  });
}
