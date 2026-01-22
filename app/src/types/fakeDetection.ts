/**
 * Types for fake mod detection system
 * Used across frontend services and components
 */

/**
 * ZIP analysis result from Tauri analyze_zip_content command
 */
export interface ZipAnalysis {
  /** Whether the ZIP contains any .package files */
  has_package_files: boolean;
  /** Whether the ZIP contains any .ts4script files */
  has_ts_script: boolean;
  /** List of all files in the ZIP */
  file_list: string[];
  /** List of suspicious files (README, HTML, URL shortcuts, etc.) */
  suspicious_files: string[];
  /** Total number of files in the ZIP */
  total_files: number;
}

/**
 * Result of fake score calculation
 */
export interface FakeScoreResult {
  /** Suspicion score from 0 (legitimate) to 100 (definitely fake) */
  score: number;
  /** Human-readable reasons for the score */
  reasons: string[];
  /** Whether the mod should be flagged as suspicious (score >= 30) */
  isSuspicious: boolean;
}

/**
 * Warning status for a mod from the backend
 */
export interface ModWarningStatus {
  /** Whether this mod has any warning */
  hasWarning: boolean;
  /** Number of user reports */
  reportCount: number;
  /** Whether warning was triggered automatically (no mod files) */
  isAutoWarned: boolean;
  /** Human-readable reason for the warning */
  warningReason?: string;
  /** Whether the mod's creator is banned */
  creatorBanned: boolean;
}

/**
 * Request body for submitting a fake mod report
 */
export interface ReportSubmission {
  /** UUID of the reporting machine */
  machineId: string;
  /** User-provided reason for report */
  reason: string;
  /** Calculated fake score at time of report (0-100) */
  fakeScore: number;
  /** CurseForge creator ID (optional) */
  creatorId?: number;
  /** Creator display name (optional) */
  creatorName?: string;
}

/**
 * Response for batch warning status
 * Maps mod ID to its warning status
 */
export type BatchWarningResponse = Record<number, ModWarningStatus>;

/**
 * Creator ban status from the backend
 */
export interface CreatorBanStatus {
  /** Whether the creator is banned */
  banned: boolean;
  /** Reason for the ban */
  reason?: string;
  /** Number of mods that triggered the ban */
  modsBannedCount?: number;
}
