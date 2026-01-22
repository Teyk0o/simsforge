'use client';

import { Warning } from '@phosphor-icons/react';
import type { ModWarningStatus } from '@/types/fakeDetection';

interface WarningBadgeProps {
  /** Warning status from the backend */
  status: ModWarningStatus;
  /** Badge size: sm for cards, md for detail pages, lg for prominent display */
  size?: 'sm' | 'md' | 'lg';
  /** Whether to show text alongside the icon */
  showText?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Warning badge component for displaying mod warning status
 * Shows in mod cards, list items, and detail pages
 */
export default function WarningBadge({
  status,
  size = 'md',
  showText = false,
  className = '',
}: WarningBadgeProps) {
  // Don't render if no warning and creator not banned
  if (!status.hasWarning && !status.creatorBanned) {
    return null;
  }

  // Size configurations
  const sizeClasses: Record<string, string> = {
    sm: 'text-xs px-1.5 py-0.5 gap-0.5',
    md: 'text-sm px-2 py-1 gap-1',
    lg: 'text-base px-3 py-1.5 gap-1.5',
  };

  const iconSizes: Record<string, number> = {
    sm: 12,
    md: 16,
    lg: 20,
  };

  // Determine warning text based on status
  const getWarningText = (): string => {
    if (status.creatorBanned) {
      return 'Banned Creator';
    }
    if (status.isAutoWarned) {
      return 'Suspicious';
    }
    return `${status.reportCount} Reports`;
  };

  // Determine tooltip text
  const getTooltipText = (): string => {
    if (status.warningReason) {
      return status.warningReason;
    }
    if (status.creatorBanned) {
      return 'This creator has been banned due to multiple fake mods';
    }
    return `This mod has been reported by ${status.reportCount} users`;
  };

  // Determine color based on severity
  const backgroundColor = status.creatorBanned ? '#ef4444' : '#f59e0b';

  return (
    <div
      className={`inline-flex items-center rounded-full font-medium ${sizeClasses[size]} ${className}`}
      style={{
        backgroundColor,
        color: 'white',
      }}
      title={getTooltipText()}
    >
      <Warning size={iconSizes[size]} weight="fill" />
      {showText && <span>{getWarningText()}</span>}
    </div>
  );
}
