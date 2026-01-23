/**
 * Profile Service
 *
 * Manages profile CRUD operations, persistence, and metadata tracking.
 * Profiles are stored as JSON files in AppData for fast local access.
 */

import {
  writeFile,
  readFile,
  exists,
  mkdir,
  readDir,
  remove,
} from '@tauri-apps/plugin-fs';
import { appDataDir } from '@tauri-apps/api/path';
import { join } from '@tauri-apps/api/path';
import { v4 as uuidv4 } from 'uuid';
import { ModProfile, ProfileMetadata, ProfileMod } from '@/types/profile';

export class ProfileService {
  private profilesDir: string | null = null;
  private metadataFile: string | null = null;
  private initialized = false;

  /**
   * Initialize service and ensure directories exist
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      const appData = await appDataDir();
      this.profilesDir = await join(appData, 'SimsForge', 'Profiles');
      this.metadataFile = await join(this.profilesDir, 'profiles.meta.json');

      if (!(await exists(this.profilesDir))) {
        await mkdir(this.profilesDir, { recursive: true });
      }

      // Initialize metadata if not exists
      if (!(await exists(this.metadataFile))) {
        const defaultMetadata: ProfileMetadata = {
          activeProfileId: null,
          profiles: [],
          lastSync: new Date().toISOString(),
        };
        await this.saveMetadata(defaultMetadata);
      }

      this.initialized = true;
    } catch (error) {
      console.error('[ProfileService] initialize() error:', error);
      throw error;
    }
  }

  /**
   * Create a new profile
   */
  async createProfile(
    name: string,
    description: string,
    tags: string[] = []
  ): Promise<ModProfile> {
    try {
      await this.ensureInitialized();

      // Validate name uniqueness
      const existing = await this.getAllProfiles();
      if (existing.some((p) => p.name === name)) {
        throw new Error(`Profile "${name}" already exists`);
      }

      const profile: ModProfile = {
        id: uuidv4(),
        name,
        description,
        tags,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        mods: [],
        isActive: false,
        iconColor: this.generateRandomColor(),
      };

      // Save profile file
      const profilePath = await join(this.profilesDir!, `${profile.id}.json`);

      await writeFile(
        profilePath,
        new TextEncoder().encode(JSON.stringify(profile, null, 2))
      );

      // Update metadata
      const metadata = await this.getMetadata();
      metadata.profiles.push(profile.id);
      metadata.lastSync = new Date().toISOString();
      await this.saveMetadata(metadata);

      return profile;
    } catch (error) {
      console.error('[ProfileService] Error creating profile:', error);
      throw error;
    }
  }

