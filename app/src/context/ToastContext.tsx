/**
 * Toast Notification Context
 *
 * Provides a global toast notification system for the app
 * Used for download progress, success/error messages, etc.
 */

'use client';

import React, { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';

export type ToastType = 'info' | 'success' | 'error' | 'warning' | 'download';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  progress?: number; // 0-100 for download progress
  duration?: number; // Auto-dismiss after X ms (0 = no auto-dismiss)
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (toast: Omit<Toast, 'id'>) => string;
  updateToast: (id: string, updates: Partial<Omit<Toast, 'id'>>) => void;
  dismissToast: (id: string) => void;
  clearAll: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  /**
   * Dismiss a toast notification
   */
  const dismissToast = useCallback((id: string) => {
    // Clear timer if exists
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  /**
   * Show a new toast notification
   * Returns the toast ID for later updates
   */
  const showToast = useCallback((toast: Omit<Toast, 'id'>): string => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newToast: Toast = {
      id,
      ...toast,
      duration: toast.duration ?? 3000, // Default 3 seconds
    };

    setToasts((prev) => [...prev, newToast]);

    // Auto-dismiss after duration (if not 0)
    if (newToast.duration && newToast.duration > 0) {
      const timer = setTimeout(() => {
        dismissToast(id);
      }, newToast.duration);
      timersRef.current.set(id, timer);
    }

    return id;
  }, [dismissToast]);

  /**
   * Update an existing toast (useful for download progress)
   * Handles duration changes by clearing old timers and creating new ones
   */
  const updateToast = useCallback((id: string, updates: Partial<Omit<Toast, 'id'>>) => {
    setToasts((prev) => {
      const updatedToasts = prev.map((toast) =>
        toast.id === id ? { ...toast, ...updates } : toast
      );

      // If duration was updated, handle timer changes
      if ('duration' in updates) {
        const newDuration = updates.duration;

        // Clear old timer
        const oldTimer = timersRef.current.get(id);
        if (oldTimer) {
          clearTimeout(oldTimer);
          timersRef.current.delete(id);
        }

        // Set new timer if duration > 0
        if (newDuration && newDuration > 0) {
          const timer = setTimeout(() => {
            dismissToast(id);
          }, newDuration);
          timersRef.current.set(id, timer);
        }
      }

      return updatedToasts;
    });
  }, [dismissToast]);

  /**
   * Clear all toasts
   */
  const clearAll = useCallback(() => {
    // Clear all timers
    timersRef.current.forEach((timer) => clearTimeout(timer));
    timersRef.current.clear();
    setToasts([]);
  }, []);

  return (
    <ToastContext.Provider
      value={{
        toasts,
        showToast,
        updateToast,
        dismissToast,
        clearAll,
      }}
    >
      {children}
    </ToastContext.Provider>
  );
}

/**
 * Hook to use toast notifications
 */
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
