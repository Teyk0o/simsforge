/**
 * Hook for managing mod list view mode preference
 *
 * Provides view mode state (list or grid) with localStorage persistence
 * Hydration-safe for Next.js SSR
 */

import { useState, useCallback, useEffect } from 'react';

export type ViewMode = 'list' | 'grid';

/**
 * Custom hook to manage and persist the mod listing view mode
 * Loads from localStorage on client side to avoid hydration mismatches
 *
 * @returns Object with viewMode state, toggle function, and hydration flag
 */
export function useViewMode() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [isLoaded, setIsLoaded] = useState(false);

  /**
   * Load persisted view mode from localStorage on client side
   * Essential for SSR hydration safety
   */
  useEffect(() => {
    const stored = localStorage.getItem('simsforge_view_mode');
    if (stored === 'grid' || stored === 'list') {
      setViewMode(stored);
    }
    setIsLoaded(true);
  }, []);

  /**
   * Toggle view mode and persist to localStorage
   */
  const toggleViewMode = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem('simsforge_view_mode', mode);
  }, []);

  return { viewMode, toggleViewMode, isLoaded };
}
