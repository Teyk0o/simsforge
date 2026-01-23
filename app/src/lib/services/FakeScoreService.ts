/**
 * Frontend service for calculating fake scores and analyzing mods
 * Interacts with Tauri commands for ZIP analysis and machine ID
 */

import { invoke } from '@tauri-apps/api/core';
import type { ZipAnalysis, FakeScoreResult } from '@/types/fakeDetection';

/**
 * Suspicious patterns in mod titles that may indicate fake mods
 */
const SUSPICIOUS_TITLE_PATTERNS = [
  /patreon/i,
  /early\s*access/i,
  /support\s*me/i,
  /donate/i,
  /exclusive/i,
  /premium/i,
  /vip\s*only/i,
];

/**
 * File extensions commonly found in fake/redirect mods
 */
const INFO_ONLY_EXTENSIONS = ['.txt', '.html', '.htm', '.url', '.lnk', '.md', '.pdf'];

/**
 * Service for fake mod detection on the frontend
 * Handles ZIP analysis and score calculation
 */
export class FakeScoreService {
  /**
   * Analyze ZIP content using Tauri command
   *
   * @param zipPath - Full path to the ZIP file
   * @returns Analysis result with file information
   */
  async analyzeZip(zipPath: string): Promise<ZipAnalysis> {
    return invoke<ZipAnalysis>('analyze_zip_content', { zipPath });
  }

  /**
   * Get or create machine ID for reporting
   * The ID is persisted in the app data directory
   *
   * @returns UUID string for this machine
   */
  async getMachineId(): Promise<string> {
    return invoke<string>('get_or_create_machine_id');
  }

  /**
   * Calculate fake score based on mod metadata and ZIP analysis
   *
   * @param modTitle - Mod title from CurseForge
   * @param zipAnalysis - ZIP content analysis from Tauri
   * @param downloadCount - Mod download count
   * @param isTrending - Whether mod is marked as trending/popular
   * @returns Score result with reasons
   */
  calculateScore(
    modTitle: string,
    zipAnalysis: ZipAnalysis,
    downloadCount: number = 0,
    isTrending: boolean = false
  ): FakeScoreResult {
    let score = 0;
    const reasons: string[] = [];

    // Rule 1: +25 for suspicious title keywords
    if (this.hasSuspiciousTitle(modTitle)) {
      score += 25;
      reasons.push('Title contains suspicious keywords');
    }

    // Rule 2: +50 for no .package or .ts4script files (major red flag)
    if (!zipAnalysis.has_package_files && !zipAnalysis.has_ts_script) {
      score += 50;
      reasons.push('No mod files detected (.package or .ts4script)');
    }

    // Rule 3: +20 for only README/HTML/link files
    if (this.containsOnlyInfoFiles(zipAnalysis)) {
      score += 20;
      reasons.push('Contains only informational files');
    }

    // Rule 4: +15 for low downloads but trending
    if (downloadCount < 100 && isTrending) {
      score += 15;
      reasons.push('Low downloads but marked as popular');
    }

    return {
      score,
      reasons,
      isSuspicious: score >= 30, // Threshold for showing warning popup
    };
  }

  /**
   * Check if mod title contains suspicious keywords
   */
  private hasSuspiciousTitle(title: string): boolean {
    return SUSPICIOUS_TITLE_PATTERNS.some((pattern) => pattern.test(title));
  }

  /**
   * Check if ZIP contains only informational files (no actual mod content)
   */
  private containsOnlyInfoFiles(analysis: ZipAnalysis): boolean {
    if (analysis.file_list.length === 0) {
      return true;
    }

    // Check if all files are info-only files
    return analysis.file_list.every((file) => {
      const ext = this.getExtension(file).toLowerCase();
      return INFO_ONLY_EXTENSIONS.includes(ext);
    });
  }

  /**
   * Extract file extension from path
   */
  private getExtension(filePath: string): string {
    const lastDot = filePath.lastIndexOf('.');
    if (lastDot === -1) {
      return '';
    }
    return filePath.substring(lastDot);
  }

  /**
   * Check if a ZIP analysis indicates a valid mod
   */
  isValidMod(analysis: ZipAnalysis): boolean {
    return analysis.has_package_files || analysis.has_ts_script;
  }

  /**
   * Get a human-readable summary of why a mod is suspicious
   */
  getSuspicionSummary(result: FakeScoreResult): string {
    if (!result.isSuspicious) {
      return 'This mod appears to be legitimate.';
    }

    return `Suspicion score: ${result.score}/100. ${result.reasons.join('; ')}`;
  }
}

// Export singleton instance
export const fakeScoreService = new FakeScoreService();
