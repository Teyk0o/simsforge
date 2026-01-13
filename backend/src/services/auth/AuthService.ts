import { PasswordService } from './PasswordService';
import { JwtService, JwtAccessPayload, JwtRefreshPayload } from './JwtService';
import { UserRepository, User } from '@repositories/UserRepository';
import { SessionRepository } from '@repositories/SessionRepository';
import { logger } from '@utils/logger';
import {
  ValidationError,
  UnauthorizedError,
  ConflictError,
  NotFoundError,
} from '@utils/errors';

/**
 * Authentication request data
 */
export interface RegisterRequest {
  email: string;
  password: string;
  username: string;
}

/**
 * Login request data
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Session metadata from request
 */
export interface SessionMetadata {
  userAgent?: string;
  ipAddress?: string;
}

/**
 * Authentication response with tokens
 */
export interface AuthResponse {
  user: {
    id: number;
    email: string;
    username: string;
    role: string;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

/**
 * Token pair for refresh response
 */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * Authentication service handling all auth operations.
 * Manages user registration, login, token refresh, and logout.
 */
export class AuthService {
  private passwordService: PasswordService;
  private jwtService: JwtService;
  private userRepository: UserRepository;
  private sessionRepository: SessionRepository;

  constructor(
    passwordService: PasswordService,
    jwtService: JwtService,
    userRepository: UserRepository,
    sessionRepository: SessionRepository
  ) {
    this.passwordService = passwordService;
    this.jwtService = jwtService;
    this.userRepository = userRepository;
    this.sessionRepository = sessionRepository;
  }

  /**
   * Register a new user.
   * @param data Registration data
   * @param metadata Session metadata
   * @returns Auth response with tokens
   */
  public async register(
    data: RegisterRequest,
    metadata: SessionMetadata
  ): Promise<AuthResponse> {
    // Validate input
    if (!data.email || !data.password || !data.username) {
      throw new ValidationError('Email, password, and username are required');
    }

    if (data.password.length < 8) {
      throw new ValidationError('Password must be at least 8 characters long');
    }

    if (data.username.length < 3 || data.username.length > 50) {
      throw new ValidationError('Username must be between 3 and 50 characters');
    }

    // Check if email or username already exists
    const existingEmail = await this.userRepository.findByEmail(data.email);
    if (existingEmail) {
      throw new ConflictError('Email already in use');
    }

    const existingUsername = await this.userRepository.findByUsername(data.username);
    if (existingUsername) {
      throw new ConflictError('Username already in use');
    }

    // Hash password
    const passwordHash = await this.passwordService.hashPassword(data.password);

    // Create user
    const user = await this.userRepository.create({
      email: data.email,
      passwordHash,
      username: data.username,
    });

    logger.info('User registered successfully', {
      userId: user.id,
      email: user.email,
    });

    // Create session and generate tokens
    const tokens = await this.createSession(user, metadata);

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
      },
      tokens,
    };
  }

