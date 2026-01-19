'use client';

import React, { useState } from 'react';
import { ModProfile } from '@/types/profile';
import { CaretDown, Plus } from '@phosphor-icons/react';
import CreateProfileModal from './CreateProfileModal';

interface ProfileSelectorProps {
  activeProfile: ModProfile | null;
  profiles: ModProfile[];
  onActivate: (profileId: string | null) => Promise<void>;
  isInitialized?: boolean;
}

export default function ProfileSelector({
  activeProfile,
  profiles,
  onActivate,
  isInitialized = true,
}: ProfileSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleActivate = async (profileId: string) => {
    try {
      setIsLoading(true);
      await onActivate(profileId);
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to activate profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="relative mb-4">
        {/* Selector Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={isLoading || !isInitialized}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-md border transition-all"
          style={{
            backgroundColor: 'var(--ui-panel)',
            borderColor: 'var(--border-color)',
            color: 'var(--text-primary)',
            opacity: isLoading || !isInitialized ? 0.7 : 1,
            cursor: isLoading || !isInitialized ? 'not-allowed' : 'pointer',
          }}
          onMouseEnter={(e) => {
            if (!isLoading && isInitialized) {
              e.currentTarget.style.backgroundColor = 'var(--ui-hover)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--ui-panel)';
          }}
        >
          <div
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: activeProfile?.iconColor || '#46C89B' }}
          />
          <span className="hidden lg:block text-sm font-medium truncate flex-1 text-left">
            {activeProfile?.name || 'No Profile'}
          </span>
          <CaretDown
            size={16}
            weight="bold"
            className={`flex-shrink-0 transition-transform ${
              isOpen ? 'rotate-180' : ''
            }`}
            style={{ color: 'var(--text-secondary)' }}
          />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div
            className="absolute top-full left-0 right-0 mt-1 rounded-md shadow-lg z-50 border"
            style={{
              backgroundColor: 'var(--ui-panel)',
              borderColor: 'var(--border-color)',
              maxHeight: '300px',
              overflowY: 'auto',
            }}
          >
            {/* Profile List */}
            {profiles.length > 0 ? (
              <div className="py-1">
                {profiles.map((profile) => (
                  <button
                    key={profile.id}
                    onClick={() => handleActivate(profile.id)}
                    disabled={isLoading || !isInitialized}
                    className={`w-full flex items-center gap-2 px-3 py-2 transition-colors text-left ${
                      isLoading || !isInitialized ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                    }`}
                    style={{
                      backgroundColor:
                        activeProfile?.id === profile.id
                          ? 'var(--ui-hover)'
                          : 'transparent',
                      color: 'var(--text-primary)',
                    }}
                    onMouseEnter={(e) => {
                      if (activeProfile?.id !== profile.id && !isLoading && isInitialized) {
                        e.currentTarget.style.backgroundColor = 'var(--ui-hover)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (activeProfile?.id !== profile.id) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: profile.iconColor }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {profile.name}
                      </div>
                      {profile.mods.length > 0 && (
                        <div
                          className="text-xs truncate"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          {profile.mods.length} mod{profile.mods.length !== 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div
                className="px-3 py-4 text-center text-sm"
                style={{ color: 'var(--text-secondary)' }}
              >
                No profiles yet
              </div>
            )}

            {/* Divider */}
            {profiles.length > 0 && (
              <div
                className="h-px"
                style={{ backgroundColor: 'var(--border-color)' }}
              />
            )}

            {/* Create Profile Button */}
            <button
              onClick={() => {
                setIsOpen(false);
                setShowCreateModal(true);
              }}
              className="w-full flex items-center gap-2 px-3 py-2.5 transition-colors text-left"
              style={{
                color: 'var(--text-secondary)',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--ui-hover)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              <Plus size={16} weight="bold" />
              <span className="hidden lg:block text-sm">Create Profile</span>
            </button>
          </div>
        )}
      </div>

      {/* Create Profile Modal */}
      {showCreateModal && (
        <CreateProfileModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
          }}
        />
      )}

      {/* Close dropdown when clicking outside */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
