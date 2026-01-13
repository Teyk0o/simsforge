import { pool } from '@config/database';
import { logger } from '@utils/logger';
import { DatabaseError } from '@utils/errors';

/**
 * Session entity representing a refresh token session
 */
export interface Session {
  id: number;
  userId: number;
  refreshToken: string;
  userAgent: string | null;
  ipAddress: string | null;
  expiresAt: Date;
  createdAt: Date;
}

/**
 * Repository for session data access operations.
 * Manages refresh tokens and session data for JWT authentication.
 */
export class SessionRepository {
  /**
   * Create a new session with refresh token.
   * @param data Session data
   * @returns Created session object
   */
  public async create(data: {
    userId: number;
    refreshToken: string;
    userAgent?: string;
    ipAddress?: string;
    expiresAt: Date;
  }): Promise<Session> {
    try {
      const result = await pool.query(
        `INSERT INTO sessions (user_id, refresh_token, user_agent, ip_address, expires_at)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          data.userId,
          data.refreshToken,
          data.userAgent || null,
          data.ipAddress || null,
          data.expiresAt,
        ]
      );

      if (result.rows.length === 0) {
        throw new DatabaseError('Failed to create session');
      }

      return this.mapRow(result.rows[0] as unknown);
    } catch (error) {
      logger.error('Failed to create session', {
        userId: data.userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new DatabaseError('Failed to create session');
    }
  }

  /**
   * Find a session by refresh token.
   * @param refreshToken Refresh token
   * @returns Session object or null if not found
   */
  public async findByRefreshToken(refreshToken: string): Promise<Session | null> {
    try {
      const result = await pool.query(
        `SELECT * FROM sessions WHERE refresh_token = $1 AND expires_at > NOW()`,
        [refreshToken]
      );
      if (result.rows.length === 0) return null;
      return this.mapRow(result.rows[0] as unknown);
    } catch (error) {
      logger.error('Failed to find session by refresh token', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new DatabaseError('Failed to find session');
    }
  }

  /**
   * Find all active sessions for a user.
   * @param userId User ID
   * @returns Array of active sessions
   */
  public async findByUserId(userId: number): Promise<Session[]> {
    try {
      const result = await pool.query(
        `SELECT * FROM sessions WHERE user_id = $1 AND expires_at > NOW()
         ORDER BY created_at DESC`,
        [userId]
      );
      return result.rows.map((row) => this.mapRow(row as unknown));
    } catch (error) {
      logger.error('Failed to find sessions by user ID', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new DatabaseError('Failed to find sessions');
    }
  }

  /**
   * Delete a session by refresh token.
   * Used for logout.
   * @param refreshToken Refresh token
   */
  public async deleteByRefreshToken(refreshToken: string): Promise<void> {
    try {
      await pool.query('DELETE FROM sessions WHERE refresh_token = $1', [
        refreshToken,
      ]);
    } catch (error) {
      logger.error('Failed to delete session', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new DatabaseError('Failed to delete session');
    }
  }

  /**
   * Delete all sessions for a user.
   * Used for global logout.
   * @param userId User ID
   */
  public async deleteByUserId(userId: number): Promise<void> {
    try {
      await pool.query('DELETE FROM sessions WHERE user_id = $1', [userId]);
    } catch (error) {
      logger.error('Failed to delete user sessions', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new DatabaseError('Failed to delete sessions');
    }
  }

  /**
   * Update refresh token for a session.
   * @param sessionId Session ID
   * @param refreshToken New refresh token
   */
  public async updateRefreshToken(sessionId: number, refreshToken: string): Promise<void> {
    try {
      await pool.query('UPDATE sessions SET refresh_token = $1 WHERE id = $2', [
        refreshToken,
        sessionId,
      ]);
    } catch (error) {
      logger.error('Failed to update session refresh token', {
        sessionId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new DatabaseError('Failed to update session refresh token');
    }
  }

  /**
   * Delete expired sessions (cleanup).
   */
  public async deleteExpired(): Promise<number> {
    try {
      const result = await pool.query('DELETE FROM sessions WHERE expires_at <= NOW()');
      return result.rowCount || 0;
    } catch (error) {
      logger.error('Failed to delete expired sessions', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new DatabaseError('Failed to delete expired sessions');
    }
  }

  /**
   * Map database row to Session object with proper types
   */
  private mapRow(row: unknown): Session {
    const r = row as Record<string, unknown>;
    return {
      id: r.id as number,
      userId: r.user_id as number,
      refreshToken: r.refresh_token as string,
      userAgent: (r.user_agent as string | null) || null,
      ipAddress: (r.ip_address as string | null) || null,
      expiresAt: new Date(r.expires_at as string),
      createdAt: new Date(r.created_at as string),
    };
  }
}
