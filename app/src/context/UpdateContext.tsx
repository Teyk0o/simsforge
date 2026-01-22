'use client';

import React, {
  createContext,
  useState,
  useCallback,
  useEffect,
  useContext,
} from 'react';
import { updateCheckService } from '@/lib/services/UpdateCheckService';
import { modInstallationService } from '@/lib/services/ModInstallationService';
import { useProfiles } from '@/context/ProfileContext';
import { useToast } from '@/context/ToastContext';
import type {
  UpdateInfo,
  UpdateCheckResult,
  BatchUpdateResult,
  ModUpdateResult,
} from '@/types/updates';

/**
 * Update context type definition
 */
export interface UpdateContextType {
  availableUpdates: Map<number, UpdateInfo>;
  updateCount: number;
  isChecking: boolean;
  isUpdating: boolean;
  lastCheckTime: Date | null;
  checkForUpdates: () => Promise<UpdateCheckResult>;
  clearUpdate: (modId: number) => Promise<void>;
  updateMod: (modId: number) => Promise<boolean>;
  updateAllMods: () => Promise<BatchUpdateResult>;
  hasUpdate: (modId: number) => boolean;
  getUpdateInfo: (modId: number) => UpdateInfo | undefined;
}

const UpdateContext = createContext<UpdateContextType | undefined>(undefined);

/**
 * Update Provider Component
 *
 * Manages mod update state and provides update operations
 */
