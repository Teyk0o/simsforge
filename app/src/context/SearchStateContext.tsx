'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useSearchState as useSearchStateHook, SortOption, FilterChip } from '@/hooks/useSearchState';

interface SearchStateContextType {
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
  setSearchQuery: (query: string) => void;
  setActiveSort: (sort: SortOption) => void;
  setActiveFilter: (filter: FilterChip) => void;
  setSelectedCategory: (category: string) => void;
  setScrollIndex: (index: number) => void;
  setPageIndex: (index: number) => void;
  setPreviousSort: (sort: SortOption) => void;
  resetScrollIndex: () => void;
  setCacheKey: (key: string) => void;
  clearCache: () => void;
  setCachedModsCount: (count: number) => void;
  isLoaded: boolean;
}

const SearchStateContext = createContext<SearchStateContextType | undefined>(undefined);

export function SearchStateProvider({ children }: { children: ReactNode }) {
  const searchState = useSearchStateHook();

  return (
    <SearchStateContext.Provider value={searchState}>
      {children}
    </SearchStateContext.Provider>
  );
}

export function useSearchState(): SearchStateContextType {
  const context = useContext(SearchStateContext);
  if (!context) {
    throw new Error('useSearchState must be used within SearchStateProvider');
  }
  return context;
}
