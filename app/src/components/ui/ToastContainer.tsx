/**
 * Toast Container Component
 *
 * Displays toast notifications at the bottom-right of the screen
 */

'use client';

import React from 'react';
import { useToast, Toast } from '@/context/ToastContext';
import { CheckCircle, Warning, Info, X, DownloadSimple, XCircle } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';

export default function ToastContainer() {
  const { toasts, dismissToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={() => dismissToast(toast.id)} />
      ))}
    </div>
  );
}

interface ToastItemProps {
  toast: Toast;
  onDismiss: () => void;
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const { t } = useTranslation();
  const { type, title, message, progress } = toast;

  // Determine icon and colors based on type
  const getToastStyle = () => {
    switch (type) {
      case 'success':
        return {
          icon: <CheckCircle size={20} weight="fill" />,
          bgColor: 'bg-green-600',
          borderColor: 'border-green-500',
          textColor: 'text-white',
        };
      case 'error':
        return {
          icon: <XCircle size={20} weight="fill" />,
          bgColor: 'bg-red-600',
          borderColor: 'border-red-500',
          textColor: 'text-white',
        };
      case 'warning':
        return {
          icon: <Warning size={20} weight="fill" />,
          bgColor: 'bg-amber-600',
          borderColor: 'border-amber-500',
          textColor: 'text-white',
        };
      case 'download':
        return {
          icon: <DownloadSimple size={20} weight="fill" />,
          bgColor: 'bg-brand-green',
          borderColor: 'border-brand-green',
          textColor: 'text-white',
        };
      case 'info':
      default:
        return {
          icon: <Info size={20} weight="fill" />,
          bgColor: 'bg-blue-600',
          borderColor: 'border-blue-500',
          textColor: 'text-white',
        };
    }
  };

  const style = getToastStyle();

  return (
    <div
      className={`${style.bgColor} ${style.borderColor} ${style.textColor} border rounded-lg shadow-lg p-4 min-w-[320px] animate-slide-in-right`}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 mt-0.5">{style.icon}</div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-sm">{title}</h4>
          {message && <p className="text-xs mt-1 opacity-90">{message}</p>}

          {/* Progress bar for downloads */}
          {type === 'download' && progress !== undefined && (
            <div className="mt-2 h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>

        {/* Close button */}
        <button
          onClick={onDismiss}
          className="flex-shrink-0 hover:opacity-70 transition-opacity"
          aria-label={t('common.dismiss')}
        >
          <X size={16} weight="bold" />
        </button>
      </div>
    </div>
  );
}