  /**
   * Get all profiles
   */
  async getAllProfiles(): Promise<ModProfile[]> {
    await this.ensureInitialized();

    const metadata = await this.getMetadata();
    const profiles: ModProfile[] = [];

    for (const profileId of metadata.profiles) {
      const profile = await this.getProfile(profileId);
      if (profile) {
        profiles.push(profile);
      }
    }

    return profiles.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Get specific profile by ID
   */
  async getProfile(profileId: string): Promise<ModProfile | null> {
    await this.ensureInitialized();

    const profilePath = await join(this.profilesDir!, `${profileId}.json`);

    if (!(await exists(profilePath))) {
      return null;
    }

    try {
      const content = await readFile(profilePath);
      const decoder = new TextDecoder();
      return JSON.parse(decoder.decode(content));
    } catch (error) {
      console.error(`Failed to parse profile ${profileId}:`, error);
      return null;
    }
  }

  /**
   * Update an existing profile
   */
  async updateProfile(
    profileId: string,
    updates: Partial<ModProfile>
  ): Promise<ModProfile> {
    await this.ensureInitialized();

    const profile = await this.getProfile(profileId);
    if (!profile) {
      throw new Error(`Profile ${profileId} not found`);
    }

    // Validate name uniqueness if updating name
    if (updates.name && updates.name !== profile.name) {
      const existing = await this.getAllProfiles();
      if (existing.some((p) => p.name === updates.name)) {
        throw new Error(`Profile "${updates.name}" already exists`);
      }
    }

    const updatedProfile: ModProfile = {
      ...profile,
      ...updates,
      id: profile.id, // Prevent ID changes
      createdAt: profile.createdAt, // Prevent creation date changes
      updatedAt: new Date().toISOString(),
    };

    const profilePath = await join(this.profilesDir!, `${profileId}.json`);
    await writeFile(
      profilePath,
      new TextEncoder().encode(JSON.stringify(updatedProfile, null, 2))
    );

    return updatedProfile;
  }

  /**
   * Delete a profile
   */
  async deleteProfile(profileId: string): Promise<void> {
    await this.ensureInitialized();

    const metadata = await this.getMetadata();

    // Cannot delete active profile
    if (metadata.activeProfileId === profileId) {
      throw new Error('Cannot delete the active profile. Deactivate it first.');
    }

    // Delete profile file
    const profilePath = await join(this.profilesDir!, `${profileId}.json`);
    if (await exists(profilePath)) {
      await remove(profilePath);
    }

    // Update metadata
    metadata.profiles = metadata.profiles.filter((id) => id !== profileId);
    metadata.lastSync = new Date().toISOString();
    await this.saveMetadata(metadata);
  }

  /**
   * Add mod to profile
   */
  async addModToProfile(profileId: string, mod: ProfileMod): Promise<void> {
    const profile = await this.getProfile(profileId);
    if (!profile) {
      throw new Error(`Profile ${profileId} not found`);
    }

    // Check if mod already exists
    const existingIndex = profile.mods.findIndex((m) => m.modId === mod.modId);
    if (existingIndex >= 0) {
      // Update existing mod
      profile.mods[existingIndex] = mod;
    } else {
      // Add new mod
      profile.mods.push(mod);
    }

    await this.updateProfile(profileId, { mods: profile.mods });
  }

  /**
   * Remove mod from profile
   */
  async removeModFromProfile(profileId: string, modId: number): Promise<void> {
    const profile = await this.getProfile(profileId);
    if (!profile) {
      throw new Error(`Profile ${profileId} not found`);
    }

    profile.mods = profile.mods.filter((m) => m.modId !== modId);
    await this.updateProfile(profileId, { mods: profile.mods });
  }

  /**
   * Get active profile
   */
  async getActiveProfile(): Promise<ModProfile | null> {
    await this.ensureInitialized();

    const metadata = await this.getMetadata();
    if (!metadata.activeProfileId) {
      return null;
    }

    return this.getProfile(metadata.activeProfileId);
  }

  /**
   * Set active profile
   */
  async setActiveProfile(profileId: string | null): Promise<void> {
    await this.ensureInitialized();

    const metadata = await this.getMetadata();

    // Validate profile exists
    if (profileId && !(await this.getProfile(profileId))) {
      throw new Error(`Profile ${profileId} not found`);
    }

    // Update all profiles' isActive status
    for (const id of metadata.profiles) {
      const profile = await this.getProfile(id);
      if (profile) {
        profile.isActive = id === profileId;
        const profilePath = await join(this.profilesDir!, `${id}.json`);
        await writeFile(
          profilePath,
          new TextEncoder().encode(JSON.stringify(profile, null, 2))
        );
      }
    }

    metadata.activeProfileId = profileId;
    metadata.lastSync = new Date().toISOString();
    await this.saveMetadata(metadata);
  }

  /**
   * Enable/disable a mod in a profile
   */
  async toggleModInProfile(
    profileId: string,
    modId: number,
    enabled: boolean
  ): Promise<void> {
    const profile = await this.getProfile(profileId);
    if (!profile) {
      throw new Error(`Profile ${profileId} not found`);
    }

    const mod = profile.mods.find((m) => m.modId === modId);
    if (!mod) {
      throw new Error(`Mod ${modId} not found in profile ${profileId}`);
    }

    mod.enabled = enabled;
    await this.updateProfile(profileId, { mods: profile.mods });
  }

  // Helper methods

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  private async getMetadata(): Promise<ProfileMetadata> {
    try {
      const content = await readFile(this.metadataFile!);
      const decoder = new TextDecoder();
      return JSON.parse(decoder.decode(content));
    } catch (error) {
      console.error('Failed to read metadata:', error);
      // Return default if corrupted
      return {
        activeProfileId: null,
        profiles: [],
        lastSync: new Date().toISOString(),
      };
    }
  }

  private async saveMetadata(metadata: ProfileMetadata): Promise<void> {
    await writeFile(
      this.metadataFile!,
      new TextEncoder().encode(JSON.stringify(metadata, null, 2))
    );
  }

  private generateRandomColor(): string {
    const colors = [
      '#46C89B', // SimsForge green
      '#FF6B6B', // Red
      '#4ECDC4', // Teal
      '#FFD93D', // Yellow
      '#A8E6CF', // Mint
      '#FF8B94', // Pink
      '#FFB3BA', // Light pink
      '#A0C4FF', // Light blue
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }
}

// Export singleton instance
export const profileService = new ProfileService();
