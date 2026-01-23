'use client';

import React, { useState } from 'react';
import { Warning, X, Flag, DownloadSimple } from '@phosphor-icons/react';
import type { FakeScoreResult } from '@/types/fakeDetection';

interface FakeModWarningPopupProps {
  /** Whether the popup is visible */
  isOpen: boolean;
  /** Callback when popup is closed without action */
  onClose: () => void;
  /** Callback when user chooses to install anyway */
  onInstallAnyway: () => void;
  /** Callback when user chooses to report and cancel */
  onReportAndCancel: (reason: string) => void;
  /** Name of the mod being installed */
  modName: string;
  /** Fake score calculation result */
  scoreResult: FakeScoreResult;
  /** Whether a report is being submitted */
  isSubmitting?: boolean;
}

/**
 * Popup shown when a suspicious mod is detected during installation
 * Allows user to install anyway or report and cancel
 */
export default function FakeModWarningPopup({
  isOpen,
  onClose,
  onInstallAnyway,
  onReportAndCancel,
  modName,
  scoreResult,
  isSubmitting = false,
}: FakeModWarningPopupProps) {
  const [reportReason, setReportReason] = useState('');
  const [showReportInput, setShowReportInput] = useState(false);
  const [installHover, setInstallHover] = useState(false);
  const [reportHover, setReportHover] = useState(false);

  if (!isOpen) return null;

  const handleReportAndCancel = () => {
    const reason = reportReason.trim() || scoreResult.reasons.join('; ');
    onReportAndCancel(reason);
  };

  const handleClose = () => {
    setShowReportInput(false);
    setReportReason('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
      onClick={handleClose}
    >
      <div
        className="rounded-xl shadow-2xl max-w-md w-full border"
        style={{
          backgroundColor: 'var(--ui-panel)',
          borderColor: '#f59e0b',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-4 border-b"
          style={{ borderColor: 'var(--border-color)', backgroundColor: 'rgba(245, 158, 11, 0.1)' }}
        >
          <div className="flex items-center gap-3">
            <Warning size={28} weight="fill" color="#f59e0b" />
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              Suspicious Mod Detected
            </h2>
          </div>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="p-1 rounded transition-colors hover:bg-white/10 cursor-pointer disabled:cursor-not-allowed"
            style={{ color: 'var(--text-secondary)' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--text-primary)' }}>{modName}</strong> has been
            flagged as potentially fake or misleading.
          </p>

          {/* Score and Reasons */}
          <div
            className="rounded-lg p-3"
            style={{ backgroundColor: 'var(--ui-hover)' }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                Suspicion Score
              </span>
              <span
                className="text-lg font-bold"
                style={{ color: scoreResult.score >= 50 ? '#ef4444' : '#f59e0b' }}
              >
                {scoreResult.score}/100
              </span>
            </div>
            <ul className="space-y-1">
              {scoreResult.reasons.map((reason, index) => (
                <li
                  key={index}
                  className="text-xs flex items-start gap-2"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <span style={{ color: '#f59e0b' }}>•</span>
                  {reason}
                </li>
              ))}
            </ul>
          </div>

          {/* Report Input (optional) */}
          {showReportInput && (
            <div>
              <label
                className="text-sm mb-1 block"
                style={{ color: 'var(--text-secondary)' }}
              >
                Additional details (optional):
              </label>
              <textarea
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder="Add any additional information about why this mod seems fake..."
                className="w-full rounded-lg p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-500"
                style={{
                  backgroundColor: 'var(--ui-dark)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                }}
                rows={3}
                disabled={isSubmitting}
              />
            </div>
          )}
        </div>

        {/* Actions */}
        <div
          className="flex flex-col gap-2 p-4 border-t"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <button
            onClick={onInstallAnyway}
            disabled={isSubmitting}
            onMouseEnter={() => setInstallHover(true)}
            onMouseLeave={() => setInstallHover(false)}
            className="w-full px-4 py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            style={{
              backgroundColor: 'var(--ui-hover)',
              color: 'var(--text-primary)',
              opacity: isSubmitting ? 0.5 : 1,
              filter: installHover && !isSubmitting ? 'brightness(1.2)' : 'brightness(1)',
              transition: 'filter 0.2s ease-in-out',
            }}
          >
            <DownloadSimple size={18} />
            Install Anyway
          </button>

          <button
            onClick={() => {
              if (showReportInput) {
                handleReportAndCancel();
              } else {
                setShowReportInput(true);
              }
            }}
            disabled={isSubmitting}
            onMouseEnter={() => setReportHover(true)}
            onMouseLeave={() => setReportHover(false)}
            className="w-full px-4 py-2.5 rounded-lg font-medium text-white flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            style={{
              backgroundColor: '#ef4444',
              opacity: isSubmitting ? 0.5 : 1,
              filter: reportHover && !isSubmitting ? 'brightness(1.2)' : 'brightness(1)',
              transition: 'filter 0.2s ease-in-out',
            }}
          >
            <Flag size={18} />
            {isSubmitting
              ? 'Submitting...'
              : showReportInput
                ? 'Submit Report & Cancel'
                : 'Report and Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
}
