'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Virtuoso } from 'react-virtuoso';
import ModListItem from '@/components/mod/ModListItem';
import ModGridRow from '@/components/mod/ModGridRow';
import { searchCurseForgeMods } from '@/lib/curseforgeApi';
import { CurseForgeMod } from '@/types/curseforge';
import { ViewMode } from '@/hooks/useViewMode';
import { useAuth } from '@/context/AuthContext';
import { useSearchState } from '@/hooks/useSearchState';

interface ModListProps {
  searchQuery: string;
  sortBy: 'downloads' | 'date' | 'trending' | 'relevance';
  category?: string;
  viewMode: ViewMode;
  activeFilter?: 'all' | 'updates' | 'early-access' | 'installed';
}

interface PaginationState {
  index: number;
  pageSize: number;
  resultCount: number;
  totalCount: number;
}

export default function ModList({ searchQuery, sortBy, category, viewMode, activeFilter = 'all' }: ModListProps) {
  const { isLoading: authLoading } = useAuth();
  const searchState = useSearchState();
  const [mods, setMods] = useState<CurseForgeMod[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationState>({
    index: 0,
    pageSize: 50,
    resultCount: 0,
    totalCount: 0,
  });
  const [hasMore, setHasMore] = useState(true);
  const [gridColumns, setGridColumns] = useState(4);
  const loaderRef = useRef<HTMLDivElement>(null);
  const paginationRef = useRef<PaginationState>(pagination);
  const listRef = useRef<any>(null);

  /**
   * Calculate number of grid columns based on viewport width
   */
  useEffect(() => {
    const updateGridColumns = () => {
      const width = window.innerWidth;
      // xs/sm: 1, sm/md: 2, md/lg: 3, lg/xl: 4, xl/2xl: 5
      if (width < 640) setGridColumns(1);
      else if (width < 1024) setGridColumns(2);
      else if (width < 1280) setGridColumns(3);
      else if (width < 1536) setGridColumns(4);
      else setGridColumns(5);
    };

    updateGridColumns();
    window.addEventListener('resize', updateGridColumns);
    return () => window.removeEventListener('resize', updateGridColumns);
  }, []);

  // Keep ref updated
  useEffect(() => {
    paginationRef.current = pagination;
  }, [pagination]);

  /**
   * Group mods into rows for grid view
   * Each row contains `gridColumns` number of mods
   */
  const gridRows = useMemo(() => {
    const rows: CurseForgeMod[][] = [];
    for (let i = 0; i < mods.length; i += gridColumns) {
      rows.push(mods.slice(i, i + gridColumns));
    }
    return rows;
  }, [mods, gridColumns]);

  // Convert UI sort names to API sort names
  const getSortByForAPI = () => {
    switch (sortBy) {
      case 'relevance':
        return 'relevance';
      case 'trending':
        return 'popularity';
      case 'date':
        return 'date';
      case 'downloads':
      default:
        return 'downloads';
    }
  };

  // TODO: Implement cache restoration properly
  // Disabled for now due to dependency issues

  const fetchModsForPage = useCallback(async (pageIndex: number) => {
    if (pageIndex === 0) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }

    const apiParams = {
      query: searchQuery || undefined,
      pageSize: 50,
      pageIndex,
      sortBy: getSortByForAPI() as 'downloads' | 'date' | 'popularity' | 'relevance',
      categoryName: category || undefined,
    };

    try {
      const result = await searchCurseForgeMods(apiParams);

      setMods((prev) => (pageIndex === 0 ? result.mods : [...prev, ...result.mods]));

      setPagination({
        index: pageIndex,
        pageSize: 50,
        resultCount: result.pagination.resultCount,
        totalCount: result.pagination.totalCount,
      });

      // Check if there are more pages
      const loadedCount = (pageIndex + 1) * 50;
      setHasMore(loadedCount < result.pagination.totalCount);

      // TODO: Save first page to cache for future restoration
      // Disabled for now to prevent infinite re-render loop
      // Will implement with better state management later
      // if (pageIndex === 0) {
      //   saveSearchToCache(...).then(...).catch(...);
      // }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to load mods';
      setError(errorMessage);
      if (pageIndex === 0) setMods([]);
    } finally {
      if (pageIndex === 0) {
        setIsLoading(false);
      } else {
        setIsLoadingMore(false);
      }
    }
  }, [searchQuery, sortBy, category, activeFilter]);

  // Load first page when query or sort changes
  useEffect(() => {
    setMods([]);
    setPagination({
      index: 0,
      pageSize: 50,
      resultCount: 0,
      totalCount: 0,
    });
    setError(null);
    setHasMore(true);

    fetchModsForPage(0);
  }, [searchQuery, sortBy, category || '', activeFilter]);

  // Virtualized infinite scroll - load when approaching end
  const handleRowsRendered = useCallback(
    (visibleRows: any, allRows: any) => {
      // Use gridRows for grid view, mods for list view
      const totalRows = viewMode === 'grid' ? gridRows.length : mods.length;
      const { stopIndex } = visibleRows;

      // Trigger load when we're in the last 10 items
      if (stopIndex >= totalRows - 10 && hasMore && !isLoadingMore) {
        const nextPageIndex = paginationRef.current.index + 1;
        fetchModsForPage(nextPageIndex).catch((err) => {
          setError('Failed to load more mods');
        });
      }
    },
    [hasMore, isLoadingMore, fetchModsForPage, mods.length, viewMode, gridRows.length]
  );

  /**
   * Handle scroll position changes to save current state
   */
  // TODO: Implement scroll position tracking
  // Disabled for now due to re-render loop issues
  // const handleScrollIndexChange = useCallback(
  //   (index: number) => {
  //     if (viewMode === 'list') {
  //       searchState.setScrollIndex(index);
  //     }
  //   },
  //   [viewMode, searchState]
  // );


  // Loading state for first load
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-gray-700 border-t-green-600 rounded-full animate-spin" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md rounded-lg p-8 border" style={{ backgroundColor: 'var(--ui-panel)', borderColor: 'var(--ui-border)' }}>
          <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Error</h3>
          <p className="text-red-200 mb-4" style={{ color: 'var(--text-secondary)' }}>{error}</p>
          <button
            onClick={() => fetchModsForPage(0)}
            className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded font-medium text-white transition"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Calculate row heights
  const listRowHeight = 96; // 80px for item + 16px for spacing
  const gridRowHeight = 400; // Height for grid row (cards with image + content + padding)

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      {/* Column Headers - Only for list view */}
      {viewMode === 'list' && (
        <div className="flex-shrink-0 grid grid-cols-12 gap-4 px-4 lg:px-8 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider bg-gray-50 border-b" style={{ backgroundColor: 'var(--ui-dark)', color: 'var(--text-secondary)', borderColor: 'var(--ui-border)' }}>
          <div className="col-span-6 lg:col-span-5">Mod</div>
          <div className="col-span-3 lg:col-span-2 hidden md:block">Catégories</div>
          <div className="col-span-2 hidden lg:block">Téléchargements</div>
          <div className="col-span-3 lg:col-span-2 hidden lg:block text-right">Dernière MAJ</div>
          <div className="col-span-6 md:col-span-3 lg:col-span-1 text-right" />
        </div>
      )}

      {/* Virtualized List / Grid */}
      {mods.length > 0 ? (
        viewMode === 'list' ? (
          // LIST VIEW - Virtualized with Virtuoso
          <Virtuoso
            ref={listRef}
            data={mods}
            style={{ height: '100%' }}
            itemContent={(index, mod) => (
              <div className="px-4 lg:px-8 py-2">
                <ModListItem mod={mod} />
              </div>
            )}
            endReached={() => {
              if (hasMore && !isLoadingMore) {
                const nextPageIndex = paginationRef.current.index + 1;
                fetchModsForPage(nextPageIndex).catch(() => {
                  setError('Failed to load more mods');
                });
              }
            }}
            overscan={10}
          />
        ) : (
          // GRID VIEW - Virtualized with Virtuoso
          <Virtuoso
            ref={listRef}
            data={gridRows}
            style={{ height: '100%' }}
            itemContent={(index, row) => (
              <ModGridRow mods={row} index={index} columns={gridColumns} />
            )}
            endReached={() => {
              if (hasMore && !isLoadingMore) {
                const nextPageIndex = paginationRef.current.index + 1;
                fetchModsForPage(nextPageIndex).catch(() => {
                  setError('Failed to load more mods');
                });
              }
            }}
            overscan={10}
          />
        )
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center py-12 text-gray-500">
            <p>Aucun mod trouvé correspondant à votre recherche.</p>
          </div>
        </div>
      )}

    </div>
  );
}
