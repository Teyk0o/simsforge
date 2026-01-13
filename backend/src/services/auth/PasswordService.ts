import { hash, verify } from 'argon2';
import { randomBytes } from 'crypto';
import { logger } from '@utils/logger';

/**
 * Password service for secure password hashing and verification.
 * Uses Argon2id algorithm for superior security compared to bcrypt.
 */
export class PasswordService {
  /**
   * Hash a password using Argon2id algorithm.
   * @param password Plain text password to hash
   * @returns Hashed password string
   */
  public async hashPassword(password: string): Promise<string> {
    try {
      return await hash(password, {
        type: 2, // Argon2id
        memoryCost: 19 * 1024, // 19MB
        timeCost: 2,
        parallelism: 1,
      });
    } catch (error) {
      logger.error('Password hashing failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Verify a password against its hash.
   * @param password Plain text password to verify
   * @param hash Hash to verify against
   * @returns True if password matches, false otherwise
   */
  public async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      return await verify(hash, password);
    } catch (error) {
      logger.error('Password verification failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Generate a secure random token for password reset or email verification.
   * @returns 32-byte random token as hex string
   */
  public generateResetToken(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Calculate when a reset token expires (24 hours from now).
   * @returns Date object for token expiration
   */
  public getResetTokenExpiry(): Date {
    const expiryTime = new Date();
    expiryTime.setHours(expiryTime.getHours() + 24);
    return expiryTime;
  }
}
