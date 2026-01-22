/**
 * Service for calculating fake mod scores based on various criteria
 * Used to detect potentially fake or misleading mods
 */

import type { ZipAnalysis, FakeScoreResult } from '../../types/fakeDetection.types';

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
 * Service for calculating fake mod scores
 */
export class FakeScoreService {
  /**
   * Calculate fake score based on mod metadata and ZIP analysis
   *
   * @param modTitle - Mod title from CurseForge
   * @param zipAnalysis - ZIP content analysis from Tauri
   * @param downloadCount - Mod download count
   * @param isTrending - Whether mod is marked as trending/popular
   * @param creatorFakeRatio - Ratio of fake mods by this creator (0-1)
   * @returns FakeScoreResult with score, reasons, and suspicious flag
   */
  calculateScore(
    modTitle: string,
    zipAnalysis: ZipAnalysis,
    downloadCount: number,
    isTrending: boolean = false,
    creatorFakeRatio: number = 0
  ): FakeScoreResult {
    let score = 0;
    const reasons: string[] = [];

    // Rule 1: +25 for suspicious title keywords
    if (this.hasSuspiciousTitle(modTitle)) {
      score += 25;
      reasons.push('Title contains suspicious keywords (Patreon, Early Access, etc.)');
    }

    // Rule 2: +50 for no .package or .ts4script files (major red flag)
    if (!zipAnalysis.hasPackageFiles && !zipAnalysis.hasTsScript) {
      score += 50;
      reasons.push('No .package or .ts4script files detected');
    }

    // Rule 3: +20 for only README/HTML/link files
    if (this.containsOnlyInfoFiles(zipAnalysis)) {
      score += 20;
      reasons.push('ZIP contains only README, HTML, or link files');
    }

    // Rule 4: +15 for low downloads but trending
    if (downloadCount < 100 && isTrending) {
      score += 15;
      reasons.push('Low downloads (<100) but marked as trending/popular');
    }

    // Rule 5: +10 if creator has >70% fake mods
    if (creatorFakeRatio > 0.7) {
      score += 10;
      reasons.push(
        `Creator has ${Math.round(creatorFakeRatio * 100)}% fake mods in portfolio`
      );
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
    if (analysis.fileList.length === 0) {
      return true;
    }

    // Filter out directory entries
    const actualFiles = analysis.fileList.filter(
      (file) => !file.endsWith('/') && !file.endsWith('\\')
    );

    if (actualFiles.length === 0) {
      return true;
    }

    // Check if all files are info-only files
    return actualFiles.every((file) => {
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
   * (has at least one .package or .ts4script file)
   */
  isValidMod(analysis: ZipAnalysis): boolean {
    return analysis.hasPackageFiles || analysis.hasTsScript;
  }

  /**
   * Get a human-readable summary of why a mod is suspicious
   */
  getSuspicionSummary(result: FakeScoreResult): string {
    if (!result.isSuspicious) {
      return 'This mod appears to be legitimate.';
    }

    return `This mod has a suspicion score of ${result.score}/100. Reasons: ${result.reasons.join('; ')}`;
  }
}

// Export singleton instance
export const fakeScoreService = new FakeScoreService();
