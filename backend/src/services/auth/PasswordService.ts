import { hash, compare } from 'bcrypt';
import { randomBytes } from 'crypto';
import { logger } from '@utils/logger';

/**
 * Password service for secure password hashing and verification.
 * Uses bcrypt algorithm for password security.
 */
export class PasswordService {
  private readonly saltRounds = 12;

  /**
   * Hash a password using bcrypt.
   * @param password Plain text password to hash
   * @returns Hashed password string
   */
  public async hashPassword(password: string): Promise<string> {
    try {
      return await hash(password, this.saltRounds);
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
   * @param passwordHash Hash to verify against
   * @returns True if password matches, false otherwise
   */
  public async verifyPassword(password: string, passwordHash: string): Promise<boolean> {
    try {
      return await compare(password, passwordHash);
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
