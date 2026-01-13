import { Request, Response } from 'express';
import { curseForgeProxyService } from '@services/curseforge/CurseForgeProxyService';
import { userApiKeyRepository } from '@repositories/UserApiKeyRepository';
import { z } from 'zod';

/**
 * Schema for search mods query parameters
 */
const searchModsSchema = z.object({
  query: z.string().optional(),
  pageSize: z.string().transform(Number).pipe(z.number().min(1).max(50)).optional(),
  pageIndex: z.string().transform(Number).pipe(z.number().min(0)).optional(),
  sortBy: z.enum(['downloads', 'date', 'popularity', 'relevance']).optional(),
  categoryName: z.string().optional()
});

/**
 * Controller for CurseForge proxy endpoints
 * Handles requests for mods from the CurseForge API
 */
export class CurseForgeController {
  /**
   * Searches for mods on CurseForge
   * GET /api/v1/curseforge/search
   * @requires authentication
   * @query query - Search query (optional)
   * @query pageSize - Results per page (1-50, default 50)
   * @query pageIndex - Page index for pagination (default 0)
   * @query sortBy - Sort by: downloads, date, or popularity (default downloads)
   * @query categoryName - Filter by category name (optional, case-insensitive)
   */
  async searchMods(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;

      // Validate and parse query parameters
      let validated;
      try {
        validated = searchModsSchema.parse(req.query);
      } catch (error) {
        if (error instanceof z.ZodError) {
          res.status(400).json({
            success: false,
            error: { message: error.errors[0].message }
          });
        }
        return;
      }

      // Call proxy service
      const result = await curseForgeProxyService.searchMods({
        userId,
        query: validated.query,
        pageSize: validated.pageSize || 50,
        pageIndex: validated.pageIndex || 0,
        sortBy: validated.sortBy || 'downloads',
        categoryName: validated.categoryName
      });

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error: any) {
      // Handle API key not configured
      if (error.message.includes('API key not configured')) {
        res.status(403).json({
          success: false,
          error: {
            message: error.message,
            code: 'API_KEY_REQUIRED'
          }
        });
        return;
      }

      // Handle other errors
      res.status(500).json({
        success: false,
        error: {
          message: error.message || 'Failed to search mods'
        }
      });
    }
  }

  /**
   * Gets all available categories for Sims 4 mods
   * GET /api/v1/curseforge/categories
   * @requires authentication
   */
  async getCategories(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;

      // Call proxy service
      const categories = await curseForgeProxyService.getCategories(userId);

      res.status(200).json({
        success: true,
        data: categories
      });
    } catch (error: any) {
      // Handle API key not configured
      if (error.message.includes('API key not configured')) {
        res.status(403).json({
          success: false,
          error: {
            message: error.message,
            code: 'API_KEY_REQUIRED'
          }
        });
        return;
      }

      // Handle other errors
      res.status(500).json({
        success: false,
        error: {
          message: error.message || 'Failed to get categories'
        }
      });
    }
  }

  /**
   * Gets details of a specific mod
   * GET /api/v1/curseforge/:modId
   * @requires authentication
   * @param modId - CurseForge mod ID
   */
  async getMod(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const modId = parseInt(req.params.modId);

      // Validate mod ID
      if (isNaN(modId) || modId < 1) {
        res.status(400).json({
          success: false,
          error: { message: 'Invalid mod ID' }
        });
        return;
      }

      // Call proxy service
      const mod = await curseForgeProxyService.getMod(userId, modId);

      res.status(200).json({
        success: true,
        data: mod
      });
    } catch (error: any) {
      // Handle API key not configured
      if (error.message.includes('API key not configured')) {
        res.status(403).json({
          success: false,
          error: {
            message: error.message,
            code: 'API_KEY_REQUIRED'
          }
        });
        return;
      }

      // Handle mod not found
      if (error.message.includes('not found') || error.response?.status === 404) {
        res.status(404).json({
          success: false,
          error: { message: 'Mod not found' }
        });
        return;
      }

      // Handle other errors
      res.status(500).json({
        success: false,
        error: {
          message: error.message || 'Failed to get mod details'
        }
      });
    }
  }

  /**
   * Get download URL for a mod file from CurseForge
   * POST /api/v1/curseforge/download-url
   * @requires authentication
   * @body modId - CurseForge mod ID
   * @body fileId - Optional: specific file version to download
   * @returns Download URL and file info for frontend to download and install locally
   */
  async getDownloadUrl(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;

      // Validate request body
      const schema = z.object({
        modId: z.number().int().positive(),
        fileId: z.number().int().positive().optional(),
      });

      let validated;
      try {
        validated = schema.parse(req.body);
      } catch (error) {
        if (error instanceof z.ZodError) {
          res.status(400).json({
            success: false,
            error: { message: error.errors[0].message }
          });
        }
        return;
      }

      // Get API key
      const apiKey = await userApiKeyRepository.findByUserAndService(userId, 'curseforge');
      if (!apiKey) {
        res.status(403).json({
          success: false,
          error: {
            message: 'CurseForge API key not configured',
            code: 'API_KEY_REQUIRED'
          }
        });
        return;
      }

      // Get mod details
      const CurseForgeClient = require('curseforge-api').CurseForgeClient;
      const client = new CurseForgeClient(apiKey);
      const mod = await client.getMod(validated.modId);

      // Determine which file to download
      let fileToDownload;
      if (validated.fileId) {
        fileToDownload = await client.getModFile(validated.modId, validated.fileId);
      } else {
        if (!mod.latestFiles || mod.latestFiles.length === 0) {
          res.status(404).json({
            success: false,
            error: { message: 'No files available for this mod' }
          });
          return;
        }
        fileToDownload = mod.latestFiles[0];
      }

      // Get download URL from file object
      let downloadUrl = fileToDownload.downloadUrl;

      // If no URL in file object, construct it manually using the ForgedCDN pattern
      // Pattern: https://edge.forgecdn.net/files/{segment1}/{segment2}/{fileName}
      if (!downloadUrl && fileToDownload.id && fileToDownload.fileName) {
        const fileIdStr = fileToDownload.id.toString();
        const segment1 = fileIdStr.slice(0, -3); // All digits except last 3
        const segment2 = fileIdStr.slice(-3);     // Last 3 digits
        downloadUrl = `https://edge.forgecdn.net/files/${segment1}/${segment2}/${fileToDownload.fileName}`;
      }

      // If still no URL, return error
      if (!downloadUrl) {
        res.status(404).json({
          success: false,
          error: { message: 'Unable to retrieve download URL for this file' }
        });
        return;
      }

      // Return download info
      res.status(200).json({
        success: true,
        data: {
          modId: mod.id,
          modName: mod.name,
          fileId: fileToDownload.id,
          fileName: fileToDownload.fileName,
          downloadUrl: downloadUrl,
          fileSize: fileToDownload.fileLength || 0,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          message: error.message || 'Failed to get download URL',
        },
      });
    }
  }
}

export const curseForgeController = new CurseForgeController();
