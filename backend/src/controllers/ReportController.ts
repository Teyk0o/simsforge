/**
 * Controller for fake mod detection and reporting endpoints
 * Handles HTTP requests for report submission and warning status
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import { reportService } from '../services/fakeDetection/ReportService';

/**
 * Schema for report submission body
 */
const reportSchema = z.object({
  machineId: z.string().uuid('Invalid machine ID format'),
  reason: z.string().min(1, 'Reason is required').max(500, 'Reason too long'),
  fakeScore: z.number().int().min(0).max(100),
  creatorId: z.number().int().positive().optional(),
  creatorName: z.string().optional(),
});

/**
 * Schema for batch warning request body
 */
const batchWarningSchema = z.object({
  modIds: z
    .array(z.number().int().positive())
    .min(1, 'At least one mod ID is required')
    .max(100, 'Maximum 100 mods per request'),
  creatorIds: z
    .array(z.number().int().positive())
    .optional(),
});

/**
 * Controller for fake mod detection and reporting endpoints
 */
export class ReportController {
  /**
   * Submit a report for a fake mod
   * POST /api/v1/reports/:modId
   *
   * @param req.params.modId - CurseForge mod ID
   * @param req.body.machineId - UUID of reporting machine
   * @param req.body.reason - User-provided reason for report
   * @param req.body.fakeScore - Calculated fake score (0-100)
   * @param req.body.creatorId - Optional creator ID
   * @param req.body.creatorName - Optional creator name
   */
  async submitReport(req: Request, res: Response): Promise<void> {
    try {
      // Parse and validate mod ID
      const modIdParam = Array.isArray(req.params.modId) ? req.params.modId[0] : req.params.modId;
      const modId = parseInt(modIdParam);
      if (isNaN(modId) || modId < 1) {
        res.status(400).json({
          success: false,
          error: { message: 'Invalid mod ID' },
        });
        return;
      }

      // Validate request body
      let validated;
      try {
        validated = reportSchema.parse(req.body);
      } catch (error) {
        if (error instanceof z.ZodError) {
          res.status(400).json({
            success: false,
            error: { message: error.issues[0].message },
          });
        }
        return;
      }

      // Submit report
      const result = await reportService.submitReport(modId, validated);

      // Handle duplicate report
      if (result.alreadyReported) {
        res.status(409).json({
          success: false,
          error: { message: 'You have already reported this mod' },
        });
        return;
      }

      res.status(201).json({
        success: true,
        data: { message: 'Report submitted successfully' },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: { message: error.message || 'Failed to submit report' },
      });
    }
  }

  /**
   * Get warning status for a mod
   * GET /api/v1/mods/:modId/warning?creatorId=123
   *
   * @param req.params.modId - CurseForge mod ID
   * @param req.query.creatorId - Optional creator ID to check for creator bans
   * @returns Warning status including report count and creator ban status
   */
  async getWarningStatus(req: Request, res: Response): Promise<void> {
    try {
      // Parse and validate mod ID
      const modIdParam = Array.isArray(req.params.modId) ? req.params.modId[0] : req.params.modId;
      const modId = parseInt(modIdParam);
      if (isNaN(modId) || modId < 1) {
        res.status(400).json({
          success: false,
          error: { message: 'Invalid mod ID' },
        });
        return;
      }

      // Parse optional creator ID from query
      let creatorId: number | undefined;
      if (req.query.creatorId) {
        const creatorIdParam = Array.isArray(req.query.creatorId) ? req.query.creatorId[0] : req.query.creatorId;
        creatorId = parseInt(creatorIdParam as string);
        if (isNaN(creatorId) || creatorId < 1) {
          creatorId = undefined;
        }
      }

      // Get warning status
      const status = await reportService.getWarningStatus(modId, creatorId);

      res.status(200).json({
        success: true,
        data: status,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: { message: error.message || 'Failed to get warning status' },
      });
    }
  }

  /**
   * Get warning status for multiple mods (batch)
   * POST /api/v1/mods/batch-warnings
   *
   * @param req.body.modIds - Array of CurseForge mod IDs (max 100)
   * @returns Map of mod ID to warning status
   */
  async getBatchWarnings(req: Request, res: Response): Promise<void> {
    try {
      // Validate request body
      let validated;
      try {
        validated = batchWarningSchema.parse(req.body);
      } catch (error) {
        if (error instanceof z.ZodError) {
          res.status(400).json({
            success: false,
            error: { message: error.issues[0].message },
          });
        }
        return;
      }

      // Get batch warnings
      const result = await reportService.getBatchWarningStatus(
        validated.modIds,
        validated.creatorIds
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: { message: error.message || 'Failed to get batch warnings' },
      });
    }
  }

  /**
   * Check if a creator is banned
   * GET /api/v1/creators/:id/ban-status
   *
   * @param req.params.id - CurseForge creator ID
   * @returns Ban status with reason if banned
   */
  async getCreatorBanStatus(req: Request, res: Response): Promise<void> {
    try {
      // Parse and validate creator ID
      const creatorIdParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const creatorId = parseInt(creatorIdParam);
      if (isNaN(creatorId) || creatorId < 1) {
        res.status(400).json({
          success: false,
          error: { message: 'Invalid creator ID' },
        });
        return;
      }

      // Get ban status
      const status = await reportService.isCreatorBanned(creatorId);

      res.status(200).json({
        success: true,
        data: status,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: { message: error.message || 'Failed to get ban status' },
      });
    }
  }
}

// Export singleton instance
export const reportController = new ReportController();
