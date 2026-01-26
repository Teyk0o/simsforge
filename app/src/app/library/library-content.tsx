'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useProfiles } from '@/context/ProfileContext';
import { useUpdates } from '@/context/UpdateContext';
import { MagnifyingGlass, Trash, CheckCircle, Circle, ArrowCircleUp, ArrowsClockwise, Warning, CaretDown } from '@phosphor-icons/react';
import ConfirmationModal from '@/components/ui/ConfirmationModal';
import UpdateBadge from '@/components/update/UpdateBadge';
import { getBatchWarningStatus } from '@/lib/fakeDetectionApi';
import { userPreferencesService } from '@/lib/services/UserPreferencesService';
import type { ModWarningStatus } from '@/types/fakeDetection';

/** Filter options for the library */
const FILTER_OPTIONS = [
  { value: 'all' as const, label: 'All Mods' },
  { value: 'enabled' as const, label: 'Enabled' },
  { value: 'disabled' as const, label: 'Disabled' },
  { value: 'updates' as const, label: 'Updates Available' },
];

/** Sort options for the library */
const SORT_OPTIONS = [
  { value: 'name' as const, label: 'Name' },
  { value: 'lastUpdated' as const, label: 'Last Updated' },
];

/**
 * Library content component that handles displaying and managing mods
 */
