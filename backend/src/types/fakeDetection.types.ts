/**
 * Types for fake mod detection system
 * Used by services, controllers, and routes for type safety
 */

/**
 * ZIP analysis result from Tauri client
 * Returned by the analyze_zip_content Rust command
 */
export interface ZipAnalysis {
  hasPackageFiles: boolean;
  hasTsScript: boolean;
  fileList: string[];
  suspiciousFiles: string[];
  totalFiles: number;
}

/**
 * Result of fake score calculation
 * Score ranges from 0 (legitimate) to 100 (definitely fake)
 */
export interface FakeScoreResult {
  score: number;
  reasons: string[];
  isSuspicious: boolean;
}

/**
 * Warning status for a mod
 * Returned by warning status endpoints
 */
export interface ModWarningStatus {
  hasWarning: boolean;
  reportCount: number;
  isAutoWarned: boolean;
  warningReason?: string;
  creatorBanned: boolean;
}

/**
 * Request body for submitting a fake mod report
 */
export interface ReportSubmission {
  machineId: string;
  reason: string;
  fakeScore: number;
  creatorId?: number;
  creatorName?: string;
}

/**
 * Request body for batch warning status
 */
export interface BatchWarningRequest {
  modIds: number[];
}

/**
 * Response for batch warning status
 * Maps mod ID to its warning status
 */
export interface BatchWarningResponse {
  [modId: number]: ModWarningStatus;
}

/**
 * Result of submitting a report
 */
export interface ReportResult {
  success: boolean;
  alreadyReported?: boolean;
  message?: string;
}

/**
 * Creator ban status
 */
export interface CreatorBanStatus {
  banned: boolean;
  reason?: string;
  modsBannedCount?: number;
}
