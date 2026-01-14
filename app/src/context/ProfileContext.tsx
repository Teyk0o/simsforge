'use client';

import React, {
  createContext,
  useState,
  useCallback,
  useEffect,
  useContext,
} from 'react';
import { ModProfile, ProfileMod } from '@/types/profile';
import { profileService } from '@/lib/services/ProfileService';
import { modCacheService } from '@/lib/services/ModCacheService';
import { symlinkService } from '@/lib/services/SymlinkService';
import { sims4PathDetector } from '@/lib/services/Sims4PathDetector';
import { useToast } from './ToastContext';

/**
 * Profile context type definition
 */
export interface ProfileContextType {
  profiles: ModProfile[];
  activeProfile: ModProfile | null;
  isLoading: boolean;
  error: string | null;
  refreshProfiles: () => Promise<void>;
  createProfile: (name: string, description: string, tags: string[]) => Promise<ModProfile>;
  updateProfile: (profileId: string, updates: Partial<ModProfile>) => Promise<void>;
  deleteProfile: (profileId: string) => Promise<void>;
  activateProfile: (profileId: string | null) => Promise<void>;
  addModToProfile: (profileId: string, mod: ProfileMod) => Promise<void>;
  removeModFromProfile: (profileId: string, modId: number) => Promise<void>;
  toggleModInProfile: (profileId: string, modId: number, enabled: boolean) => Promise<void>;
  getModsPath: () => string | null;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

/**
 * Profile Provider Component
 */
export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profiles, setProfiles] = useState<ModProfile[]>([]);
  const [activeProfile, setActiveProfile] = useState<ModProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modsPath, setModsPath] = useState<string | null>(null);
  const { showToast } = useToast();

  /**
   * Initialize services and load profiles on mount
   */
  useEffect(() => {
    initializeProfiles();
  }, []);

  const initializeProfiles = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Initialize services
      await profileService.initialize();
      await modCacheService.initialize();

      // Try to detect Sims 4 mods path
      const paths = await sims4PathDetector.detectPaths();
      const validation = await sims4PathDetector.validatePaths(paths);

      if (validation.modsValid && paths.modsPath) {
        setModsPath(paths.modsPath);
      } else {
        console.warn('Could not auto-detect Sims 4 mods path');
      }

      // Load profiles
      await refreshProfiles();
    } catch (error: any) {
      console.error('Failed to initialize profiles:', error);
      setError(error.message || 'Unknown initialization error');
      showToast({
        type: 'error',
        title: 'Profile initialization failed',
        message: error.message || 'Unknown error',
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Refresh profiles list and active profile
   */
  const refreshProfiles = useCallback(async () => {
    try {
      const allProfiles = await profileService.getAllProfiles();
      setProfiles(allProfiles);

      const active = await profileService.getActiveProfile();
      setActiveProfile(active);

      setError(null);
    } catch (error: any) {
      console.error('Failed to refresh profiles:', error);
      setError(error.message);
    }
  }, []);

  /**
   * Create a new profile
   */
  const createProfile = useCallback(
    async (name: string, description: string, tags: string[]) => {
      try {
        const newProfile = await profileService.createProfile(
          name,
          description,
          tags
        );
        await refreshProfiles();

        showToast({
          type: 'success',
          title: 'Profile created',
          message: `"${name}" has been created successfully`,
          duration: 3000,
        });

        return newProfile;
      } catch (error: any) {
        showToast({
          type: 'error',
          title: 'Failed to create profile',
          message: error.message || 'Unknown error',
          duration: 5000,
        });
        throw error;
      }
    },
    [refreshProfiles, showToast]
  );

  /**
   * Update an existing profile
   */
  const updateProfile = useCallback(
    async (profileId: string, updates: Partial<ModProfile>) => {
      try {
        await profileService.updateProfile(profileId, updates);
        await refreshProfiles();

        showToast({
          type: 'success',
          title: 'Profile updated',
          message: 'Changes saved successfully',
          duration: 3000,
        });
      } catch (error: any) {
        showToast({
          type: 'error',
          title: 'Failed to update profile',
          message: error.message || 'Unknown error',
          duration: 5000,
        });
        throw error;
      }
    },
    [refreshProfiles, showToast]
  );

  /**
   * Delete a profile
   */
  const deleteProfile = useCallback(
    async (profileId: string) => {
      try {
        await profileService.deleteProfile(profileId);
        await modCacheService.removeProfileFromCache(profileId);
        await refreshProfiles();

        showToast({
          type: 'success',
          title: 'Profile deleted',
          message: 'Profile removed successfully',
          duration: 3000,
        });
      } catch (error: any) {
        showToast({
          type: 'error',
          title: 'Failed to delete profile',
          message: error.message || 'Unknown error',
          duration: 5000,
        });
        throw error;
      }
    },
    [refreshProfiles, showToast]
  );

  /**
   * Activate a profile (switch mods)
   */
  const activateProfile = useCallback(
    async (profileId: string | null) => {
      try {
        if (!modsPath) {
          throw new Error(
            'Mods path not configured. Could not find The Sims 4 installation.'
          );
        }

        // Deactivate current profile (remove all symlinks)
        if (activeProfile) {
          await symlinkService.deactivateProfile(modsPath);
        }

        // Activate new profile (create symlinks)
        if (profileId) {
          const profile = await profileService.getProfile(profileId);
          if (!profile) {
            throw new Error('Profile not found');
          }

          // Only include enabled mods
          const enabledMods = profile.mods.filter((mod) => mod.enabled);

          // Build symlink list from cache
          const cachePaths = await Promise.all(
            enabledMods.map(async (mod) => ({
              source: await modCacheService.getCachePath(mod.fileHash),
              modName: mod.modName,
            }))
          );

          // Create symlinks
          const result = await symlinkService.activateProfile(
            modsPath,
            cachePaths
          );

          if (!result.success) {
            throw new Error(
              `Failed to create ${result.failed} symlinks. Check permissions and that The Sims 4 is not running.`
            );
          }
        }

        // Update active profile in metadata
        await profileService.setActiveProfile(profileId);
        await refreshProfiles();

        showToast({
          type: 'success',
          title: profileId ? 'Profile activated' : 'Profile deactivated',
          message: profileId
            ? `Profile activated successfully`
            : 'All mods deactivated',
          duration: 3000,
        });
      } catch (error: any) {
        showToast({
          type: 'error',
          title: 'Failed to activate profile',
          message: error.message || 'Unknown error',
          duration: 5000,
        });
        throw error;
      }
    },
    [activeProfile, modsPath, refreshProfiles, showToast]
  );

  /**
   * Add a mod to a profile
   */
  const addModToProfile = useCallback(
    async (profileId: string, mod: ProfileMod) => {
      try {
        await profileService.addModToProfile(profileId, mod);
        await refreshProfiles();
      } catch (error: any) {
        console.error('Failed to add mod to profile:', error);
        throw error;
      }
    },
    [refreshProfiles]
  );

  /**
   * Remove a mod from a profile
   */
  const removeModFromProfile = useCallback(
    async (profileId: string, modId: number) => {
      try {
        await profileService.removeModFromProfile(profileId, modId);
        await refreshProfiles();

        showToast({
          type: 'success',
          title: 'Mod removed',
          message: 'Mod removed from profile',
          duration: 3000,
        });
      } catch (error: any) {
        showToast({
          type: 'error',
          title: 'Failed to remove mod',
          message: error.message || 'Unknown error',
          duration: 5000,
        });
        throw error;
      }
    },
    [refreshProfiles, showToast]
  );

  /**
   * Toggle a mod enabled/disabled in a profile
   */
  const toggleModInProfile = useCallback(
    async (profileId: string, modId: number, enabled: boolean) => {
      try {
        await profileService.toggleModInProfile(profileId, modId, enabled);
        await refreshProfiles();
      } catch (error: any) {
        console.error('Failed to toggle mod:', error);
        throw error;
      }
    },
    [refreshProfiles]
  );

  /**
   * Get current mods path
   */
  const getModsPath = useCallback(() => {
    return modsPath;
  }, [modsPath]);

  const value: ProfileContextType = {
    profiles,
    activeProfile,
    isLoading,
    error,
    refreshProfiles,
    createProfile,
    updateProfile,
    deleteProfile,
    activateProfile,
    addModToProfile,
    removeModFromProfile,
    toggleModInProfile,
    getModsPath,
  };

  return (
    <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
  );
}

/**
 * Hook to use profile context
 */
export function useProfiles() {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfiles must be used within ProfileProvider');
  }
  return context;
}
