'use client';

import React from 'react';
import { X, Warning } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDangerous?: boolean;
  isLoading?: boolean;
}

/**
 * Reusable confirmation modal component
 * Used for confirming destructive actions like deleting mods
 */
export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText,
  isDangerous = false,
  isLoading = false,
}: ConfirmationModalProps) {
  const { t } = useTranslation();

  if (!isOpen) return null;

  const finalConfirmText = confirmText || t('common.confirm');
  const finalCancelText = cancelText || t('common.cancel');

  const handleConfirm = async () => {
    await onConfirm();
  };

  const confirmButtonColor = isDangerous ? '#ef4444' : '#46C89B';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={onClose}
    >
      <div
        className="rounded-lg shadow-xl max-w-sm w-full border"
        style={{
          backgroundColor: 'var(--ui-panel)',
          borderColor: 'var(--border-color)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-4 border-b"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <div className="flex items-center gap-3">
            {isDangerous && (
              <Warning size={24} weight="fill" color="#ef4444" />
            )}
            <h2
              className="text-lg font-bold"
              style={{ color: 'var(--text-primary)' }}
            >
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-1 rounded transition-colors cursor-pointer"
            style={{
              color: 'var(--text-secondary)',
              opacity: isLoading ? 0.5 : 1,
              cursor: isLoading ? 'not-allowed' : 'pointer',
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.currentTarget.style.color = '#ef4444';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <p
            className="text-sm leading-relaxed"
            style={{ color: 'var(--text-secondary)' }}
          >
            {message}
          </p>
        </div>

        {/* Buttons */}
        <div
          className="flex gap-2 p-4 border-t"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2 rounded transition-colors font-medium cursor-pointer"
            style={{
              backgroundColor: 'var(--ui-hover)',
              color: 'var(--text-primary)',
              opacity: isLoading ? 0.5 : 1,
              cursor: isLoading ? 'not-allowed' : 'pointer',
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.currentTarget.style.opacity = '0.8';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = isLoading ? '0.5' : '1';
            }}
          >
            {finalCancelText}
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className="flex-1 px-4 py-2 rounded transition-colors font-medium text-white cursor-pointer"
            style={{
              backgroundColor: confirmButtonColor,
              opacity: isLoading ? 0.5 : 1,
              cursor: isLoading ? 'not-allowed' : 'pointer',
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                const hoverColor = isDangerous ? '#dc2626' : '#3fb889';
                e.currentTarget.style.backgroundColor = hoverColor;
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = confirmButtonColor;
            }}
          >
            {isLoading ? t('common.processing') : finalConfirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
