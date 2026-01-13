import { pool } from '@config/database';
import { logger } from '@utils/logger';
import { DatabaseError, NotFoundError } from '@utils/errors';

/**
 * User entity representing a database user
 */
export interface User {
  id: number;
  email: string;
  passwordHash: string;
  username: string;
  avatarUrl: string | null;
  preferredLanguage: string;
  role: 'user' | 'creator' | 'admin';
  emailVerified: boolean;
  emailVerificationToken: string | null;
  passwordResetToken: string | null;
  passwordResetExpires: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Repository for user data access operations.
 * Handles all database queries related to users.
 */
export class UserRepository {
  /**
   * Find a user by ID.
   * @param id User ID
   * @returns User object or null if not found
   */
  public async findById(id: number): Promise<User | null> {
    try {
      const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
      if (result.rows.length === 0) return null;
      return this.mapRow(result.rows[0] as unknown);
    } catch (error) {
      logger.error('Failed to find user by ID', {
        id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new DatabaseError('Failed to find user');
    }
  }

  /**
   * Find a user by email.
   * @param email User email address
   * @returns User object or null if not found
   */
  public async findByEmail(email: string): Promise<User | null> {
    try {
      const result = await pool.query('SELECT * FROM users WHERE email = $1', [
        email.toLowerCase(),
      ]);
      if (result.rows.length === 0) return null;
      return this.mapRow(result.rows[0] as unknown);
    } catch (error) {
      logger.error('Failed to find user by email', {
        email,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new DatabaseError('Failed to find user');
    }
  }

  /**
   * Find a user by username.
   * @param username User username
   * @returns User object or null if not found
   */
  public async findByUsername(username: string): Promise<User | null> {
    try {
      const result = await pool.query('SELECT * FROM users WHERE username = $1', [
        username,
      ]);
      if (result.rows.length === 0) return null;
      return this.mapRow(result.rows[0] as unknown);
    } catch (error) {
      logger.error('Failed to find user by username', {
        username,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new DatabaseError('Failed to find user');
    }
  }

  /**
   * Create a new user.
   * @param data User data
   * @returns Created user object
   */
  public async create(data: {
    email: string;
    passwordHash: string;
    username: string;
    preferredLanguage?: string;
  }): Promise<User> {
    try {
      const result = await pool.query(
        `INSERT INTO users (email, password_hash, username, preferred_language, role)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          data.email.toLowerCase(),
          data.passwordHash,
          data.username,
          data.preferredLanguage || 'en',
          'user',
        ]
      );

      if (result.rows.length === 0) {
        throw new DatabaseError('Failed to create user');
      }

      return this.mapRow(result.rows[0] as unknown);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes('duplicate key value violates unique constraint')
      ) {
        throw new Error('Email or username already exists');
      }
      logger.error('Failed to create user', {
        email: data.email,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new DatabaseError('Failed to create user');
    }
  }

  /**
   * Update user by ID.
   * @param id User ID
   * @param data Partial user data to update
   * @returns Updated user object
   */
  public async updateById(
    id: number,
    data: Partial<{
      email: string;
      username: string;
      avatarUrl: string | null;
      preferredLanguage: string;
      emailVerified: boolean;
      isActive: boolean;
    }>
  ): Promise<User> {
    try {
      const fields: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      if (data.email !== undefined) {
        fields.push(`email = $${paramIndex++}`);
        values.push(data.email.toLowerCase());
      }
      if (data.username !== undefined) {
        fields.push(`username = $${paramIndex++}`);
        values.push(data.username);
      }
      if (data.avatarUrl !== undefined) {
        fields.push(`avatar_url = $${paramIndex++}`);
        values.push(data.avatarUrl);
      }
      if (data.preferredLanguage !== undefined) {
        fields.push(`preferred_language = $${paramIndex++}`);
        values.push(data.preferredLanguage);
      }
      if (data.emailVerified !== undefined) {
        fields.push(`email_verified = $${paramIndex++}`);
        values.push(data.emailVerified);
      }
      if (data.isActive !== undefined) {
        fields.push(`is_active = $${paramIndex++}`);
        values.push(data.isActive);
      }

      if (fields.length === 0) {
        return this.findById(id).then((user) => {
          if (!user) throw new NotFoundError('User');
          return user;
        });
      }

      values.push(id);
      const query = `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;

      const result = await pool.query(query, values);
      if (result.rows.length === 0) {
        throw new NotFoundError('User');
      }

      return this.mapRow(result.rows[0] as unknown);
    } catch (error) {
      logger.error('Failed to update user', {
        id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error instanceof DatabaseError || error instanceof NotFoundError
        ? error
        : new DatabaseError('Failed to update user');
    }
  }

  /**
   * Update password reset token and expiry.
   * @param userId User ID
   * @param token Reset token
   * @param expiresAt Token expiration time
   */
  public async setPasswordResetToken(
    userId: number,
    token: string,
    expiresAt: Date
  ): Promise<void> {
    try {
      await pool.query(
        `UPDATE users SET password_reset_token = $1, password_reset_expires = $2
         WHERE id = $3`,
        [token, expiresAt, userId]
      );
    } catch (error) {
      logger.error('Failed to set password reset token', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new DatabaseError('Failed to set password reset token');
    }
  }

  /**
   * Update password and clear reset token.
   * @param userId User ID
   * @param passwordHash New password hash
   */
  public async updatePassword(userId: number, passwordHash: string): Promise<void> {
    try {
      await pool.query(
        `UPDATE users SET password_hash = $1, password_reset_token = NULL, password_reset_expires = NULL
         WHERE id = $2`,
        [passwordHash, userId]
      );
    } catch (error) {
      logger.error('Failed to update password', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new DatabaseError('Failed to update password');
    }
  }

  /**
   * Find user by password reset token.
   * @param token Reset token
   * @returns User object if token is valid, null otherwise
   */
  public async findByResetToken(token: string): Promise<User | null> {
    try {
      const result = await pool.query(
        `SELECT * FROM users WHERE password_reset_token = $1 AND password_reset_expires > NOW()`,
        [token]
      );
      if (result.rows.length === 0) return null;
      return this.mapRow(result.rows[0] as unknown);
    } catch (error) {
      logger.error('Failed to find user by reset token', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new DatabaseError('Failed to find user');
    }
  }

  /**
   * Map database row to User object with proper types
   */
  private mapRow(row: unknown): User {
    const r = row as Record<string, unknown>;
    return {
      id: r.id as number,
      email: r.email as string,
      passwordHash: r.password_hash as string,
      username: r.username as string,
      avatarUrl: (r.avatar_url as string | null) || null,
      preferredLanguage: r.preferred_language as string,
      role: r.role as 'user' | 'creator' | 'admin',
      emailVerified: r.email_verified as boolean,
      emailVerificationToken: (r.email_verification_token as string | null) || null,
      passwordResetToken: (r.password_reset_token as string | null) || null,
      passwordResetExpires: r.password_reset_expires
        ? new Date(r.password_reset_expires as string)
        : null,
      isActive: r.is_active as boolean,
      createdAt: new Date(r.created_at as string),
      updatedAt: new Date(r.updated_at as string),
    };
  }
}
