import { UserRepository, User } from '@repositories/UserRepository';
import { logger } from '@utils/logger';
import { NotFoundError, ValidationError } from '@utils/errors';

/**
 * User profile service handling user-related operations.
 */
export class UserService {
  private userRepository: UserRepository;

  constructor(userRepository: UserRepository) {
    this.userRepository = userRepository;
  }

  /**
   * Get user profile by ID.
   * @param userId User ID
   * @returns User profile without sensitive data
   */
  public async getUserProfile(userId: number): Promise<Omit<User, 'passwordHash'>> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User');
    }

    if (!user.isActive) {
      throw new NotFoundError('User');
    }

    return this.sanitizeUser(user);
  }

  /**
   * Update user profile.
   * @param userId User ID
   * @param data Update data
   * @returns Updated user profile
   */
  public async updateProfile(
    userId: number,
    data: {
      username?: string;
      preferredLanguage?: string;
      avatarUrl?: string | null;
    }
  ): Promise<Omit<User, 'passwordHash'>> {
    // Validate input
    if (data.username !== undefined) {
      if (data.username.length < 3 || data.username.length > 50) {
        throw new ValidationError('Username must be between 3 and 50 characters');
      }

      if (!/^[a-zA-Z0-9_-]+$/.test(data.username)) {
        throw new ValidationError(
          'Username can only contain letters, numbers, underscores, and hyphens'
        );
      }

      // Check if username is already taken
      const existingUser = await this.userRepository.findByUsername(data.username);
      if (existingUser && existingUser.id !== userId) {
        throw new ValidationError('Username already in use');
      }
    }

    if (data.preferredLanguage !== undefined) {
      if (!['en', 'fr', 'es', 'de', 'it', 'pt', 'ja', 'zh'].includes(data.preferredLanguage)) {
        throw new ValidationError('Invalid language code');
      }
    }

    if (data.avatarUrl !== undefined) {
      if (data.avatarUrl && data.avatarUrl.length > 500) {
        throw new ValidationError('Avatar URL too long (max 500 characters)');
      }
    }

    // Update user
    const user = await this.userRepository.updateById(userId, data);

    logger.info('User profile updated', {
      userId,
      changedFields: Object.keys(data),
    });

    return this.sanitizeUser(user);
  }

  /**
   * Check if user is active.
   * @param userId User ID
   * @returns True if user is active
   */
  public async isUserActive(userId: number): Promise<boolean> {
    const user = await this.userRepository.findById(userId);
    if (!user) return false;
    return user.isActive;
  }

  /**
   * Get user by email.
   * @param email User email
   * @returns User or null
   */
  public async getUserByEmail(email: string): Promise<Omit<User, 'passwordHash'> | null> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) return null;
    return this.sanitizeUser(user);
  }

  /**
   * Get user by username.
   * @param username User username
   * @returns User or null
   */
  public async getUserByUsername(username: string): Promise<Omit<User, 'passwordHash'> | null> {
    const user = await this.userRepository.findByUsername(username);
    if (!user) return null;
    return this.sanitizeUser(user);
  }

  /**
   * Remove sensitive data from user object.
   * Private helper method.
   */
  private sanitizeUser(user: User): Omit<User, 'passwordHash'> {
    const { passwordHash, ...sanitized } = user;
    return sanitized;
  }
}
