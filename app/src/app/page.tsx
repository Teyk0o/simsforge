'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Spinner } from '@phosphor-icons/react';
import { useAuth } from '@/context/AuthContext';
import { useDebounce } from '@/hooks/useDebounce';
import { useViewMode } from '@/hooks/useViewMode';
import Layout from '@/components/layouts/Layout';
import ModList from '@/components/mod/ModList';
import FilterBar from '@/components/mod/FilterBar';

type SortOption = 'downloads' | 'date' | 'trending' | 'relevance';
type FilterChip = 'all' | 'updates' | 'early-access' | 'installed';

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const { viewMode, toggleViewMode } = useViewMode();
  const [activeSort, setActiveSort] = useState<SortOption>('trending');
  const [activeFilter, setActiveFilter] = useState<FilterChip>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [previousSort, setPreviousSort] = useState<SortOption>('trending');

  // Debounce search query to avoid spamming API while user types
  // API call will only trigger 500ms after user stops typing
  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  // Auto-switch to 'relevance' sort when user types a search query
  // and restore previous sort when search is cleared
  useEffect(() => {
    if (searchQuery.trim().length > 0 && activeSort !== 'relevance') {
      // User is typing - save current sort and switch to relevance
      setPreviousSort(activeSort);
      setActiveSort('relevance');
    } else if (searchQuery.trim().length === 0 && activeSort === 'relevance') {
      // Search cleared - restore previous sort
      setActiveSort(previousSort);
    }
  }, [searchQuery, activeSort, previousSort]);

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isLoading, isAuthenticated, router]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-ui-dark to-gray-900">
        <div className="flex flex-col items-center gap-4">
          <Spinner size={48} className="animate-spin text-brand-green" />
          <p className="text-gray-400">Chargement...</p>
        </div>
      </div>
    );
  }

  // Don't render anything if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  return (
    <Layout>
      <main className="flex-1 flex flex-col min-w-0 bg-gray-50 dark:bg-ui-dark relative">
        {/* Header avec search */}
        <header className="h-16 flex items-center justify-between px-8 border-b border-gray-200 dark:border-ui-border bg-white dark:bg-ui-panel shrink-0 z-10">
          <div className="flex-1 max-w-xl relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Rechercher des mods..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-100 dark:bg-ui-dark border-none text-gray-900 dark:text-gray-200 rounded-full text-sm py-2.5 pl-10 pr-4 focus:ring-2 focus:ring-brand-green transition-all placeholder-gray-500"
            />
          </div>
          <div className="flex items-center gap-4 ml-4">
            <button className="text-gray-500 hover:text-brand-green transition-colors">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </button>
            <button className="text-gray-500 hover:text-brand-green transition-colors">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="1" />
                <circle cx="12" cy="5" r="1" />
                <circle cx="12" cy="19" r="1" />
              </svg>
            </button>
          </div>
        </header>

        {/* Filter Bar */}
        <FilterBar
          onSortChange={setActiveSort}
          activeSort={activeSort}
          onFilterChange={setActiveFilter}
          activeFilter={activeFilter}
          onCategoryChange={setSelectedCategory}
          selectedCategory={selectedCategory}
          viewMode={viewMode}
          onViewModeChange={toggleViewMode}
        />

        {/* Mod List */}
        <ModList searchQuery={debouncedSearchQuery} sortBy={activeSort} category={selectedCategory} viewMode={viewMode} />
      </main>
    </Layout>
  );
}
