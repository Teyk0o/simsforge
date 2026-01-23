/**
 * Service for managing mod reports, warnings, and creator bans
 * Handles the complete lifecycle of fake mod detection and moderation
 */

import { PrismaClient } from '@prisma/client';
import type {
  ReportSubmission,
  ModWarningStatus,
  BatchWarningResponse,
  ReportResult,
  CreatorBanStatus,
} from '../../types/fakeDetection.types';
import { logger } from '../../utils/logger';

const prisma = new PrismaClient();

/**
 * Configuration constants for the reporting system
 */
const CONFIG = {
  /** Number of reports needed to trigger automatic warning */
  REPORTS_FOR_WARNING: 3,
  /** Number of warned mods needed to ban a creator */
  WARNINGS_FOR_BAN: 3,
};

/**
 * Service for managing mod reports, warnings, and creator bans
 */
export class ReportService {
  /**
   * Submit a report for a suspicious mod
   *
   * @param modId - CurseForge mod ID
   * @param report - Report submission data
   * @returns Result indicating success or if already reported
   */
  async submitReport(modId: number, report: ReportSubmission): Promise<ReportResult> {
    try {
      // Check if already reported by this machine
      const existing = await prisma.modReport.findUnique({
        where: {
          modId_machineId: {
            modId,
            machineId: report.machineId,
          },
        },
      });

      if (existing) {
        return { success: false, alreadyReported: true };
      }

      // Create report
      await prisma.modReport.create({
        data: {
          modId,
          machineId: report.machineId,
          reason: report.reason,
          fakeScore: report.fakeScore,
        },
      });

      logger.info(`New report submitted for mod ${modId}`, {
        machineId: report.machineId.substring(0, 8) + '...', // Partial ID for privacy
        fakeScore: report.fakeScore,
      });

      // Count reports for this mod
      const reportCount = await prisma.modReport.count({
        where: { modId },
      });

      // Auto-warn if high fake score detected (suspicious content like missing .package/.ts4script)
      if (report.fakeScore >= 50) {
        await this.addAutoWarning(
          modId,
          `Suspicious content detected: ${report.reason}`,
          report.creatorId,
          report.creatorName
        );
      }
      // Also auto-warn if multiple reports threshold reached
      else if (reportCount >= CONFIG.REPORTS_FOR_WARNING) {
        await this.addOrUpdateWarning(
          modId,
          reportCount,
          false,
          `Reported by ${reportCount} users`,
          report.creatorId,
          report.creatorName
        );
      }

      return { success: true, message: 'Report submitted successfully' };
    } catch (error) {
      logger.error('Failed to submit report', { modId, error });
      throw error;
    }
  }

  /**
   * Add automatic warning for a mod (when no valid mod files detected)
   *
   * @param modId - CurseForge mod ID
   * @param reason - Reason for automatic warning
   * @param creatorId - Optional creator ID for ban tracking
   * @param creatorName - Optional creator name
   */
  async addAutoWarning(
    modId: number,
    reason: string,
    creatorId?: number,
    creatorName?: string
  ): Promise<void> {
    await this.addOrUpdateWarning(modId, 0, true, reason, creatorId, creatorName);
  }

  /**
   * Add or update warning for a mod
   */
  private async addOrUpdateWarning(
    modId: number,
    reportCount: number,
    isAutoWarned: boolean,
    reason: string,
    creatorId?: number,
    creatorName?: string
  ): Promise<void> {
    try {
      await prisma.warnedMod.upsert({
        where: { modId },
        create: {
          modId,
          reportCount,
          isAutoWarned,
          warningReason: reason,
          creatorId: creatorId ?? null,
        },
        update: {
          reportCount,
          isAutoWarned: isAutoWarned || undefined,
          warningReason: reason,
          creatorId: creatorId ?? undefined,
        },
      });

      logger.info(`Warning added/updated for mod ${modId}`, {
        isAutoWarned,
        reportCount,
        reason,
      });

      // Check if creator should be banned
      if (creatorId) {
        await this.checkCreatorBan(creatorId, creatorName);
      }
    } catch (error) {
      logger.error('Failed to add/update warning', { modId, error });
      throw error;
    }
  }

  /**
   * Check and apply creator ban if necessary
   */
  private async checkCreatorBan(
    creatorId: number,
    creatorName?: string
  ): Promise<void> {
    try {
      const warnedModsCount = await prisma.warnedMod.count({
        where: { creatorId },
      });

      if (warnedModsCount >= CONFIG.WARNINGS_FOR_BAN) {
        // Check if already banned
        const existingBan = await prisma.bannedCreator.findUnique({
          where: { creatorId },
        });

        if (!existingBan) {
          await prisma.bannedCreator.create({
            data: {
              creatorId,
              creatorName: creatorName || 'Unknown',
              modsBannedCount: warnedModsCount,
            },
          });

          logger.warn(`Creator ${creatorId} (${creatorName}) has been banned`, {
            warnedModsCount,
          });
        } else {
          // Update count
          await prisma.bannedCreator.update({
            where: { creatorId },
            data: { modsBannedCount: warnedModsCount },
          });
        }
      }
    } catch (error) {
      logger.error('Failed to check/apply creator ban', { creatorId, error });
      throw error;
    }
  }

