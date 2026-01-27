/**
 * Unit tests for formatter utility functions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  formatDownloadCount,
  formatRelativeDate,
  formatFileSize,
  formatDate,
  formatVersion,
} from '@/utils/formatters';

describe('formatDownloadCount', () => {
  it('should format millions', () => {
    expect(formatDownloadCount(1_500_000)).toBe('1.5M');
    expect(formatDownloadCount(1_000_000)).toBe('1.0M');
    expect(formatDownloadCount(10_000_000)).toBe('10.0M');
  });

  it('should format thousands', () => {
    expect(formatDownloadCount(2_400)).toBe('2.4k');
    expect(formatDownloadCount(1_000)).toBe('1.0k');
    expect(formatDownloadCount(999_999)).toBe('1000.0k');
  });

  it('should return raw number below 1000', () => {
    expect(formatDownloadCount(500)).toBe('500');
    expect(formatDownloadCount(0)).toBe('0');
    expect(formatDownloadCount(999)).toBe('999');
  });
});

describe('formatRelativeDate', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should format minutes ago', () => {
    const thirtyMinAgo = new Date('2025-06-15T11:30:00Z').toISOString();
    const result = formatRelativeDate(thirtyMinAgo);
    expect(result).toContain('ago');
  });

  it('should format hours ago', () => {
    const threeHoursAgo = new Date('2025-06-15T09:00:00Z').toISOString();
    const result = formatRelativeDate(threeHoursAgo);
    expect(result).toContain('ago');
  });

  it('should format days ago', () => {
    const fiveDaysAgo = new Date('2025-06-10T12:00:00Z').toISOString();
    const result = formatRelativeDate(fiveDaysAgo);
    expect(result).toContain('ago');
  });

  it('should format absolute date for older entries', () => {
    const oldDate = new Date('2024-06-10T00:00:00Z').toISOString();
    const result = formatRelativeDate(oldDate);
    expect(result).toContain('June');
    expect(result).toContain('2024');
  });

  it('should handle invalid date gracefully', () => {
    const result = formatRelativeDate('not a valid date at all !!!');
    expect(result).toBe('Recently');
  });

  it('should format with en-US locale explicitly', () => {
    const fiveDaysAgo = new Date('2025-06-10T12:00:00Z').toISOString();
    const result = formatRelativeDate(fiveDaysAgo, 'en-US');
    expect(result).toContain('ago');
  });
});

describe('formatFileSize', () => {
  it('should format 0 bytes', () => {
    expect(formatFileSize(0)).toBe('0 B');
  });

  it('should format bytes', () => {
    expect(formatFileSize(512)).toBe('512.0 B');
  });

  it('should format kilobytes', () => {
    expect(formatFileSize(2048)).toBe('2.0 KB');
  });

  it('should format megabytes', () => {
    expect(formatFileSize(1_536_000)).toBe('1.5 MB');
  });

  it('should format gigabytes', () => {
    expect(formatFileSize(2_147_483_648)).toBe('2.0 GB');
  });
});

describe('formatDate', () => {
  it('should format ISO date to full date', () => {
    const result = formatDate('2025-01-10T00:00:00Z');
    expect(result).toContain('January');
    expect(result).toContain('10');
    expect(result).toContain('2025');
  });

  it('should handle invalid date gracefully', () => {
    const result = formatDate('not a valid date at all !!!');
    expect(result).toBe('Unknown date');
  });

  it('should format with en-US locale explicitly', () => {
    const result = formatDate('2025-01-10T00:00:00Z', 'en-US');
    expect(result).toContain('January');
    expect(result).toContain('2025');
  });
});

describe('formatVersion', () => {
  it('should strip leading v', () => {
    expect(formatVersion('v1.2.3')).toBe('1.2.3');
  });

  it('should leave versions without v unchanged', () => {
    expect(formatVersion('2023.6.0')).toBe('2023.6.0');
  });

  it('should only strip the first v', () => {
    expect(formatVersion('vv1.0')).toBe('v1.0');
  });
});
