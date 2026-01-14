import { Request, Response } from 'express';
import { userApiKeyRepository } from '@repositories/UserApiKeyRepository';
import { z } from 'zod';

/**
 * Schema for adding/updating an API key
 */
const addApiKeySchema = z.object({
  serviceName: z.enum(['curseforge', 'patreon'], {
    message: 'Service must be one of: curseforge, patreon'
  }),
  apiKey: z.string()
    .min(10, 'API key is too short')
    .max(500, 'API key is too long')
    .trim()
});

/**
 * Controller for user settings endpoints
 * Handles API key management for third-party services
 */
export class SettingsController {
  /**
   * Adds or updates an API key for a service
   * POST /api/v1/settings/api-keys
   * @requires authentication
   */
  async addApiKey(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;

      // Validate request body
      let validated;
      try {
        validated = addApiKeySchema.parse(req.body);
      } catch (error) {
        if (error instanceof z.ZodError) {
          res.status(400).json({
            success: false,
            error: { message: error.issues[0].message }
          });
        }
        return;
      }

      // Save encrypted API key
      await userApiKeyRepository.create(
        userId,
        validated.serviceName,
        validated.apiKey
      );

      res.status(200).json({
        success: true,
        message: `${validated.serviceName} API key saved successfully`
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Gets list of configured services for current user
   * GET /api/v1/settings/api-keys
   * @requires authentication
   */
  async getConfiguredServices(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const services = await userApiKeyRepository.findServicesByUser(userId);

      res.status(200).json({
        success: true,
        data: { services }
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Deletes an API key for a service
   * DELETE /api/v1/settings/api-keys/:serviceName
   * @requires authentication
   */
  async deleteApiKey(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { serviceName } = req.params;

      // Validate service name
      if (!['curseforge', 'patreon'].includes(serviceName as string)) {
        res.status(400).json({
          success: false,
          error: { message: 'Invalid service name' }
        });
        return;
      }

      const deleted = await userApiKeyRepository.delete(userId, serviceName as string);

      if (!deleted) {
        res.status(404).json({
          success: false,
          error: { message: 'API key not found' }
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: `${serviceName} API key deleted successfully`
      });
    } catch (error) {
      throw error;
    }
  }
}

export const settingsController = new SettingsController();
