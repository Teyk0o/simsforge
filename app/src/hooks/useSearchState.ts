/**
 * Hook for managing search/filter state with sessionStorage persistence
 *
 * Preserves search state across navigation (back button support)
 * Also tracks scroll position for restoration
 */

import { useState, useCallback, useEffect } from 'react';

export type SortOption = 'downloads' | 'date' | 'trending' | 'relevance';
export type FilterChip = 'all' | 'updates' | 'early-access' | 'installed';

interface SearchState {
  searchQuery: string;
  activeSort: SortOption;
  activeFilter: FilterChip;
  selectedCategory: string;
  scrollIndex: number;
  pageIndex: number;
  previousSort: SortOption;
  cacheKey?: string;
  cacheTimestamp?: number;
  cachedModsCount?: number;
}

const STORAGE_KEY = 'simsforge_search_state';

const DEFAULT_STATE: SearchState = {
  searchQuery: '',
  activeSort: 'trending',
  activeFilter: 'all',
  selectedCategory: '',
  scrollIndex: 0,
  pageIndex: 0,
  previousSort: 'trending',
};

/**
 * Custom hook to manage and persist search/filter state
 * Loads from sessionStorage on client side to avoid hydration mismatches
 *
 * @returns Object with search state, setters, and hydration flag
 */
export function useSearchState() {
  const [state, setState] = useState<SearchState>(DEFAULT_STATE);
  const [isLoaded, setIsLoaded] = useState(false);

  /**
   * Load persisted search state from sessionStorage on client side
   * Essential for SSR hydration safety
   */
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<SearchState>;
        // Validate that parsed data has the expected shape
        const validated: SearchState = {
          ...DEFAULT_STATE,
          ...parsed,
        };
        setState(validated);
      }
    } catch (error) {
      // Silently fail and keep default state
      console.debug('Failed to load search state from sessionStorage', error);
    }
    setIsLoaded(true);
  }, []);

  /**
   * Persist state to sessionStorage on change
   */
  useEffect(() => {
    if (isLoaded) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }, [state, isLoaded]);

  /**
   * Set search query
   */
  const setSearchQuery = useCallback((query: string) => {
    setState((prev) => ({ ...prev, searchQuery: query }));
  }, []);

  /**
   * Set active sort option
   */
  const setActiveSort = useCallback((sort: SortOption) => {
    setState((prev) => ({ ...prev, activeSort: sort }));
  }, []);

  /**
   * Set active filter chip
   */
  const setActiveFilter = useCallback((filter: FilterChip) => {
    setState((prev) => ({ ...prev, activeFilter: filter }));
  }, []);

  /**
   * Set selected category
   */
  const setSelectedCategory = useCallback((category: string) => {
    setState((prev) => ({ ...prev, selectedCategory: category }));
  }, []);

  /**
   * Set scroll index for restoration
   */
  const setScrollIndex = useCallback((index: number) => {
    setState((prev) => ({ ...prev, scrollIndex: index }));
  }, []);

  /**
   * Set page index (number of pages loaded)
   */
  const setPageIndex = useCallback((index: number) => {
    setState((prev) => ({ ...prev, pageIndex: index }));
  }, []);

  /**
   * Set previous sort (for relevance auto-switch)
   */
  const setPreviousSort = useCallback((sort: SortOption) => {
    setState((prev) => ({ ...prev, previousSort: sort }));
  }, []);

  /**
   * Reset scroll and page position (when search/filter changes)
   */
  const resetScrollIndex = useCallback(() => {
    setState((prev) => ({ ...prev, scrollIndex: 0, pageIndex: 0 }));
  }, []);

  /**
   * Set cache key for search result restoration
   */
  const setCacheKey = useCallback((key: string) => {
    setState((prev) => ({ ...prev, cacheKey: key, cacheTimestamp: Date.now() }));
  }, []);

  /**
   * Clear cache key (when filter/sort changes)
   */
  const clearCache = useCallback(() => {
    setState((prev) => ({ ...prev, cacheKey: undefined, cacheTimestamp: undefined, cachedModsCount: undefined }));
  }, []);

  /**
   * Set cached mods count for tracking
   */
  const setCachedModsCount = useCallback((count: number) => {
    setState((prev) => ({ ...prev, cachedModsCount: count }));
  }, []);

  return {
    searchQuery: state.searchQuery,
    activeSort: state.activeSort,
    activeFilter: state.activeFilter,
    selectedCategory: state.selectedCategory,
    scrollIndex: state.scrollIndex,
    pageIndex: state.pageIndex,
    previousSort: state.previousSort,
    cacheKey: state.cacheKey,
    cacheTimestamp: state.cacheTimestamp,
    cachedModsCount: state.cachedModsCount,
    setSearchQuery,
    setActiveSort,
    setActiveFilter,
    setSelectedCategory,
    setScrollIndex,
    setPageIndex,
    setPreviousSort,
    resetScrollIndex,
    setCacheKey,
    clearCache,
    setCachedModsCount,
    isLoaded,
  };
}
