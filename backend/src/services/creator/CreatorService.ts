import { CreatorRepository, CreatorProfile } from '@repositories/CreatorRepository';
import { UserRepository } from '@repositories/UserRepository';
import { logger } from '@utils/logger';
import { ValidationError, NotFoundError, ConflictError } from '@utils/errors';

/**
 * Creator service handling creator profile operations.
 */
export class CreatorService {
  private creatorRepository: CreatorRepository;
  private userRepository: UserRepository;

  constructor(
    creatorRepository: CreatorRepository,
    userRepository: UserRepository
  ) {
    this.creatorRepository = creatorRepository;
    this.userRepository = userRepository;
  }

  /**
   * Transform user into creator.
   * @param userId User ID
   * @param displayName Creator display name
   * @param bio Optional creator bio
   * @returns Created creator profile
   */
  public async registerAsCreator(
    userId: number,
    displayName: string,
    bio?: string
  ): Promise<CreatorProfile> {
    // Validate display name
    if (!displayName || displayName.length < 2 || displayName.length > 100) {
      throw new ValidationError('Display name must be between 2 and 100 characters');
    }

    if (bio && bio.length > 500) {
      throw new ValidationError('Bio must be less than 500 characters');
    }

    // Verify user exists
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User');
    }

    // Check if already a creator
    const existingProfile = await this.creatorRepository.findByUserId(userId);
    if (existingProfile) {
      throw new ConflictError('User is already a creator');
    }

    // Create creator profile
    const profile = await this.creatorRepository.create({
      userId,
      displayName,
      bio,
    });

    logger.info('User registered as creator', {
      userId,
      displayName,
    });

    return profile;
  }

  /**
   * Get creator profile by user ID.
   * @param userId User ID
   * @returns Creator profile
   */
  public async getProfileByUserId(userId: number): Promise<CreatorProfile> {
    const profile = await this.creatorRepository.findByUserId(userId);
    if (!profile) {
      throw new NotFoundError('Creator profile');
    }
    return profile;
  }

  /**
   * Get creator profile by ID.
   * @param creatorId Creator profile ID
   * @returns Creator profile
   */
  public async getProfileById(creatorId: number): Promise<CreatorProfile> {
    const profile = await this.creatorRepository.findById(creatorId);
    if (!profile) {
      throw new NotFoundError('Creator profile');
    }
    return profile;
  }

  /**
   * Update creator profile.
   * @param userId User ID
   * @param data Update data
   * @returns Updated creator profile
   */
  public async updateProfile(
    userId: number,
    data: {
      displayName?: string;
      bio?: string | null;
      patreonUrl?: string | null;
      twitterUrl?: string | null;
      discordUrl?: string | null;
      websiteUrl?: string | null;
    }
  ): Promise<CreatorProfile> {
    // Verify creator profile exists
    const profile = await this.creatorRepository.findByUserId(userId);
    if (!profile) {
      throw new NotFoundError('Creator profile');
    }

    // Validate input
    if (data.displayName !== undefined) {
      if (data.displayName.length < 2 || data.displayName.length > 100) {
        throw new ValidationError('Display name must be between 2 and 100 characters');
      }
    }

    if (data.bio !== undefined) {
      if (data.bio && data.bio.length > 500) {
        throw new ValidationError('Bio must be less than 500 characters');
      }
    }

    // Validate URLs
    const urlFields = ['patreonUrl', 'twitterUrl', 'discordUrl', 'websiteUrl'];
    for (const field of urlFields) {
      const value = data[field as keyof typeof data];
      if (value && typeof value === 'string') {
        if (value.length > 500) {
          throw new ValidationError(`${field} must be less than 500 characters`);
        }
        // Basic URL validation
        try {
          new URL(value);
        } catch {
          throw new ValidationError(`Invalid URL for ${field}`);
        }
      }
    }

    // Update profile
    const updated = await this.creatorRepository.updateByUserId(userId, data);

    logger.info('Creator profile updated', {
      userId,
      changedFields: Object.keys(data),
    });

    return updated;
  }

  /**
   * Check if user is a creator.
   * @param userId User ID
   * @returns True if user is a creator
   */
  public async isCreator(userId: number): Promise<boolean> {
    return await this.creatorRepository.hasCreatorProfile(userId);
  }

  /**
   * Get public creator profile (without sensitive stats).
   * @param userId User ID
   * @returns Public creator profile
   */
  public async getPublicProfile(userId: number): Promise<Omit<CreatorProfile, 'totalRevenue'>> {
    const profile = await this.getProfileByUserId(userId);
    const { totalRevenue, ...publicProfile } = profile;
    return publicProfile;
  }
}
