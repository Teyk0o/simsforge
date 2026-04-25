/**
 * Existing Mod Scan Service
 *
 * Scans the Sims 4 Mods folder for existing mods, groups them by folder,
 * imports them into SimsForge's cache, and creates a profile.
 */

import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { v4 as uuidv4 } from 'uuid';
import { modCacheService } from './ModCacheService';
import { profileService } from './ProfileService';
import type { ProfileMod } from '@/types/profile';
import { concurrentMap } from '@/lib/utils/concurrencyPool';
import { diskPerformanceService } from './DiskPerformanceService';

interface ScannedModFile {
  path: string;
  file_name: string;
  size: number;
}

interface ScannedModGroup {
  group_name: string;
  is_folder: boolean;
  files: ScannedModFile[];
  total_size: number;
  combined_hash: string;
}

interface ScanResult {
  groups: ScannedModGroup[];
  total_files: number;
  total_groups: number;
  errors: string[];
}

export interface ScanProgress {
  phase: 'scanning' | 'importing' | 'complete';
  current: number;
  total: number;
  currentName: string;
  imported: number;
  skipped: number;
  errors: number;
}

export interface ScanImportResult {
  profileId: string;
  profileName: string;
  imported: number;
  skipped: number;
  errors: Array<{ name: string; error: string }>;
  totalFiles: number;
}

export class ExistingModScanService {
  async scanAndImport(
    modsPath: string,
    onProgress: (progress: ScanProgress) => void
  ): Promise<ScanImportResult> {
    // Phase 1: Scan via Rust
    let unlisten: UnlistenFn | null = null;

    try {
      unlisten = await listen<{ current: number; total: number; current_group: string }>(
        'scan-progress',
        (event) => {
          onProgress({
            phase: 'scanning',
            current: event.payload.current,
            total: event.payload.total,
            currentName: event.payload.current_group,
            imported: 0,
            skipped: 0,
            errors: 0,
          });
        }
      );

      const scanResult = await invoke<ScanResult>('scan_mods_folder', {
        modsPath,
      });

      unlisten();
      unlisten = null;

      if (scanResult.groups.length === 0) {
        return {
          profileId: '',
          profileName: '',
          imported: 0,
          skipped: 0,
          errors: scanResult.errors.map((e) => ({ name: 'scan', error: e })),
          totalFiles: 0,
        };
      }

      // Phase 2: Create profile
      const profileName = await this.getUniqueProfileName();
      const profile = await profileService.createProfile(
        profileName,
        'Auto-imported from existing Sims 4 Mods folder',
        ['imported']
      );

      // Phase 3: Import groups into cache
      const poolSize = await diskPerformanceService.getPoolSize();
      let imported = 0;
      let skipped = 0;
      const importErrors: Array<{ name: string; error: string }> = [];

      const results = await concurrentMap(
        scanResult.groups,
        async (group, index) => {
          onProgress({
            phase: 'importing',
            current: index + 1,
            total: scanResult.groups.length,
            currentName: group.group_name,
            imported,
            skipped,
            errors: importErrors.length,
          });

          const localModId = uuidv4();
          const filePaths = group.files.map((f) => f.path);

          const cachedMod = await modCacheService.addGroupToCache(
            localModId,
            group.group_name,
            filePaths,
            group.combined_hash,
            group.total_size,
            profile.id
          );

          const isNew = cachedMod.usedByProfiles.length === 1;

          const profileMod: ProfileMod = {
            localModId,
            isLocal: true,
            modName: group.group_name,
            fileHash: cachedMod.fileHash,
            fileName: group.is_folder
              ? group.group_name
              : group.files[0]?.file_name || group.group_name,
            installDate: new Date().toISOString(),
            enabled: true,
            cacheLocation: cachedMod.fileHash,
          };

          await profileService.addModToProfile(profile.id, profileMod);

          return isNew;
        },
        poolSize,
        (completed) => {
          onProgress({
            phase: 'importing',
            current: completed,
            total: scanResult.groups.length,
            currentName: '',
            imported,
            skipped,
            errors: importErrors.length,
          });
        }
      );

      for (const result of results) {
        if (result.status === 'fulfilled') {
          if (result.value) {
            imported++;
          } else {
            skipped++;
          }
        } else {
          importErrors.push({
            name: 'unknown',
            error: String(result.reason),
          });
        }
      }

      onProgress({
        phase: 'complete',
        current: scanResult.groups.length,
        total: scanResult.groups.length,
        currentName: '',
        imported,
        skipped,
        errors: importErrors.length,
      });

      return {
        profileId: profile.id,
        profileName,
        imported,
        skipped,
        errors: importErrors,
        totalFiles: scanResult.total_files,
      };
    } finally {
      unlisten?.();
    }
  }

  private async getUniqueProfileName(): Promise<string> {
    const baseName = 'My Old Mods';
    const profiles = await profileService.getAllProfiles();
    const names = new Set(profiles.map((p) => p.name));

    if (!names.has(baseName)) return baseName;

    let counter = 2;
    while (names.has(`${baseName} (${counter})`)) {
      counter++;
    }
    return `${baseName} (${counter})`;
  }
}

export const existingModScanService = new ExistingModScanService();
