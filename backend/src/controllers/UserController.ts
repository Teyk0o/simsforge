import { Request, Response } from 'express';
import { UserService } from '@services/user/UserService';
import { UserRepository } from '@repositories/UserRepository';
import { updateUserProfileSchema } from '@validators/user.validator';
import { asyncHandler } from '@middleware/errorMiddleware';
import { logger } from '@utils/logger';

/**
 * User controller handling user-related HTTP requests.
 */
export class UserController {
  private userService: UserService;

  constructor() {
    const userRepository = new UserRepository();
    this.userService = new UserService(userRepository);
  }

  /**
   * GET /api/v1/users/me
   * Get authenticated user profile.
   */
  public getProfile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({
        error: {
          message: 'Unauthorized',
          statusCode: 401,
        },
      });
      return;
    }

    const profile = await this.userService.getUserProfile(req.user.id);

    res.status(200).json({
      data: profile,
      success: true,
    });
  });

  /**
   * PATCH /api/v1/users/me
   * Update authenticated user profile.
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
    const data = updateUserProfileSchema.parse(req.body);

    // Update profile
    const updated = await this.userService.updateProfile(req.user.id, data);

    logger.info('User profile updated via API', {
      userId: req.user.id,
      changedFields: Object.keys(data),
    });

    res.status(200).json({
      data: updated,
      success: true,
    });
  });
}