  /**
   * Get warning status for a single mod
   *
   * @param modId - CurseForge mod ID
   * @param creatorId - Optional creator ID to check for creator bans
   * @returns Warning status including report count and creator ban status
   */
  async getWarningStatus(modId: number, creatorId?: number): Promise<ModWarningStatus> {
    try {
      const warning = await prisma.warnedMod.findUnique({
        where: { modId },
      });

      let creatorBanned = false;

      // Check if creator is banned using creatorId from mod or from parameter
      const checkedCreatorId = warning?.creatorId || creatorId;
      if (checkedCreatorId) {
        const banned = await prisma.bannedCreator.findUnique({
          where: { creatorId: checkedCreatorId },
        });
        creatorBanned = !!banned;
      }

      return {
        hasWarning: !!warning,
        reportCount: warning?.reportCount || 0,
        isAutoWarned: warning?.isAutoWarned || false,
        warningReason: warning?.warningReason || undefined,
        creatorBanned,
      };
    } catch (error) {
      logger.error('Failed to get warning status', { modId, error });
      throw error;
    }
  }

  /**
   * Get warning status for multiple mods (batch operation)
   *
   * @param modIds - Array of CurseForge mod IDs
   * @param creatorIds - Optional array of creator IDs to check for bans
   * @returns Map of mod ID to warning status
   */
  async getBatchWarningStatus(
    modIds: number[],
    creatorIds?: number[]
  ): Promise<BatchWarningResponse> {
    try {
      const warnings = await prisma.warnedMod.findMany({
        where: { modId: { in: modIds } },
      });

      // Collect all creator IDs to check for bans
      const allCreatorIds = new Set<number>();

      // Add creator IDs from warnings
      warnings.forEach((w) => {
        if (w.creatorId !== null) {
          allCreatorIds.add(w.creatorId);
        }
      });

      // Add creator IDs from request (for mods without warnings)
      if (creatorIds) {
        creatorIds.forEach((id) => {
          if (id) allCreatorIds.add(id);
        });
      }

      // Batch fetch banned creators
      const bannedCreators = await prisma.bannedCreator.findMany({
        where: { creatorId: { in: Array.from(allCreatorIds) } },
      });

      const bannedCreatorSet = new Set(bannedCreators.map((b) => b.creatorId));

      // Build response map
      const result: BatchWarningResponse = {};

      // Create a map of modId to creatorId from request
      const modToCreator: Record<number, number> = {};
      if (creatorIds && creatorIds.length > 0) {
        modIds.forEach((modId, index) => {
          if (creatorIds[index]) {
            modToCreator[modId] = creatorIds[index];
          }
        });
      }

      for (const modId of modIds) {
        const warning = warnings.find((w) => w.modId === modId);
        const creatorId = warning?.creatorId || modToCreator[modId];

        result[modId] = {
          hasWarning: !!warning,
          reportCount: warning?.reportCount || 0,
          isAutoWarned: warning?.isAutoWarned || false,
          warningReason: warning?.warningReason || undefined,
          creatorBanned: creatorId ? bannedCreatorSet.has(creatorId) : false,
        };
      }

      return result;
    } catch (error) {
      logger.error('Failed to get batch warning status', { modIds, error });
      throw error;
    }
  }

  /**
   * Check if a creator is banned
   *
   * @param creatorId - CurseForge creator ID
   * @returns Ban status with reason if banned
   */
  async isCreatorBanned(creatorId: number): Promise<CreatorBanStatus> {
    try {
      const banned = await prisma.bannedCreator.findUnique({
        where: { creatorId },
      });

      return {
        banned: !!banned,
        reason: banned
          ? `Creator has ${banned.modsBannedCount} mods with warnings`
          : undefined,
        modsBannedCount: banned?.modsBannedCount,
      };
    } catch (error) {
      logger.error('Failed to check creator ban status', { creatorId, error });
      throw error;
    }
  }

  /**
   * Get the ratio of fake/warned mods for a creator
   * Used in score calculation
   *
   * @param creatorId - CurseForge creator ID
   * @param totalMods - Total number of mods by this creator (from CurseForge)
   * @returns Ratio from 0 to 1
   */
  async getCreatorFakeRatio(
    creatorId: number,
    totalMods: number = 10
  ): Promise<number> {
    try {
      const warnedCount = await prisma.warnedMod.count({
        where: { creatorId },
      });

      if (warnedCount === 0 || totalMods === 0) {
        return 0;
      }

      return Math.min(warnedCount / totalMods, 1);
    } catch (error) {
      logger.error('Failed to get creator fake ratio', { creatorId, error });
      return 0;
    }
  }

  /**
   * Get report count for a specific mod
   */
  async getReportCount(modId: number): Promise<number> {
    return prisma.modReport.count({
      where: { modId },
    });
  }

  /**
   * Check if a machine has already reported a mod
   */
  async hasAlreadyReported(modId: number, machineId: string): Promise<boolean> {
    const existing = await prisma.modReport.findUnique({
      where: {
        modId_machineId: { modId, machineId },
      },
    });
    return !!existing;
  }
}

// Export singleton instance
export const reportService = new ReportService();
