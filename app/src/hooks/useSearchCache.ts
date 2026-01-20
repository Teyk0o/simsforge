/**
 * Hook for fetching and managing cached search results from the API
 * Used to restore search results when navigating back
 */

import { useCallback, useState } from 'react';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export interface CachedSearchResult {
  mods: any[];
  totalCount: number;
  pageCount: number;
  timestamp: number;
  expiresAt: number;
  isExpired: boolean;
}

/**
 * Custom hook for search cache restoration
 * Fetches cached search results from the backend API
 *
 * @returns Object with fetch function and loading states
 */
export function useSearchCache() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetches cached search results from the API
   * @param cacheKey - The cache key returned from previous search
   * @returns Promise resolving to cached search result or null if expired/not found
   */
  const fetchCachedMods = useCallback(async (cacheKey: string): Promise<CachedSearchResult | null> => {
    if (!cacheKey) {
      setError('Cache key is required');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${BACKEND_URL}/api/v1/cache/search/${cacheKey}`);

      if (!response.ok) {
        if (response.status === 404) {
          console.debug('Cache expired or not found');
          return null;
        }
        throw new Error(`Failed to fetch cache: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success && data.error) {
        console.warn(`Cache fetch error: ${data.error}`);
        return null;
      }

      // Extract the cached result from response
      const cached: CachedSearchResult = {
        mods: data.mods || [],
        totalCount: data.totalCount || 0,
        pageCount: data.pageCount || 0,
        timestamp: data.timestamp || Date.now(),
        expiresAt: data.expiresAt || Date.now(),
        isExpired: data.isExpired || false
      };

      if (cached.isExpired) {
        console.debug('Cache has expired');
        return null;
      }

      console.debug(`Cache hit: ${cached.mods.length} mods loaded`);
      return cached;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      console.error('Error fetching cached mods:', errorMsg);
      setError(errorMsg);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Saves search results to cache via API
   * @param query - Search query
   * @param sortBy - Sort order
   * @param filter - Active filter
   * @param category - Selected category
   * @param mods - Array of mod results
   * @param totalCount - Total results available
   * @param pageCount - Total pages
   * @returns Promise resolving to cache key and expiration info
   */
  const saveSearchToCache = useCallback(
    async (
      query: string | undefined,
      sortBy: string,
      filter: string,
      category: string | undefined,
      mods: any[],
      totalCount: number,
      pageCount: number
    ): Promise<{ cacheKey: string; expiresIn: number; timestamp: number } | null> => {
      if (!mods || mods.length === 0) {
        return null;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`${BACKEND_URL}/api/v1/cache/search`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            query,
            sortBy,
            filter,
            category,
            mods,
            totalCount,
            pageCount
          })
        });

        if (!response.ok) {
          throw new Error(`Failed to save cache: ${response.statusText}`);
        }

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'Failed to save cache');
        }

        console.debug(`Cache saved with key: ${data.cacheKey}`);
        return {
          cacheKey: data.cacheKey,
          expiresIn: data.expiresIn,
          timestamp: data.timestamp
        };
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        console.warn('Error saving search to cache:', errorMsg);
        setError(errorMsg);
        // Don't throw - graceful degradation if cache save fails
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return {
    fetchCachedMods,
    saveSearchToCache,
    isLoading,
    error
  };
}
