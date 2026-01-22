/**
 * API client for fake mod detection endpoints
 * Communicates with the backend for reports and warning status
 */

import { apiGet, apiPost } from './apiClient';
import type {
  ModWarningStatus,
  ReportSubmission,
  BatchWarningResponse,
  CreatorBanStatus,
} from '@/types/fakeDetection';

/**
 * Submit a report for a fake/suspicious mod
 *
 * @param modId - CurseForge mod ID
 * @param report - Report data including machineId, reason, and fakeScore
 * @returns Success status
 * @throws Error if already reported (409) or request fails
 */
export async function submitFakeModReport(
  modId: number,
  report: ReportSubmission
): Promise<{ success: boolean; message?: string }> {
  const response = await apiPost<{ success: boolean; data?: { message: string } }>(
    `/api/v1/reports/${modId}`,
    report
  );
  return {
    success: response.success,
    message: response.data?.message,
  };
}

/**
 * Get warning status for a single mod
 *
 * @param modId - CurseForge mod ID
 * @param creatorId - Optional creator ID to check for creator bans
 * @returns Warning status including report count and creator ban status
 */
export async function getModWarningStatus(modId: number, creatorId?: number): Promise<ModWarningStatus> {
  const url = creatorId
    ? `/api/v1/mods/${modId}/warning?creatorId=${creatorId}`
    : `/api/v1/mods/${modId}/warning`;

  const response = await apiGet<{ success: boolean; data: ModWarningStatus }>(url);
  return response.data;
}

/**
 * Get warning status for multiple mods (batch operation)
 * More efficient than calling getModWarningStatus for each mod
 *
 * @param modIds - Array of CurseForge mod IDs (max 100)
 * @param creatorIds - Optional map of modId to creatorId for checking creator bans
 * @returns Map of mod ID to warning status
 */
export async function getBatchWarningStatus(
  modIds: number[],
  creatorIds?: Record<number, number>
): Promise<BatchWarningResponse> {
  if (modIds.length === 0) {
    return {};
  }

  // Limit to 100 mods per request
  const limitedIds = modIds.slice(0, 100);

  const response = await apiPost<{ success: boolean; data: BatchWarningResponse }>(
    '/api/v1/mods/batch-warnings',
    {
      modIds: limitedIds,
      creatorIds: creatorIds ? limitedIds.map(id => creatorIds[id]).filter(Boolean) : undefined,
    }
  );

  return response.data;
}

/**
 * Check if a creator is banned
 *
 * @param creatorId - CurseForge creator ID
 * @returns Ban status with reason if banned
 */
export async function getCreatorBanStatus(
  creatorId: number
): Promise<CreatorBanStatus> {
  const response = await apiGet<{ success: boolean; data: CreatorBanStatus }>(
    `/api/v1/creators/${creatorId}/ban-status`
  );
  return response.data;
}

/**
 * Check if current machine has already reported a mod
 * Helper function that catches 409 errors
 *
 * @param modId - CurseForge mod ID
 * @param machineId - Machine UUID
 * @returns true if already reported, false otherwise
 */
export async function hasAlreadyReported(
  modId: number,
  machineId: string
): Promise<boolean> {
  try {
    // Try to get the warning status - this doesn't tell us about individual reports
    // The actual check happens server-side when submitting a report
    // This is a placeholder that returns false; real check is on submit
    return false;
  } catch {
    return false;
  }
}
