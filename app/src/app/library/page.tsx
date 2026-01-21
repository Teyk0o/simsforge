'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useProfiles } from '@/context/ProfileContext';
import { MagnifyingGlass, Trash, CheckCircle, Circle } from '@phosphor-icons/react';
import Layout from '@/components/layouts/Layout';
import ConfirmationModal from '@/components/ui/ConfirmationModal';

export default function LibraryPage() {
  const { activeProfile, isLoading, toggleModInProfile, removeModFromProfile } =
    useProfiles();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'enabled' | 'disabled'>('all');
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

  // Filter and search mods
  const filteredMods = useMemo(() => {
    if (!activeProfile) return [];

    let mods = activeProfile.mods;

    // Filter by status
    if (filterStatus === 'enabled') {
      mods = mods.filter((m) => m.enabled);
    } else if (filterStatus === 'disabled') {
      mods = mods.filter((m) => !m.enabled);
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

    return mods;
  }, [activeProfile, searchTerm, filterStatus]);

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

  return (
    <Layout>
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

          {activeProfile && (
            <p style={{ color: 'var(--text-secondary)' }} className="text-sm">
              {activeProfile.name} • {activeProfile.mods.length} mod{activeProfile.mods.length !== 1 ? 's' : ''}
            </p>
          )}
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
              className="flex-1 min-w-64 flex items-center gap-2 px-3 py-2 rounded-md border"
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

            {/* Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as 'all' | 'enabled' | 'disabled')}
              className="px-3 py-1.5 rounded-md border transition-colors text-sm"
              style={{
                backgroundColor: 'var(--ui-input-bg)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
              }}
            >
              <option value="all">All Mods</option>
              <option value="enabled">Enabled</option>
              <option value="disabled">Disabled</option>
            </select>
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
                {searchTerm ? 'No mods found matching your search' : 'No mods in this profile yet'}
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
                      </div>

                      {/* Mod Info */}
                      <div className="flex-1 min-w-0">
                        <h3
                          className="font-medium truncate"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {mod.modName}
                        </h3>
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
    </Layout>
  );
}