export function UpdateProvider({ children }: { children: React.ReactNode }) {
  const [availableUpdates, setAvailableUpdates] = useState<Map<number, UpdateInfo>>(
    new Map()
  );
  const [isChecking, setIsChecking] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState<Date | null>(null);

  const { activeProfile, refreshProfiles, getModsPath } = useProfiles();
  const { showToast } = useToast();

  /**
   * Load persisted update state on mount
   */
  useEffect(() => {
    loadUpdateState();
  }, []);

  const loadUpdateState = async () => {
    try {
      await updateCheckService.initialize();
      const state = await updateCheckService.getUpdateState();

      // Convert record to Map
      const updatesMap = new Map<number, UpdateInfo>();
      for (const [modId, info] of Object.entries(state.availableUpdates)) {
        updatesMap.set(parseInt(modId), info);
      }

      setAvailableUpdates(updatesMap);

      if (state.lastCheckTimestamp) {
        setLastCheckTime(new Date(state.lastCheckTimestamp));
      }
    } catch (error) {
      console.error('[UpdateContext] Failed to load update state:', error);
    }
  };

  /**
   * Check for updates for all mods in the active profile
   */
  const checkForUpdates = useCallback(async (): Promise<UpdateCheckResult> => {
    if (!activeProfile || activeProfile.mods.length === 0) {
      return {
        checkedCount: 0,
        updatesFound: 0,
        updates: [],
        errors: ['No active profile or no mods installed'],
      };
    }

    setIsChecking(true);

    try {
      await updateCheckService.initialize();
      const result = await updateCheckService.checkForUpdates(activeProfile.mods);

      // Update local state
      const updatesMap = new Map<number, UpdateInfo>();
      for (const update of result.updates) {
        updatesMap.set(update.modId, update);
      }

      // Merge with existing updates (keep updates for mods not in current profile)
      const state = await updateCheckService.getUpdateState();
      for (const [modId, info] of Object.entries(state.availableUpdates)) {
        if (!updatesMap.has(parseInt(modId))) {
          updatesMap.set(parseInt(modId), info);
        }
      }

      setAvailableUpdates(updatesMap);
      setLastCheckTime(new Date());

      if (result.updatesFound > 0) {
        showToast({
          type: 'info',
          title: 'Updates available',
          message: `${result.updatesFound} mod update${result.updatesFound > 1 ? 's' : ''} available`,
          duration: 5000,
        });
      }

      return result;
    } catch (error: any) {
      console.error('[UpdateContext] checkForUpdates error:', error);
      showToast({
        type: 'error',
        title: 'Update check failed',
        message: error.message || 'Failed to check for updates',
        duration: 5000,
      });

      return {
        checkedCount: 0,
        updatesFound: 0,
        updates: [],
        errors: [error.message || 'Failed to check for updates'],
      };
    } finally {
      setIsChecking(false);
    }
  }, [activeProfile, showToast]);

  /**
   * Clear update info for a specific mod
   */
  const clearUpdate = useCallback(async (modId: number): Promise<void> => {
    await updateCheckService.clearUpdateForMod(modId);

    setAvailableUpdates((prev) => {
      const newMap = new Map(prev);
      newMap.delete(modId);
      return newMap;
    });
  }, []);

  /**
   * Update a single mod
   */
  const updateMod = useCallback(
    async (modId: number): Promise<boolean> => {
      const updateInfo = availableUpdates.get(modId);
      if (!updateInfo) {
        showToast({
          type: 'error',
          title: 'Update failed',
          message: 'No update information found for this mod',
          duration: 5000,
        });
        return false;
      }

      const modsPath = getModsPath();
      if (!modsPath) {
        showToast({
          type: 'error',
          title: 'Update failed',
          message: 'Mods path not configured',
          duration: 5000,
        });
        return false;
      }

      setIsUpdating(true);

      try {
        // Use existing install service with specific file ID
        const result = await modInstallationService.installMod(
          modId,
          modsPath,
          (progress) => {
            // Progress callback - could be used for UI feedback
            console.log(`[UpdateMod] ${progress.stage}: ${progress.percent}%`);
          },
          updateInfo.latestVersionId
        );

        if (result.success) {
          // Clear the update from state
          await clearUpdate(modId);
          await refreshProfiles();

          showToast({
            type: 'success',
            title: 'Mod updated',
            message: `${updateInfo.modName} updated successfully`,
            duration: 3000,
          });

          return true;
        } else {
          showToast({
            type: 'error',
            title: 'Update failed',
            message: result.error || 'Failed to update mod',
            duration: 5000,
          });
          return false;
        }
      } catch (error: any) {
        console.error('[UpdateContext] updateMod error:', error);
        showToast({
          type: 'error',
          title: 'Update failed',
          message: error.message || 'Failed to update mod',
          duration: 5000,
        });
        return false;
      } finally {
        setIsUpdating(false);
      }
    },
    [availableUpdates, getModsPath, clearUpdate, refreshProfiles, showToast]
  );

  /**
   * Update all mods with available updates
   */
  const updateAllMods = useCallback(async (): Promise<BatchUpdateResult> => {
    const updates = Array.from(availableUpdates.values());

    if (updates.length === 0) {
      return { successful: 0, failed: 0, results: [] };
    }

    const modsPath = getModsPath();
    if (!modsPath) {
      showToast({
        type: 'error',
        title: 'Update failed',
        message: 'Mods path not configured',
        duration: 5000,
      });
      return { successful: 0, failed: updates.length, results: [] };
    }

    setIsUpdating(true);

    const results: ModUpdateResult[] = [];
    let successful = 0;
    let failed = 0;

    // Process updates sequentially to avoid overwhelming the system
    for (const updateInfo of updates) {
      try {
        const result = await modInstallationService.installMod(
          updateInfo.modId,
          modsPath,
          undefined,
          updateInfo.latestVersionId
        );

        if (result.success) {
          successful++;
          await clearUpdate(updateInfo.modId);
          results.push({
            modId: updateInfo.modId,
            modName: updateInfo.modName,
            success: true,
          });
        } else {
          failed++;
          results.push({
            modId: updateInfo.modId,
            modName: updateInfo.modName,
            success: false,
            error: result.error,
          });
        }
      } catch (error: any) {
        failed++;
        results.push({
          modId: updateInfo.modId,
          modName: updateInfo.modName,
          success: false,
          error: error.message,
        });
      }
    }

    await refreshProfiles();

    // Show summary toast
    if (successful > 0 && failed === 0) {
      showToast({
        type: 'success',
        title: 'All mods updated',
        message: `Successfully updated ${successful} mod${successful > 1 ? 's' : ''}`,
        duration: 5000,
      });
    } else if (successful > 0 && failed > 0) {
      showToast({
        type: 'warning',
        title: 'Partial update',
        message: `Updated ${successful}/${successful + failed} mods. ${failed} failed.`,
        duration: 5000,
      });
    } else {
      showToast({
        type: 'error',
        title: 'Update failed',
        message: `Failed to update ${failed} mod${failed > 1 ? 's' : ''}`,
        duration: 5000,
      });
    }

    setIsUpdating(false);

    return { successful, failed, results };
  }, [availableUpdates, getModsPath, clearUpdate, refreshProfiles, showToast]);

  /**
   * Check if a mod has an update available
   */
  const hasUpdate = useCallback(
    (modId: number): boolean => {
      return availableUpdates.has(modId);
    },
    [availableUpdates]
  );

  /**
   * Get update info for a specific mod
   */
  const getUpdateInfo = useCallback(
    (modId: number): UpdateInfo | undefined => {
      return availableUpdates.get(modId);
    },
    [availableUpdates]
  );

  const value: UpdateContextType = {
    availableUpdates,
    updateCount: availableUpdates.size,
    isChecking,
    isUpdating,
    lastCheckTime,
    checkForUpdates,
    clearUpdate,
    updateMod,
    updateAllMods,
    hasUpdate,
    getUpdateInfo,
  };

  return (
    <UpdateContext.Provider value={value}>{children}</UpdateContext.Provider>
  );
}

/**
 * Hook to use update context
 */
export function useUpdates() {
  const context = useContext(UpdateContext);
  if (!context) {
    throw new Error('useUpdates must be used within UpdateProvider');
  }
  return context;
}
