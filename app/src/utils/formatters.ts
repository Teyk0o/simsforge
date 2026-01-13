/**
 * Utility functions for formatting data in the UI
 */

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
 * @example
 * formatRelativeDate("2025-01-05T00:00:00Z") // "5d ago"
 * formatRelativeDate("2024-06-10T00:00:00Z") // "Jun 10, 2024"
 */
export function formatRelativeDate(isoDateStr: string): string {
  try {
    const date = new Date(isoDateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 60) {
      return `${diffMins}m ago`;
    }
    if (diffMins < 1440) {
      return `${Math.floor(diffMins / 60)}h ago`;
    }
    if (diffMins < 43200) {
      return `${Math.floor(diffMins / 1440)}d ago`;
    }

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
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
 * @example
 * formatDate("2025-01-10T00:00:00Z") // "January 10, 2025"
 */
export function formatDate(isoDateStr: string): string {
  try {
    const date = new Date(isoDateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
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
