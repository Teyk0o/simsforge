'use client';

import React, {
  createContext,
  useState,
  useCallback,
  useEffect,
  useContext,
  useRef,
} from 'react';
import { updateCheckService } from '@/lib/services/UpdateCheckService';
import { modInstallationService } from '@/lib/services/ModInstallationService';
import { userPreferencesService } from '@/lib/services/UserPreferencesService';
import { backupService } from '@/lib/services/BackupService';
import { diskPerformanceService } from '@/lib/services/DiskPerformanceService';
import {
  concurrentMap,
  getSuccessful,
  getFailed,
} from '@/lib/utils/concurrencyPool';
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

  // Track auto-update state to prevent repeated executions
  const autoUpdateDoneRef = useRef<string | null>(null);
  const autoUpdateInProgressRef = useRef(false);

  const { activeProfile, refreshProfiles, getModsPath } = useProfiles();
  const { showToast } = useToast();

  /**
   * Load persisted update state on mount
   */
  useEffect(() => {
    loadUpdateState();
  }, []);

  /**
   * Auto-update effect: check for updates and install them automatically
   * when the preference is enabled
   */
  useEffect(() => {
    // Only run auto-update when:
    // 1. Profile is loaded and has mods
    // 2. Not currently checking or updating
    // 3. modsPath is configured
    // 4. Auto-update hasn't already been done for this profile
    if (!activeProfile || activeProfile.mods.length === 0 || isChecking || isUpdating) {
      return;
    }

    // Skip if auto-update already done for this profile or in progress
    if (autoUpdateDoneRef.current === activeProfile.id || autoUpdateInProgressRef.current) {
      return;
    }

    const modsPath = getModsPath();
    if (!modsPath) {
      return;
    }

    const performAutoUpdate = async () => {
      // Double-check to prevent race conditions
      if (autoUpdateInProgressRef.current || autoUpdateDoneRef.current === activeProfile.id) {
        return;
      }

      try {
        await userPreferencesService.initialize();
        const autoUpdatesEnabled = userPreferencesService.getAutoUpdates();

        if (!autoUpdatesEnabled) {
          // Mark as done even if disabled to prevent re-checking
          autoUpdateDoneRef.current = activeProfile.id;
          return;
        }

        autoUpdateInProgressRef.current = true;

        // Check for updates
        console.log('[UpdateContext] Auto-update: checking for updates...');
        const checkResult = await checkForUpdates();

        if (checkResult.updatesFound > 0) {
          console.log(`[UpdateContext] Auto-update: found ${checkResult.updatesFound} updates, installing...`);

          showToast({
            type: 'info',
            title: 'Auto-updating mods',
            message: `Installing ${checkResult.updatesFound} update${checkResult.updatesFound > 1 ? 's' : ''}...`,
            duration: 3000,
          });

          // Install all updates
          await updateAllMods();
        }

        // Mark auto-update as done for this profile
        autoUpdateDoneRef.current = activeProfile.id;
      } catch (error) {
        console.error('[UpdateContext] Auto-update error:', error);
      } finally {
        autoUpdateInProgressRef.current = false;
      }
    };

    // Delay auto-update check to allow UI to settle
    const timeoutId = setTimeout(performAutoUpdate, 5000);

    return () => clearTimeout(timeoutId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProfile?.id]); // Only re-run when profile changes

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
        // Check if backup is enabled and create backup before update
        await userPreferencesService.initialize();
        const shouldBackup = userPreferencesService.getBackupBeforeUpdate();

        if (shouldBackup && activeProfile) {
          const modToBackup = activeProfile.mods.find((m) => m.modId === modId);
          if (modToBackup) {
            console.log(`[UpdateContext] Creating backup for ${modToBackup.modName}...`);
            const backupResult = await backupService.createBackup(modToBackup);
            if (backupResult.success) {
              console.log(`[UpdateContext] Backup created: ${backupResult.backupPath}`);
            } else {
              console.warn(`[UpdateContext] Backup failed: ${backupResult.error}`);
              // Continue with update even if backup fails
            }
          }
        }

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
    [availableUpdates, activeProfile, getModsPath, clearUpdate, refreshProfiles, showToast]
  );

  /**
   * Update all mods with available updates (parallel processing)
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

    // Check if backup is enabled
    await userPreferencesService.initialize();
    const shouldBackup = userPreferencesService.getBackupBeforeUpdate();

    // Get optimal pool size for parallel operations
    const poolSize = await diskPerformanceService.getPoolSize();

    // Step 1: Create backups in parallel if enabled
    if (shouldBackup && activeProfile) {
      const modsToBackup = updates
        .map((updateInfo) => activeProfile.mods.find((m) => m.modId === updateInfo.modId))
        .filter((mod): mod is NonNullable<typeof mod> => mod !== undefined);

      if (modsToBackup.length > 0) {
        console.log(`[UpdateContext] Creating ${modsToBackup.length} backups in parallel...`);
        await concurrentMap(
          modsToBackup,
          async (mod) => {
            const result = await backupService.createBackup(mod);
            if (result.success) {
              console.log(`[UpdateContext] Backup created: ${result.backupPath}`);
            } else {
              console.warn(`[UpdateContext] Backup failed for ${mod.modName}: ${result.error}`);
            }
            return result;
          },
          poolSize
        );
      }
    }

    // Step 2: Update mods in parallel
    const updateResults = await concurrentMap(
      updates,
      async (updateInfo) => {
        const result = await modInstallationService.installMod(
          updateInfo.modId,
          modsPath,
          undefined,
          updateInfo.latestVersionId
        );

        if (result.success) {
          // Clear the update from state
          setAvailableUpdates((prev) => {
            const newMap = new Map(prev);
            newMap.delete(updateInfo.modId);
            return newMap;
          });
        }

        return { updateInfo, result };
      },
      poolSize
    );

    // Step 3: Process results
    const results: ModUpdateResult[] = [];
    let successful = 0;
    let failed = 0;

    const successfulResults = getSuccessful(updateResults);
    const failedResults = getFailed(updateResults);

    // Process successful results
    for (const { updateInfo, result } of successfulResults) {
      if (result.success) {
        successful++;
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
    }

    // Process failed results (exceptions thrown during update)
    for (const { index, error } of failedResults) {
      const updateInfo = updates[index];
      failed++;
      results.push({
        modId: updateInfo.modId,
        modName: updateInfo.modName,
        success: false,
        error: String(error),
      });
    }

    // Step 4: Single refresh at the end
    await refreshProfiles();

    // Persist cleared updates
    await updateCheckService.initialize();
    for (const res of results) {
      if (res.success) {
        await updateCheckService.clearUpdateForMod(res.modId);
      }
    }

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
  }, [availableUpdates, activeProfile, getModsPath, refreshProfiles, showToast]);

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
