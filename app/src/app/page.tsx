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
  const [isMounted, setIsMounted] = useState(false);
  const [activeSort, setActiveSort] = useState<SortOption>('trending');
  const [activeFilter, setActiveFilter] = useState<FilterChip>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [previousSort, setPreviousSort] = useState<SortOption>('trending');

  useEffect(() => {
    setIsMounted(true);
  }, []);

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
  if (isMounted && isLoading) {
    return (
        <div
          className="h-screen flex items-center justify-center"
          style={{
            background: `linear-gradient(to bottom right, #111827, var(--ui-dark), #111827)`,
          }}
        >
          <div className="flex flex-col items-center gap-4">
            <Spinner size={48} className="animate-spin text-brand-green" />
            <p style={{ color: 'var(--text-secondary)' }}>Chargement...</p>
          </div>
        </div>
    );
  }

  // Don't render anything if not authenticated
  if (isMounted && !isAuthenticated) {
    return null;
  }

  // Render empty while mounting
  if (!isMounted) {
    return null;
  }

  return (
      <Layout>
        <main
          className="flex-1 flex flex-col min-w-0 relative"
          style={{
            backgroundColor: 'var(--bg-primary)',
          }}
        >
          {/* Header avec search */}
          <header
            className="h-16 flex items-center justify-between px-8 border-b shrink-0 z-10"
            style={{
              borderColor: 'var(--border-color)',
              backgroundColor: 'var(--ui-panel)',
            }}
          >
            <div className="flex-1 max-w-xl relative">
              <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                  style={{ color: 'var(--text-secondary)' }}
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
                  className="w-full rounded-full text-sm py-2.5 pl-10 pr-4 transition-all"
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    border: '2px solid var(--ui-border)',
                    outline: 'none',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#46C89B';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(70, 200, 155, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--ui-border)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
              />
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