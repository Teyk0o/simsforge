import { Request, Response } from 'express';
import { CreatorService } from '@services/creator/CreatorService';
import { CreatorRepository } from '@repositories/CreatorRepository';
import { UserRepository } from '@repositories/UserRepository';
import { registerCreatorSchema, updateCreatorProfileSchema } from '@validators/creator.validator';
import { asyncHandler } from '@middleware/errorMiddleware';
import { NotFoundError } from '@utils/errors';
import { logger } from '@utils/logger';

/**
 * Creator controller handling creator-related HTTP requests.
 */
export class CreatorController {
  private creatorService: CreatorService;
  private userRepository: UserRepository;

  constructor() {
    const creatorRepository = new CreatorRepository();
    const userRepository = new UserRepository();
    this.creatorService = new CreatorService(creatorRepository, userRepository);
    this.userRepository = userRepository;
  }

  /**
   * POST /api/v1/creators/register
   * Transform authenticated user into creator.
   */
  public register = asyncHandler(async (req: Request, res: Response): Promise<void> => {
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
    const data = registerCreatorSchema.parse(req.body);

    // Register as creator
    const profile = await this.creatorService.registerAsCreator(
      req.user.id,
      data.displayName,
      data.bio
    );

    logger.info('User registered as creator', {
      userId: req.user.id,
      creatorId: profile.id,
    });

    res.status(201).json({
      data: profile,
      success: true,
    });
  });

  /**
   * GET /api/v1/creators/me
   * Get authenticated user's creator profile.
   */
  public getOwnProfile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({
        error: {
          message: 'Unauthorized',
          statusCode: 401,
        },
      });
      return;
    }

    const profile = await this.creatorService.getProfileByUserId(req.user.id);

    res.status(200).json({
      data: profile,
      success: true,
    });
  });

  /**
   * GET /api/v1/creators/:username
   * Get public creator profile by username.
   */
  public getPublicProfile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { username } = req.params;

    // Find user by username
    const user = await this.userRepository.findByUsername(username as string);
    if (!user) {
      throw new NotFoundError('Creator');
    }

    // Get creator profile
    const profile = await this.creatorService.getPublicProfile(user.id);

    res.status(200).json({
      data: profile,
      success: true,
    });
  });

  /**
   * PATCH /api/v1/creators/me
   * Update authenticated user's creator profile.
   */
  public updateProfile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
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
    const data = updateCreatorProfileSchema.parse(req.body);

    // Update profile
    const updated = await this.creatorService.updateProfile(req.user.id, data);

    logger.info('Creator profile updated via API', {
      userId: req.user.id,
      changedFields: Object.keys(data),
    });

    res.status(200).json({
      data: updated,
      success: true,
    });
  });
}