  /**
   * Login a user.
   * @param credentials Login credentials
   * @param metadata Session metadata
   * @returns Auth response with tokens
   */
  public async login(
    credentials: LoginRequest,
    metadata: SessionMetadata
  ): Promise<AuthResponse> {
    // Validate input
    if (!credentials.email || !credentials.password) {
      throw new ValidationError('Email and password are required');
    }

    // Find user by email
    const user = await this.userRepository.findByEmail(credentials.email);
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Check if account is active
    if (!user.isActive) {
      throw new UnauthorizedError('Account has been suspended');
    }

    // Verify password
    const isPasswordValid = await this.passwordService.verifyPassword(
      credentials.password,
      user.passwordHash
    );
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    logger.info('User logged in successfully', {
      userId: user.id,
      email: user.email,
    });

    // Create session and generate tokens
    const tokens = await this.createSession(user, metadata);

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
      },
      tokens,
    };
  }

  /**
   * Refresh access token using refresh token.
   * @param refreshToken Refresh token from client
   * @returns New token pair
   */
  public async refreshTokens(refreshToken: string): Promise<TokenPair> {
    // Verify refresh token
    let payload: JwtRefreshPayload;
    try {
      payload = this.jwtService.verifyRefreshToken(refreshToken);
    } catch (error) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    // Find session
    const session = await this.sessionRepository.findByRefreshToken(refreshToken);
    if (!session) {
      throw new UnauthorizedError('Session not found or expired');
    }

    // Verify session matches token payload
    if (session.userId !== payload.userId || session.id !== payload.sessionId) {
      throw new UnauthorizedError('Session mismatch');
    }

    // Find user
    const user = await this.userRepository.findById(payload.userId);
    if (!user) {
      throw new NotFoundError('User');
    }

    // Check if account is active
    if (!user.isActive) {
      await this.sessionRepository.deleteByUserId(user.id);
      throw new UnauthorizedError('Account has been suspended');
    }

    // Generate new tokens
    const accessToken = this.generateAccessToken(user);
    const newRefreshToken = this.generateRefreshToken(user, session.id);

    logger.info('Tokens refreshed successfully', {
      userId: user.id,
    });

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  /**
   * Logout a user by invalidating refresh token.
   * @param userId User ID
   * @param refreshToken Refresh token to invalidate
   */
  public async logout(userId: number, refreshToken: string): Promise<void> {
    // Verify refresh token belongs to user
    try {
      const payload = this.jwtService.verifyRefreshToken(refreshToken);
      if (payload.userId !== userId) {
        throw new UnauthorizedError('Token does not belong to user');
      }
    } catch (error) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    // Delete session
    await this.sessionRepository.deleteByRefreshToken(refreshToken);

    logger.info('User logged out successfully', {
      userId,
    });
  }

  /**
   * Request password reset by sending reset token.
   * @param email User email
   */
  public async requestPasswordReset(email: string): Promise<void> {
    // Find user by email
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      // Don't reveal if email exists or not
      logger.info('Password reset requested for non-existent email', { email });
      return;
    }

    // Generate reset token
    const resetToken = this.passwordService.generateResetToken();
    const expiresAt = this.passwordService.getResetTokenExpiry();

    // Save reset token
    await this.userRepository.setPasswordResetToken(user.id, resetToken, expiresAt);

    logger.info('Password reset token generated', {
      userId: user.id,
      email: user.email,
    });

    // TODO: In Phase 1.2+, send email with reset link
    // For now, log the reset token (development only)
    if (process.env.NODE_ENV === 'development') {
      logger.debug('Password reset token (DEV ONLY)', { resetToken });
    }
  }

  /**
   * Reset password with reset token.
   * @param token Reset token
   * @param newPassword New password
   */
  public async resetPassword(token: string, newPassword: string): Promise<void> {
    // Validate new password
    if (!newPassword || newPassword.length < 8) {
      throw new ValidationError('Password must be at least 8 characters long');
    }

    // Find user by reset token
    const user = await this.userRepository.findByResetToken(token);
    if (!user) {
      throw new UnauthorizedError('Invalid or expired reset token');
    }

    // Hash new password
    const passwordHash = await this.passwordService.hashPassword(newPassword);

    // Update password
    await this.userRepository.updatePassword(user.id, passwordHash);

    // Invalidate all sessions (user must re-login)
    await this.sessionRepository.deleteByUserId(user.id);

    logger.info('Password reset successfully', {
      userId: user.id,
      email: user.email,
    });
  }

  /**
   * Create a new session and generate tokens.
   * Private helper method.
   * Invalidates previous sessions for this user (one active session per user).
   */
  private async createSession(
    user: User,
    metadata: SessionMetadata
  ): Promise<TokenPair> {
    // Invalidate all previous sessions for this user
    await this.sessionRepository.deleteByUserId(user.id);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

    // Create a temporary session to get the ID for refresh token generation
    const tempSession = await this.sessionRepository.create({
      userId: user.id,
      refreshToken: '', // Placeholder, will be updated below
      userAgent: metadata.userAgent,
      ipAddress: metadata.ipAddress,
      expiresAt,
    });

    // Generate tokens with the actual session ID
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user, tempSession.id);

    // Persist the refresh token in the session
    await this.sessionRepository.updateRefreshToken(tempSession.id, refreshToken);

    return {
      accessToken,
      refreshToken,
    };
  }

  /**
   * Generate access token for user.
   * Private helper method.
   */
  private generateAccessToken(user: User): string {
    const payload: JwtAccessPayload = {
      userId: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    };
    return this.jwtService.generateAccessToken(payload);
  }

  /**
   * Generate refresh token for session.
   * Private helper method.
   */
  private generateRefreshToken(user: User, sessionId: number): string {
    const payload: JwtRefreshPayload = {
      userId: user.id,
      sessionId,
    };
    return this.jwtService.generateRefreshToken(payload);
  }
}
