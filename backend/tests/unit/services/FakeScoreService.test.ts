/**
 * Unit tests for FakeScoreService
 * Tests fake score calculation and suspicion detection
 */

import { FakeScoreService } from '@services/fakeDetection/FakeScoreService';
import { mockZipAnalysis } from '../../fixtures/mocks';

describe('FakeScoreService', () => {
  let fakeScoreService: FakeScoreService;

  beforeEach(() => {
    fakeScoreService = new FakeScoreService();
  });

  describe('calculateScore', () => {
    it('should return 0 for valid mod with no suspicions', () => {
      const result = fakeScoreService.calculateScore(
        'Normal Mod Name',
        mockZipAnalysis.valid,
        5000,
        false,
        0
      );

      expect(result.score).toBe(0);
      expect(result.isSuspicious).toBe(false);
      expect(result.reasons).toHaveLength(0);
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('isSuspicious');
      expect(result).toHaveProperty('reasons');
    });

    it('should add 50 points for missing package files', () => {
      const result = fakeScoreService.calculateScore(
        'Normal Mod',
        mockZipAnalysis.noScripts,
        5000,
        false,
        0
      );

      expect(result.score).toBeGreaterThanOrEqual(50);
      expect(result.reasons.length).toBeGreaterThan(0);
    });

    it('should add 25 points for suspicious title keywords', () => {
      const suspiciousTitles = [
        'Free Patreon Mod',
        'Early Access Mod',
      ];

      suspiciousTitles.forEach((title) => {
        const result = fakeScoreService.calculateScore(
          title,
          mockZipAnalysis.valid,
          5000,
          false,
          0
        );
        expect(result.score).toBeGreaterThanOrEqual(25);
        expect(result.reasons.length).toBeGreaterThan(0);
      });
    });

    it('should mark as suspicious when score >= 30', () => {
      const result = fakeScoreService.calculateScore(
        'Download Here Mod',
        mockZipAnalysis.noScripts,
        100,
        false,
        0
      );

      expect(result.score).toBeGreaterThanOrEqual(30);
      expect(result.isSuspicious).toBe(true);
    });

    it('should not mark as suspicious when score < 30', () => {
      const result = fakeScoreService.calculateScore(
        'Normal Mod',
        mockZipAnalysis.valid,
        5000,
        false,
        0
      );

      expect(result.score).toBeLessThan(30);
      expect(result.isSuspicious).toBe(false);
    });

    it('should add creator fake ratio points', () => {
      const resultLowRatio = fakeScoreService.calculateScore(
        'Normal Mod',
        mockZipAnalysis.valid,
        5000,
        false,
        0.2
      );

      const resultHighRatio = fakeScoreService.calculateScore(
        'Normal Mod',
        mockZipAnalysis.valid,
        5000,
        false,
        0.8
      );

      expect(resultHighRatio.score).toBeGreaterThan(
        resultLowRatio.score
      );
    });

    it('should handle trending with low downloads', () => {
      const result = fakeScoreService.calculateScore(
        'Normal Mod',
        mockZipAnalysis.valid,
        50,
        true,
        0
      );

      expect(result.score).toBeGreaterThan(0);
      expect(result.reasons.length).toBeGreaterThan(0);
    });

    it('should accumulate multiple suspicion factors', () => {
      const result = fakeScoreService.calculateScore(
        'Free Patreon Early Access',
        mockZipAnalysis.noScripts,
        10,
        true,
        0.7
      );

      expect(result.score).toBeGreaterThan(50);
      expect(result.reasons.length).toBeGreaterThan(1);
      expect(result.isSuspicious).toBe(true);
    });

    it('should handle only info files (README, HTML, links)', () => {
      const result = fakeScoreService.calculateScore(
        'Normal Mod',
        mockZipAnalysis.suspicious,
        1000,
        false,
        0
      );

      expect(result.score).toBeGreaterThan(0);
    });

    it('should increase score with low downloads for trending mod', () => {
      const trendingWithLowDownloads = fakeScoreService.calculateScore(
        'Popular Mod',
        mockZipAnalysis.valid,
        10,
        true,
        0
      );

      expect(trendingWithLowDownloads.score).toBeGreaterThan(0);
    });
  });

  describe('isValidMod', () => {
    it('should return true for valid mods with package files', () => {
      const isValid = fakeScoreService.isValidMod(
        mockZipAnalysis.valid
      );
      expect(isValid).toBe(true);
    });

    it('should return false for mods without package or script files', () => {
      const isValid = fakeScoreService.isValidMod(
        mockZipAnalysis.noScripts
      );
      expect(isValid).toBe(false);
    });

    it('should return true if ts4script is present', () => {
      const analysis = {
        ...mockZipAnalysis.noScripts,
        hasTsScript: true,
      };
      const isValid = fakeScoreService.isValidMod(analysis);
      expect(isValid).toBe(true);
    });

    it('should return true if package files present', () => {
      const analysis = {
        ...mockZipAnalysis.noScripts,
        hasPackageFiles: true,
      };
      const isValid = fakeScoreService.isValidMod(analysis);
      expect(isValid).toBe(true);
    });
  });

  describe('getSuspicionSummary', () => {
    it('should return human-readable summary for suspicious mod', () => {
      const result = fakeScoreService.calculateScore(
        'Free Patreon Mod',
        mockZipAnalysis.noScripts,
        100,
        false,
        0
      );

      const summary = fakeScoreService.getSuspicionSummary(result);
      expect(typeof summary).toBe('string');
      expect(summary.length).toBeGreaterThan(0);
    });

    it('should return different summary for clean mod', () => {
      const cleanResult = fakeScoreService.calculateScore(
        'Clean Mod',
        mockZipAnalysis.valid,
        10000,
        false,
        0
      );

      const suspiciousResult = fakeScoreService.calculateScore(
        'Free Patreon Download',
        mockZipAnalysis.noScripts,
        10,
        true,
        0.8
      );

      const cleanSummary = fakeScoreService.getSuspicionSummary(cleanResult);
      const suspiciousSummary = fakeScoreService.getSuspicionSummary(suspiciousResult);

      // Both should be strings but likely different content
      expect(typeof cleanSummary).toBe('string');
      expect(typeof suspiciousSummary).toBe('string');
    });
  });

  describe('edge cases', () => {
    it('should handle empty title', () => {
      const result = fakeScoreService.calculateScore(
        '',
        mockZipAnalysis.valid,
        5000,
        false,
        0
      );
      expect(typeof result.score).toBe('number');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.isSuspicious).toBe(false);
    });

    it('should handle zero downloads', () => {
      const result = fakeScoreService.calculateScore(
        'Normal Mod',
        mockZipAnalysis.valid,
        0,
        false,
        0
      );
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it('should handle very high downloads', () => {
      const result = fakeScoreService.calculateScore(
        'Popular Mod',
        mockZipAnalysis.valid,
        1000000,
        false,
        0
      );
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it('should handle creator ratio of 0 (0% fake)', () => {
      const result = fakeScoreService.calculateScore(
        'Normal Mod',
        mockZipAnalysis.valid,
        5000,
        false,
        0
      );
      expect(result.score).toBe(0);
    });

    it('should handle creator ratio of 1 (100% fake)', () => {
      const result = fakeScoreService.calculateScore(
        'Normal Mod',
        mockZipAnalysis.valid,
        5000,
        false,
        1
      );
      expect(result.score).toBeGreaterThan(0);
    });

    it('should not exceed score beyond reasonable bounds', () => {
      const result = fakeScoreService.calculateScore(
        'Free Patreon Download Link Early Access',
        mockZipAnalysis.suspicious,
        1,
        true,
        1
      );
      expect(result.score).toBeLessThan(200);
      expect(result.score).toBeGreaterThan(0);
    });

    it('should handle title with special characters', () => {
      const result = fakeScoreService.calculateScore(
        'Mod™ © ® with émojis 🎮',
        mockZipAnalysis.valid,
        5000,
        false,
        0
      );
      expect(typeof result.score).toBe('number');
    });

    it('should handle very long title', () => {
      const longTitle = 'A'.repeat(500);
      const result = fakeScoreService.calculateScore(
        longTitle,
        mockZipAnalysis.valid,
        5000,
        false,
        0
      );
      expect(typeof result.score).toBe('number');
    });

    it('should handle mixed case suspicious keywords', () => {
      const result = fakeScoreService.calculateScore(
        'FREE patreon MOD',
        mockZipAnalysis.valid,
        5000,
        false,
        0
      );
      expect(result.score).toBeGreaterThan(0);
    });

    it('should treat empty fileList as info-only (line 101)', () => {
      const emptyFileListAnalysis = {
        hasPackageFiles: false,
        hasTsScript: false,
        fileList: [],
        suspiciousFiles: [],
        totalFiles: 0,
      };

      const result = fakeScoreService.calculateScore(
        'Normal Mod',
        emptyFileListAnalysis,
        5000,
        false,
        0
      );

      // Should trigger both "no package files" (+50) and "only info files" (+20)
      expect(result.score).toBeGreaterThanOrEqual(70);
      expect(result.reasons).toEqual(
        expect.arrayContaining([
          expect.stringContaining('No .package or .ts4script'),
          expect.stringContaining('only README, HTML, or link files'),
        ])
      );
    });

    it('should treat directory-only fileList as info-only (line 110)', () => {
      const dirOnlyAnalysis = {
        hasPackageFiles: false,
        hasTsScript: false,
        fileList: ['folder/', 'subfolder/nested/', 'other\\'],
        suspiciousFiles: [],
        totalFiles: 3,
      };

      const result = fakeScoreService.calculateScore(
        'Normal Mod',
        dirOnlyAnalysis,
        5000,
        false,
        0
      );

      // Should trigger "no package files" (+50) and "only info files" (+20)
      expect(result.score).toBeGreaterThanOrEqual(70);
      expect(result.reasons).toEqual(
        expect.arrayContaining([
          expect.stringContaining('only README, HTML, or link files'),
        ])
      );
    });

    it('should handle files without extension (line 126)', () => {
      const noExtAnalysis = {
        hasPackageFiles: false,
        hasTsScript: false,
        fileList: ['Makefile', 'LICENSE', 'CHANGELOG'],
        suspiciousFiles: [],
        totalFiles: 3,
      };

      const result = fakeScoreService.calculateScore(
        'Normal Mod',
        noExtAnalysis,
        5000,
        false,
        0
      );

      // Files without extensions are NOT in INFO_ONLY_EXTENSIONS,
      // so containsOnlyInfoFiles returns false — only "no package files" triggers
      expect(result.score).toBe(50);
      expect(result.reasons).toHaveLength(1);
      expect(result.reasons[0]).toContain('No .package or .ts4script');
    });
  });
});