export default function LibraryContent() {
  const searchParams = useSearchParams();
  const { activeProfile, isLoading, toggleModInProfile, removeModFromProfile } =
    useProfiles();
  const { hasUpdate, updateMod, updateAllMods, updateCount, isUpdating, isChecking, checkForUpdates } = useUpdates();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'enabled' | 'disabled' | 'updates'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'lastUpdated'>('name');
  const [openDropdown, setOpenDropdown] = useState<'filter' | 'sort' | null>(null);
  const [updatingModId, setUpdatingModId] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [warningStatuses, setWarningStatuses] = useState<Record<number, ModWarningStatus>>({});
  const [confirmationModal, setConfirmationModal] = useState<{
    isOpen: boolean;
    modId: number | null;
    modName: string;
    isLoading: boolean;
  }>({
    isOpen: false,
    modId: null,
    modName: '',
    isLoading: false,
  });

  // Set filter from URL query parameter
  useEffect(() => {
    const filterParam = searchParams.get('filter');
    if (filterParam === 'updates') {
      setFilterStatus('updates');
    }
  }, [searchParams]);

  // Fetch warning statuses for installed mods (only if fake mod detection is enabled)
  useEffect(() => {
    if (!activeProfile || activeProfile.mods.length === 0) return;
    if (!userPreferencesService.getFakeModDetection()) return;

    const fetchWarnings = async () => {
      try {
        const modIds = activeProfile.mods.map((mod) => mod.modId);
        const statuses = await getBatchWarningStatus(modIds);
        setWarningStatuses(statuses || {});
      } catch (err) {
        console.error('[Library] Failed to fetch warning statuses:', err);
      }
    };

    fetchWarnings();
  }, [activeProfile]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter, search, and sort mods
  const filteredMods = useMemo(() => {
    if (!activeProfile) return [];

    let mods = [...activeProfile.mods];

    // Filter by status
    if (filterStatus === 'enabled') {
      mods = mods.filter((m) => m.enabled);
    } else if (filterStatus === 'disabled') {
      mods = mods.filter((m) => !m.enabled);
    } else if (filterStatus === 'updates') {
      mods = mods.filter((m) => hasUpdate(m.modId));
    }

    // Search by name
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      mods = mods.filter(
        (m) =>
          m.modName.toLowerCase().includes(searchLower) ||
          m.fileName.toLowerCase().includes(searchLower)
      );
    }

    // Sort mods
    if (sortBy === 'lastUpdated') {
      mods.sort((a, b) => {
        const dateA = a.lastUpdateDate ? new Date(a.lastUpdateDate).getTime() : 0;
        const dateB = b.lastUpdateDate ? new Date(b.lastUpdateDate).getTime() : 0;
        return dateB - dateA; // Most recent first
      });
    } else {
      mods.sort((a, b) => a.modName.localeCompare(b.modName));
    }

    return mods;
  }, [activeProfile, searchTerm, filterStatus, sortBy, hasUpdate]);

  const handleToggleMod = async (modId: number, enabled: boolean) => {
    try {
      if (activeProfile) {
        await toggleModInProfile(activeProfile.id, modId, !enabled);
      }
    } catch (error) {
      console.error('Failed to toggle mod:', error);
    }
  };

  const handleRemoveModClick = (modId: number, modName: string) => {
    setConfirmationModal({
      isOpen: true,
      modId,
      modName,
      isLoading: false,
    });
  };

  const handleRemoveModConfirm = async () => {
    if (!confirmationModal.modId || !activeProfile) return;

    try {
      setConfirmationModal((prev) => ({ ...prev, isLoading: true }));
      await removeModFromProfile(activeProfile.id, confirmationModal.modId);
      setConfirmationModal({
        isOpen: false,
        modId: null,
        modName: '',
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to remove mod:', error);
    } finally {
      setConfirmationModal((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const handleUpdateMod = async (modId: number) => {
    setUpdatingModId(modId);
    try {
      await updateMod(modId);
    } finally {
      setUpdatingModId(null);
    }
  };

  const handleUpdateAll = async () => {
    await updateAllMods();
  };

  return (
    <main
      className="flex-1 flex flex-col min-w-0 bg-gray-50 dark:bg-ui-dark"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      {/* Header */}
      <header
        className="h-16 flex items-center justify-between px-8 border-b shrink-0 z-10"
        style={{
          borderColor: 'var(--border-color)',
          backgroundColor: 'var(--ui-panel)',
        }}
      >
        <h1
          className="text-xl font-bold"
          style={{ color: 'var(--text-primary)' }}
        >
          Library
        </h1>

        <div className="flex items-center gap-4">
          {/* Update All Button */}
          {activeProfile && updateCount > 0 && (
            <button
              onClick={handleUpdateAll}
              disabled={isUpdating}
              className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors"
              style={{
                backgroundColor: '#46C89B',
                color: '#fff',
                opacity: isUpdating ? 0.6 : 1,
                cursor: isUpdating ? 'not-allowed' : 'pointer',
              }}
            >
              <ArrowCircleUp size={18} weight={isUpdating ? 'regular' : 'fill'} />
              {isUpdating ? 'Updating...' : `Update All (${updateCount})`}
            </button>
          )}

          {activeProfile && (
            <p style={{ color: 'var(--text-secondary)' }} className="text-sm">
              {activeProfile.name} • {activeProfile.mods.length} mod{activeProfile.mods.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      </header>

      {/* Search & Filter Section */}
      {activeProfile && !isLoading && (
        <section
          className="px-8 py-4 flex flex-col md:flex-row md:items-center gap-4 border-b sticky top-0 z-10 backdrop-blur-md shrink-0"
          style={{
            borderColor: 'var(--border-color)',
            backgroundColor: 'var(--ui-panel)',
          }}
        >
          {/* Search */}
          <div
            className="flex-1 min-w-64 h-10 flex items-center gap-2 px-3 rounded-lg border"
            style={{
              backgroundColor: 'var(--ui-input-bg)',
              borderColor: 'var(--border-color)',
            }}
          >
            <MagnifyingGlass size={18} style={{ color: 'var(--text-secondary)' }} />
            <input
              type="text"
              placeholder="Search mods..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                backgroundColor: 'transparent',
                color: 'var(--text-primary)',
                border: 'none',
                outline: 'none',
                flex: 1,
              }}
            />
          </div>

          {/* Filter & Sort Dropdowns */}
          <div className="flex items-center gap-2" ref={dropdownRef}>
            {/* Filter Dropdown */}
            <div className="relative">
              <button
                onClick={() => setOpenDropdown(openDropdown === 'filter' ? null : 'filter')}
                className="flex items-center gap-2 px-3 h-10 border rounded-lg text-sm font-medium hover:border-brand-green transition-colors cursor-pointer"
                style={{ backgroundColor: 'var(--ui-panel)', borderColor: 'var(--border-color)' }}
              >
                <span>Filter:</span>
                <span className="text-brand-green">
                  {filterStatus === 'updates' && updateCount > 0
                    ? `${FILTER_OPTIONS.find((o) => o.value === filterStatus)?.label} (${updateCount})`
                    : FILTER_OPTIONS.find((o) => o.value === filterStatus)?.label}
                </span>
                <CaretDown size={16} className={`transition-transform ${openDropdown === 'filter' ? 'rotate-180' : ''}`} style={{ color: 'var(--text-secondary)' }} />
              </button>
              {openDropdown === 'filter' && (
                <div className="absolute left-0 mt-1 w-48 border rounded-lg shadow-lg z-20" style={{ backgroundColor: 'var(--ui-panel)', borderColor: 'var(--border-color)' }}>
                  {FILTER_OPTIONS.map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => {
                        setFilterStatus(value);
                        setOpenDropdown(null);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm transition-colors first:rounded-t-lg last:rounded-b-lg ${
                        filterStatus === value ? 'bg-brand-green/10 text-brand-green' : ''
                      }`}
                      style={{
                        backgroundColor: filterStatus === value ? undefined : 'transparent',
                        color: filterStatus === value ? undefined : 'var(--text-primary)',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => {
                        if (filterStatus !== value) {
                          e.currentTarget.style.backgroundColor = 'var(--ui-hover)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (filterStatus !== value) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }
                      }}
                    >
                      {value === 'updates' && updateCount > 0 ? `${label} (${updateCount})` : label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="relative">
              <button
                onClick={() => setOpenDropdown(openDropdown === 'sort' ? null : 'sort')}
                className="flex items-center gap-2 px-3 h-10 border rounded-lg text-sm font-medium hover:border-brand-green transition-colors cursor-pointer"
                style={{ backgroundColor: 'var(--ui-panel)', borderColor: 'var(--border-color)' }}
              >
                <span>Sort:</span>
                <span className="text-brand-green">
                  {SORT_OPTIONS.find((o) => o.value === sortBy)?.label}
                </span>
                <CaretDown size={16} className={`transition-transform ${openDropdown === 'sort' ? 'rotate-180' : ''}`} style={{ color: 'var(--text-secondary)' }} />
              </button>
              {openDropdown === 'sort' && (
                <div className="absolute left-0 mt-1 w-40 border rounded-lg shadow-lg z-20" style={{ backgroundColor: 'var(--ui-panel)', borderColor: 'var(--border-color)' }}>
                  {SORT_OPTIONS.map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => {
                        setSortBy(value);
                        setOpenDropdown(null);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm transition-colors first:rounded-t-lg last:rounded-b-lg ${
                        sortBy === value ? 'bg-brand-green/10 text-brand-green' : ''
                      }`}
                      style={{
                        backgroundColor: sortBy === value ? undefined : 'transparent',
                        color: sortBy === value ? undefined : 'var(--text-primary)',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => {
                        if (sortBy !== value) {
                          e.currentTarget.style.backgroundColor = 'var(--ui-hover)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (sortBy !== value) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Check for Updates Button */}
          <button
            onClick={() => checkForUpdates()}
            disabled={isChecking}
            className="flex items-center gap-2 px-3 h-10 rounded-lg border transition-colors text-sm hover:border-brand-green"
            style={{
              backgroundColor: 'var(--ui-input-bg)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-primary)',
              opacity: isChecking ? 0.6 : 1,
              cursor: isChecking ? 'not-allowed' : 'pointer',
            }}
            title="Check for updates"
          >
            <ArrowsClockwise size={16} className={isChecking ? 'animate-spin' : ''} />
            <span className="hidden md:inline">{isChecking ? 'Checking...' : 'Check Updates'}</span>
          </button>
        </section>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {!activeProfile ? (
          <div
            className="flex items-center justify-center h-full"
            style={{ color: 'var(--text-secondary)' }}
          >
            <div className="text-center">
              <p className="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>No active profile</p>
              <p className="text-sm">Create or activate a profile in the sidebar to see your mods</p>
            </div>
          </div>
        ) : isLoading ? (
          <div
            className="flex items-center justify-center h-64"
            style={{ color: 'var(--text-secondary)' }}
          >
            Loading library...
          </div>
        ) : filteredMods.length === 0 ? (
          <div
            className="flex items-center justify-center h-64"
            style={{ color: 'var(--text-secondary)' }}
          >
            <p>
              {searchTerm
                ? 'No mods found matching your search'
                : filterStatus === 'updates'
                  ? 'All mods are up to date!'
                  : 'No mods in this profile yet'}
            </p>
          </div>
        ) : (
          <div className="p-6">
            <div className="space-y-2">
              {filteredMods.map((mod) => (
                <Link
                  key={mod.modId}
                  href={`/mods?id=${mod.modId}`}
                  className="block"
                >
                  <div
                    className="flex items-center gap-4 p-4 rounded-lg border transition-all cursor-pointer group"
                    style={{
                      backgroundColor: 'var(--ui-panel)',
                      borderColor: 'var(--border-color)',
                      opacity: mod.enabled ? 1 : 0.6,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--ui-hover)';
                      e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--ui-panel)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    {/* Mod Image */}
                    <div className="relative h-16 w-16 rounded-md overflow-hidden flex-shrink-0" style={{ backgroundColor: '#1a1a1a' }}>
                      {mod.logo ? (
                        <Image
                          src={mod.logo}
                          alt={mod.modName}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl" style={{ color: 'var(--text-tertiary)' }}>
                          📦
                        </div>
                      )}
                      {warningStatuses[mod.modId] && (warningStatuses[mod.modId].hasWarning || warningStatuses[mod.modId].creatorBanned) && (
                        <div
                          className="absolute top-0 right-0 w-5 h-5 flex items-center justify-center rounded-bl-md"
                          style={{ backgroundColor: warningStatuses[mod.modId].creatorBanned ? '#dc2626' : '#f59e0b' }}
                          title={warningStatuses[mod.modId].creatorBanned ? 'Banned creator' : 'Suspicious mod'}
                        >
                          <Warning size={12} weight="fill" color="#fff" />
                        </div>
                      )}
                    </div>

                    {/* Mod Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3
                          className="font-medium truncate"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {mod.modName}
                        </h3>
                        {hasUpdate(mod.modId) && <UpdateBadge modId={mod.modId} />}
                      </div>
                      <div className="flex flex-col gap-1 mt-1">
                        {mod.authors && mod.authors.length > 0 && (
                          <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                            by {mod.authors.join(', ')}
                          </p>
                        )}
                        <div className="flex items-center gap-2 text-xs">
                          {mod.lastUpdateDate && (
                            <span style={{ color: 'var(--text-secondary)' }}>
                              Updated {new Date(mod.lastUpdateDate).toLocaleDateString()}
                            </span>
                          )}
                          {!mod.enabled && (
                            <>
                              <span style={{ color: 'var(--text-secondary)' }}>•</span>
                              <span style={{ color: '#fbbf24' }}>Disabled</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {/* Update Button (only shown if update available) */}
                      {hasUpdate(mod.modId) && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleUpdateMod(mod.modId);
                          }}
                          disabled={isUpdating || updatingModId === mod.modId}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
                          title="Update mod"
                          style={{
                            backgroundColor: '#46C89B',
                            color: '#fff',
                            opacity: updatingModId === mod.modId ? 0.6 : 1,
                            cursor: updatingModId === mod.modId ? 'not-allowed' : 'pointer',
                          }}
                        >
                          <ArrowCircleUp size={16} className={updatingModId === mod.modId ? 'animate-spin' : ''} />
                          {updatingModId === mod.modId ? 'Updating...' : 'Update'}
                        </button>
                      )}

                      {/* Enable/Disable Button */}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleToggleMod(mod.modId, mod.enabled);
                        }}
                        disabled={isLoading}
                        className="p-2 rounded transition-colors"
                        title={mod.enabled ? 'Disable mod' : 'Enable mod'}
                        style={{
                          backgroundColor: 'var(--ui-hover)',
                          color: mod.enabled ? '#46C89B' : 'var(--text-secondary)',
                          opacity: isLoading ? 0.5 : 1,
                          cursor: isLoading ? 'not-allowed' : 'pointer',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--ui-hover)';
                        }}
                      >
                        {mod.enabled ? (
                          <CheckCircle size={20} weight="fill" />
                        ) : (
                          <Circle size={20} />
                        )}
                      </button>

                      {/* Remove Button */}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleRemoveModClick(mod.modId, mod.modName);
                        }}
                        disabled={isLoading}
                        className="p-2 rounded transition-colors"
                        title="Remove mod from profile"
                        style={{
                          color: '#ef4444',
                          opacity: isLoading ? 0.5 : 1,
                          cursor: isLoading ? 'not-allowed' : 'pointer',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <Trash size={20} />
                      </button>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmationModal.isOpen}
        onClose={() =>
          setConfirmationModal({
            isOpen: false,
            modId: null,
            modName: '',
            isLoading: false,
          })
        }
        onConfirm={handleRemoveModConfirm}
        title="Remove Mod"
        message={`Are you sure you want to remove "${confirmationModal.modName}" from your profile? This action cannot be undone.`}
        confirmText="Remove"
        cancelText="Cancel"
        isDangerous={true}
        isLoading={confirmationModal.isLoading}
      />
    </main>
  );
}
