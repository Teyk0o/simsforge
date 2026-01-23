/**
 * Unit tests for frontend FakeScoreService
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FakeScoreService } from '@/lib/services/FakeScoreService';
import type { ZipAnalysis } from '@/types/fakeDetection';

const mockValidAnalysis: ZipAnalysis = {
  has_package_files: true,
  has_ts_script: true,
  file_list: ['mod.package', 'script.ts4script', 'README.txt'],
  suspicious_files: [],
  total_files: 3,
};

const mockNoModFiles: ZipAnalysis = {
  has_package_files: false,
  has_ts_script: false,
  file_list: ['README.txt', 'LINK.html'],
  suspicious_files: [],
  total_files: 2,
};

const mockEmptyZip: ZipAnalysis = {
  has_package_files: false,
  has_ts_script: false,
  file_list: [],
  suspicious_files: [],
  total_files: 0,
};

describe('FakeScoreService', () => {
  let service: FakeScoreService;

  beforeEach(() => {
    service = new FakeScoreService();
  });

  describe('calculateScore', () => {
    it('should return 0 for a valid mod', () => {
      const result = service.calculateScore('Normal Mod', mockValidAnalysis, 5000);
      expect(result.score).toBe(0);
      expect(result.isSuspicious).toBe(false);
      expect(result.reasons).toHaveLength(0);
    });

    it('should add 25 points for suspicious title', () => {
      const titles = ['Free Patreon Mod', 'Early Access Content', 'VIP Only Mod', 'Premium Exclusive'];
      titles.forEach((title) => {
        const result = service.calculateScore(title, mockValidAnalysis, 5000);
        expect(result.score).toBeGreaterThanOrEqual(25);
        expect(result.reasons.length).toBeGreaterThan(0);
      });
    });

    it('should add 50 points for missing mod files', () => {
      const result = service.calculateScore('Normal Mod', mockNoModFiles, 5000);
      expect(result.score).toBeGreaterThanOrEqual(50);
    });

    it('should add 20 points for info-only files', () => {
      const infoOnly: ZipAnalysis = {
        has_package_files: false,
        has_ts_script: false,
        file_list: ['README.txt', 'info.html'],
        suspicious_files: [],
        total_files: 2,
      };
      const result = service.calculateScore('Normal Mod', infoOnly, 5000);
      // 50 (no mod files) + 20 (info only) = 70
      expect(result.score).toBeGreaterThanOrEqual(70);
    });

    it('should add 15 points for low downloads + trending', () => {
      const result = service.calculateScore('Normal Mod', mockValidAnalysis, 50, true);
      expect(result.score).toBe(15);
    });

    it('should not add trending points if downloads >= 100', () => {
      const result = service.calculateScore('Normal Mod', mockValidAnalysis, 100, true);
      expect(result.score).toBe(0);
    });

    it('should mark as suspicious when score >= 30', () => {
      const result = service.calculateScore('Normal Mod', mockNoModFiles, 5000);
      expect(result.isSuspicious).toBe(true);
    });

    it('should accumulate multiple factors', () => {
      const result = service.calculateScore('Free Patreon Mod', mockNoModFiles, 10, true);
      // 25 (title) + 50 (no mod files) + 20 (info only) + 15 (trending) = 110
      expect(result.score).toBeGreaterThan(50);
      expect(result.reasons.length).toBeGreaterThan(2);
    });

    it('should handle empty file list as info-only', () => {
      const result = service.calculateScore('Normal Mod', mockEmptyZip, 5000);
      // 50 (no mod files) + 20 (info only for empty list)
      expect(result.score).toBeGreaterThanOrEqual(70);
    });

    it('should handle files without extension', () => {
      const noExtAnalysis: ZipAnalysis = {
        has_package_files: false,
        has_ts_script: false,
        file_list: ['Makefile', 'LICENSE'],
        suspicious_files: [],
        total_files: 2,
      };
      const result = service.calculateScore('Normal Mod', noExtAnalysis, 5000);
      // Files without extension are not in INFO_ONLY_EXTENSIONS → not info-only
      expect(result.score).toBe(50); // Only "no mod files"
    });

    it('should use default values for optional params', () => {
      const result = service.calculateScore('Normal Mod', mockValidAnalysis);
      expect(result.score).toBe(0);
    });
  });

  describe('isValidMod', () => {
    it('should return true when package files present', () => {
      expect(service.isValidMod({ ...mockEmptyZip, has_package_files: true })).toBe(true);
    });

    it('should return true when ts4script present', () => {
      expect(service.isValidMod({ ...mockEmptyZip, has_ts_script: true })).toBe(true);
    });

    it('should return false when neither present', () => {
      expect(service.isValidMod(mockEmptyZip)).toBe(false);
    });
  });

  describe('getSuspicionSummary', () => {
    it('should return legitimate message for non-suspicious result', () => {
      const result = service.calculateScore('Normal Mod', mockValidAnalysis, 5000);
      expect(service.getSuspicionSummary(result)).toBe('This mod appears to be legitimate.');
    });

    it('should return score and reasons for suspicious result', () => {
      const result = service.calculateScore('Patreon Mod', mockNoModFiles, 5000);
      const summary = service.getSuspicionSummary(result);
      expect(summary).toContain('Suspicion score:');
      expect(summary).toContain('/100');
    });
  });
});
