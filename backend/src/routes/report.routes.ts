/**
 * Routes for fake mod detection and reporting
 * Handles report submission, warning status, and creator bans
 */

import { Router } from 'express';
import { reportController } from '../controllers/ReportController';
import { asyncHandler } from '../middleware/errorMiddleware';

/**
 * Create report and warning routes
 *
 * Endpoints:
 * - POST /api/v1/reports/:modId - Submit a fake mod report
 * - GET /api/v1/mods/:modId/warning - Get warning status for a mod
 * - POST /api/v1/mods/batch-warnings - Get warning status for multiple mods
 * - GET /api/v1/creators/:id/ban-status - Check if a creator is banned
 */
export function createReportRoutes(): Router {
  const router = Router();

  /**
   * POST /api/v1/reports/:modId
   * Submit a report for a fake/suspicious mod
   *
   * Body: {
   *   machineId: string (UUID),
   *   reason: string,
   *   fakeScore: number (0-100),
   *   creatorId?: number,
   *   creatorName?: string
   * }
   *
   * Returns:
   * - 201: Report submitted successfully
   * - 400: Invalid request body
   * - 409: Already reported by this machine
   */
  router.post(
    '/reports/:modId',
    asyncHandler((req, res) => reportController.submitReport(req, res))
  );

  /**
   * GET /api/v1/mods/:modId/warning
   * Get warning status for a single mod
   *
   * Returns: {
   *   hasWarning: boolean,
   *   reportCount: number,
   *   isAutoWarned: boolean,
   *   warningReason?: string,
   *   creatorBanned: boolean
   * }
   */
  router.get(
    '/mods/:modId/warning',
    asyncHandler((req, res) => reportController.getWarningStatus(req, res))
  );

  /**
   * POST /api/v1/mods/batch-warnings
   * Get warning status for multiple mods at once
   *
   * Body: {
   *   modIds: number[] (max 100)
   * }
   *
   * Returns: {
   *   [modId: number]: ModWarningStatus
   * }
   */
  router.post(
    '/mods/batch-warnings',
    asyncHandler((req, res) => reportController.getBatchWarnings(req, res))
  );

  /**
   * GET /api/v1/creators/:id/ban-status
   * Check if a creator is banned
   *
   * Returns: {
   *   banned: boolean,
   *   reason?: string,
   *   modsBannedCount?: number
   * }
   */
  router.get(
    '/creators/:id/ban-status',
    asyncHandler((req, res) => reportController.getCreatorBanStatus(req, res))
  );

  return router;
}

export default createReportRoutes;
