/**
 * CurseForge API types
 * Transformed and serialized data from CurseForge API responses
 */

/**
 * Mod author information
 */
export interface CurseForgeAuthor {
  name: string;
  id: number;
}

/**
 * Mod file information
 */
export interface CurseForgeFile {
  id: number;
  displayName: string;
  fileName: string;
  fileDate: string; // ISO 8601 timestamp
  fileLength: number; // size in bytes
  downloadUrl: string;
  gameVersions: string[];
}

/**
 * Mod information from CurseForge API
 */
export interface CurseForgeMod {
  id: number;
  name: string;
  slug: string;
  summary: string;
  description: string;
  downloadCount: number;
  dateModified: string; // ISO 8601 timestamp
  dateCreated: string; // ISO 8601 timestamp
  logo: string | null; // URL to logo image
  screenshots: string[]; // URLs to screenshot images
  authors: CurseForgeAuthor[];
  categories: string[];
  websiteUrl: string | null;
  latestFiles: CurseForgeFile[];
}

/**
 * Pagination information
 */
export interface PaginationInfo {
  index: number;
  pageSize: number;
  resultCount: number;
  totalCount: number;
}

/**
 * Search results from CurseForge API
 */
export interface CurseForgeSearchResult {
  mods: CurseForgeMod[];
  pagination: PaginationInfo;
}
