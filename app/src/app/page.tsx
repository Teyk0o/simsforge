'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Spinner, X } from '@phosphor-icons/react';
import { useAuth } from '@/context/AuthContext';
import { useSearchState } from '@/context/SearchStateContext';
import { useViewMode } from '@/hooks/useViewMode';
import Layout from '@/components/layouts/Layout';
import ModList from '@/components/mod/ModList';
import FilterBar from '@/components/mod/FilterBar';

type SortOption = 'downloads' | 'date' | 'trending' | 'relevance';
type FilterChip = 'all' | 'updates' | 'early-access' | 'installed';

export default function Home() {
  const { isAuthenticated, isLoading, continueWithoutAuth, isOfflineMode } = useAuth();
  const router = useRouter();
  const { viewMode, toggleViewMode } = useViewMode();
  const searchState = useSearchState();
  const [isMounted, setIsMounted] = useState(false);
  const [previousSort, setPreviousSort] = useState<SortOption>('trending');

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleResetFilters = () => {
    searchState.setSearchQuery('');
    searchState.setActiveSort('trending');
    searchState.setActiveFilter('all');
    searchState.setSelectedCategory('');
    searchState.resetScrollIndex();
  };

  const hasActiveFilters =
    searchState.searchQuery !== '' ||
    searchState.activeSort !== 'trending' ||
    searchState.activeFilter !== 'all' ||
    searchState.selectedCategory !== '';


  // No debounce needed - sessionStorage handles persistence
  // Pass searchQuery directly for immediate updates

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

  // Show login screen if not authenticated and not in offline mode
  if (isMounted && !isAuthenticated && !isOfflineMode) {
    return (
      <div
        className="h-screen flex items-center justify-center"
        style={{
          background: `linear-gradient(to bottom right, #111827, var(--ui-dark), #111827)`,
        }}
      >
        <div className="flex flex-col items-center gap-6 max-w-md">
          <h1
            className="text-3xl font-bold text-center"
            style={{ color: 'var(--text-primary)' }}
          >
            SimsForge
          </h1>
          <p
            className="text-center"
            style={{ color: 'var(--text-secondary)' }}
          >
            Mod manager for The Sims 4
          </p>

          <div className="flex flex-col gap-3 w-full">
            <button
              onClick={() => router.push('/auth/login')}
              className="w-full px-6 py-3 rounded-md transition-colors font-medium text-white"
              style={{
                backgroundColor: '#46C89B',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.9';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
            >
              Sign In
            </button>

            <button
              onClick={continueWithoutAuth}
              className="w-full px-6 py-3 rounded-md border transition-colors font-medium"
              style={{
                backgroundColor: 'var(--ui-panel)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--ui-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--ui-panel)';
              }}
            >
              Continue Without Login
            </button>
          </div>
        </div>
      </div>
    );
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
            className="h-16 flex items-center gap-3 px-8 border-b shrink-0 z-10"
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
                  value={searchState.searchQuery}
                  onChange={(e) => searchState.setSearchQuery(e.target.value)}
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

            {/* Reset Filters Button */}
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="px-3 rounded-full border text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer h-10"
                style={{
                  backgroundColor: 'var(--ui-panel)',
                  borderColor: 'var(--ui-border)',
                  color: 'var(--text-primary)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--ui-hover)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--ui-panel)';
                }}
              >
                <X size={14} />
                Réinitialiser
              </button>
            )}
          </header>

          {/* Filter Bar */}
          {searchState.isLoaded && (
            <FilterBar
                onSortChange={searchState.setActiveSort}
                activeSort={searchState.activeSort}
                onFilterChange={searchState.setActiveFilter}
                activeFilter={searchState.activeFilter}
                onCategoryChange={searchState.setSelectedCategory}
                selectedCategory={searchState.selectedCategory}
                viewMode={viewMode}
                onViewModeChange={toggleViewMode}
            />
          )}

          {/* Mod List */}
          {searchState.isLoaded && (
            <ModList
              searchQuery={searchState.searchQuery}
              sortBy={searchState.activeSort}
              category={searchState.selectedCategory}
              viewMode={viewMode}
              activeFilter={searchState.activeFilter}
              scrollIndex={searchState.scrollIndex}
            />
          )}
        </main>
      </Layout>
  );
}