/**
 * Utility functions for formatting data in the UI
 */

import { formatDistanceToNow, format } from 'date-fns';
import { getDateLocaleSync } from '@/lib/dateLocales';

/**
 * Format download count to human-readable format
 * @example
 * formatDownloadCount(1500000) // "1.5M"
 * formatDownloadCount(2400) // "2.4k"
 * formatDownloadCount(500) // "500"
 */
export function formatDownloadCount(count: number): string {
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1)}M`;
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(1)}k`;
  }
  return count.toString();
}

/**
 * Format ISO 8601 date to relative time or absolute date
 * Uses date-fns for proper internationalization support
 * @param isoDateStr - ISO 8601 date string
 * @param language - Optional language code (e.g., 'fr-FR'). If not provided, uses en-US.
 *                   Note: For React components, use the useDateFormatters hook instead for automatic locale detection.
 * @example
 * formatRelativeDate("2025-01-05T00:00:00Z") // "5 days ago" (en-US)
 * formatRelativeDate("2025-01-05T00:00:00Z", "fr-FR") // "il y a 5 jours"
 * formatRelativeDate("2024-06-10T00:00:00Z") // "January 10, 2025"
 */
export function formatRelativeDate(
  isoDateStr: string,
  language?: string
): string {
  try {
    const date = new Date(isoDateStr);
    if (isNaN(date.getTime())) {
      return 'Recently';
    }

    const locale = language ? getDateLocaleSync(language) : undefined;
    const now = new Date();
    const daysDiff = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Use relative format for dates within the last 30 days
    if (daysDiff <= 30) {
      return formatDistanceToNow(date, {
        addSuffix: true,
        locale,
      });
    }

    // Fall back to absolute format for older dates
    return format(date, 'PPP', { locale });
  } catch (error) {
    return 'Recently';
  }
}

/**
 * Format file size in bytes to human-readable format
 * @example
 * formatFileSize(1536000) // "1.5 MB"
 * formatFileSize(2048) // "2 KB"
 * formatFileSize(512) // "512 B"
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

/**
 * Format ISO 8601 date to absolute date string
 * Uses date-fns for proper internationalization support
 * @param isoDateStr - ISO 8601 date string
 * @param language - Optional language code (e.g., 'fr-FR'). If not provided, uses en-US.
 *                   Note: For React components, use the useDateFormatters hook instead for automatic locale detection.
 * @example
 * formatDate("2025-01-10T00:00:00Z") // "January 10, 2025"
 * formatDate("2025-01-10T00:00:00Z", "fr-FR") // "10 janvier 2025"
 */
export function formatDate(isoDateStr: string, language?: string): string {
  try {
    const date = new Date(isoDateStr);
    if (isNaN(date.getTime())) {
      return 'Unknown date';
    }

    const locale = language ? getDateLocaleSync(language) : undefined;
    return format(date, 'PPP', { locale });
  } catch (error) {
    return 'Unknown date';
  }
}

/**
 * Format version string (remove leading 'v' if present)
 * @example
 * formatVersion("v1.2.3") // "1.2.3"
 * formatVersion("2023.6.0") // "2023.6.0"
 */
export function formatVersion(version: string): string {
  return version.replace(/^v/, '');
}
