/**
 * Mod Profile Types and Interfaces
 *
 * Defines the data structures for the mod profiles system, including profile definitions,
 * cache management, and symlink operations.
 */

/**
 * Individual mod reference within a profile
 */
export interface ProfileMod {
  modId: number;
  modName: string;
  versionId: number;
  versionNumber: string;
  fileHash: string;
  fileName: string;
  installDate: string;
  enabled: boolean;
  cacheLocation: string;
  logo?: string;
  authors?: string[];
  lastUpdateDate?: string;
}

/**
 * A complete mod profile with list of mods and metadata
 */
export interface ModProfile {
  id: string;
  name: string;
  description: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  mods: ProfileMod[];
  isActive: boolean;
  iconColor?: string;
}

/**
 * Global profile metadata tracking active profile and list
 */
export interface ProfileMetadata {
  activeProfileId: string | null;
  profiles: string[];
  lastSync: string;
}

/**
 * Individual file within a cached mod
 */
export interface CachedModFile {
  relativePath: string;
  fileName: string;
  fileSize: number;
}

/**
 * Cached mod entry with metadata and deduplication info
 */
export interface CachedMod {
  fileHash: string;
  modId: number;
  fileName: string;
  fileSize: number;
  downloadedAt: string;
  usedByProfiles: string[];
  files: CachedModFile[];
}

/**
 * Cache index for fast lookups by file hash
 */
export interface ModCacheIndex {
  version: string;
  entries: Record<string, CachedMod>;
  lastCleanup: string;
}

/**
 * Error details for failed symlink operations
 */
export interface SymlinkError {
  sourcePath: string;
  targetPath: string;
  error: string;
}

/**
 * Result of a symlink operation (batch)
 */
export interface SymlinkResult {
  success: boolean;
  created: number;
  failed: number;
  errors: SymlinkError[];
}

/**
 * Sims 4 installation paths
 */
export interface Sims4Paths {
  gamePath: string | null;
  modsPath: string | null;
}

/**
 * Validation result for Sims 4 paths
 */
export interface Sims4PathValidation {
  gameValid: boolean;
  modsValid: boolean;
}
