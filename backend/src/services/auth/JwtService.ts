import jwt, { JwtPayload as JwtPayloadType, SignOptions } from 'jsonwebtoken';
import { env } from '@config/environment';
import { logger } from '@utils/logger';
import { UnauthorizedError } from '@utils/errors';

/**
 * JWT payload structure for access tokens
 */
export interface JwtAccessPayload extends JwtPayloadType {
  userId: number;
  email: string;
  username: string;
  role: 'user' | 'creator' | 'admin';
}

/**
 * JWT payload structure for refresh tokens
 */
export interface JwtRefreshPayload extends JwtPayloadType {
  userId: number;
  sessionId: number;
}

/**
 * JWT service for generating and verifying JSON Web Tokens.
 * Handles both access tokens (short-lived) and refresh tokens (long-lived).
 */
export class JwtService {
  /**
   * Generate an access token (valid for 15 minutes by default).
   * Contains user identification and role for authorization.
   * @param payload User data for token
   * @returns Signed access token
   */
  public generateAccessToken(payload: JwtAccessPayload): string {
    try {
      return jwt.sign(payload, env.JWT_SECRET, {
        expiresIn: env.JWT_ACCESS_EXPIRY,
        algorithm: 'HS256',
      } as SignOptions);
    } catch (error) {
      logger.error('Failed to generate access token', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Generate a refresh token (valid for 30 days by default).
   * Only contains minimal data (userId, sessionId) for security.
   * @param payload Session data for token
   * @returns Signed refresh token
   */
  public generateRefreshToken(payload: JwtRefreshPayload): string {
    try {
      return jwt.sign(payload, env.JWT_SECRET, {
        expiresIn: env.JWT_REFRESH_EXPIRY,
        algorithm: 'HS256',
      } as SignOptions);
    } catch (error) {
      logger.error('Failed to generate refresh token', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Verify and decode an access token.
   * @param token Access token to verify
   * @returns Decoded token payload
   * @throws UnauthorizedError if token is invalid or expired
   */
  public verifyAccessToken(token: string): JwtAccessPayload {
    try {
      return jwt.verify(token, env.JWT_SECRET, {
        algorithms: ['HS256'],
      }) as JwtAccessPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError('Access token has expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedError('Invalid access token');
      }
      throw new UnauthorizedError('Token verification failed');
    }
  }

  /**
   * Verify and decode a refresh token.
   * @param token Refresh token to verify
   * @returns Decoded token payload
   * @throws UnauthorizedError if token is invalid or expired
   */
  public verifyRefreshToken(token: string): JwtRefreshPayload {
    try {
      return jwt.verify(token, env.JWT_SECRET, {
        algorithms: ['HS256'],
      }) as JwtRefreshPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError('Refresh token has expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedError('Invalid refresh token');
      }
      throw new UnauthorizedError('Token verification failed');
    }
  }

  /**
   * Extract token from Authorization header.
   * Expected format: "Bearer <token>"
   * @param authHeader Authorization header value
   * @returns Token string or null if not found
   */
  public extractTokenFromHeader(authHeader?: string): string | null {
    if (!authHeader) return null;

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1];
  }
}
