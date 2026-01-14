'use client';

import React, { useState } from 'react';
import { useProfiles } from '@/context/ProfileContext';
import { useToast } from '@/context/ToastContext';
import CreateProfileModal from '@/components/profile/CreateProfileModal';
import { Trash, PencilSimple, CheckCircle, Plus } from '@phosphor-icons/react';

export default function ProfilesPage() {
  const { profiles, activeProfile, activateProfile, deleteProfile, updateProfile, isLoading } =
    useProfiles();
  const { showToast } = useToast();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const handleDeleteProfile = async (profileId: string) => {
    if (!confirm('Are you sure you want to delete this profile? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteProfile(profileId);
    } catch (error) {
      console.error('Failed to delete profile:', error);
    }
  };

  const handleStartEdit = (profileId: string, name: string, description: string) => {
    setEditingId(profileId);
    setEditName(name);
    setEditDescription(description);
  };

  const handleSaveEdit = async (profileId: string) => {
    if (!editName.trim()) {
      showToast({
        type: 'error',
        title: 'Validation Error',
        message: 'Profile name cannot be empty',
        duration: 3000,
      });
      return;
    }

    try {
      await updateProfile(profileId, {
        name: editName.trim(),
        description: editDescription.trim(),
      });
      setEditingId(null);
    } catch (error: any) {
      showToast({
        type: 'error',
        title: 'Failed to update profile',
        message: error.message,
        duration: 3000,
      });
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div
        className="border-b p-6"
        style={{ borderColor: 'var(--border-color)' }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1
              className="text-2xl font-bold mb-1"
              style={{ color: 'var(--text-primary)' }}
            >
              Profiles
            </h1>
            <p style={{ color: 'var(--text-secondary)' }}>
              Manage your mod profiles and configurations
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-md transition-colors font-medium text-white"
            style={{
              backgroundColor: '#46C89B',
              opacity: isLoading ? 0.5 : 1,
            }}
          >
            <Plus size={20} weight="bold" />
            <span>Create Profile</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div
            className="flex items-center justify-center h-64"
            style={{ color: 'var(--text-secondary)' }}
          >
            Loading profiles...
          </div>
        ) : profiles.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center h-64 text-center"
            style={{ color: 'var(--text-secondary)' }}
          >
            <p className="text-lg mb-4">No profiles yet</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 rounded-md transition-colors font-medium text-white"
              style={{ backgroundColor: '#46C89B' }}
            >
              Create your first profile
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {profiles.map((profile) => (
              <div
                key={profile.id}
                className="rounded-lg border p-4 transition-all hover:shadow-lg"
                style={{
                  backgroundColor: 'var(--ui-panel)',
                  borderColor: 'var(--border-color)',
                }}
              >
                {editingId === profile.id ? (
                  // Edit Mode
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-3 py-2 rounded border text-sm font-bold"
                      style={{
                        backgroundColor: 'var(--ui-input-bg)',
                        borderColor: 'var(--border-color)',
                        color: 'var(--text-primary)',
                      }}
                    />
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder="Profile description..."
                      rows={2}
                      className="w-full px-3 py-2 rounded border text-sm resize-none"
                      style={{
                        backgroundColor: 'var(--ui-input-bg)',
                        borderColor: 'var(--border-color)',
                        color: 'var(--text-primary)',
                      }}
                    />
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => setEditingId(null)}
                        className="flex-1 px-3 py-2 rounded text-sm transition-colors"
                        style={{
                          backgroundColor: 'var(--ui-hover)',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSaveEdit(profile.id)}
                        className="flex-1 px-3 py-2 rounded text-sm transition-colors font-medium text-white"
                        style={{ backgroundColor: '#46C89B' }}
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <>
                    {/* Header with Active Badge */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded-full flex-shrink-0"
                          style={{ backgroundColor: profile.iconColor }}
                        />
                        <h3
                          className="font-bold text-sm flex-1"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {profile.name}
                        </h3>
                      </div>
                      {activeProfile?.id === profile.id && (
                        <div title="Active Profile">
                          <CheckCircle
                            size={20}
                            weight="fill"
                            color="#46C89B"
                          />
                        </div>
                      )}
                    </div>

                    {/* Description */}
                    {profile.description && (
                      <p
                        className="text-xs mb-2 line-clamp-2"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {profile.description}
                      </p>
                    )}

                    {/* Mods Count */}
                    <div
                      className="text-xs mb-3 py-2 px-2 rounded"
                      style={{ backgroundColor: 'var(--ui-hover)' }}
                    >
                      <span style={{ color: 'var(--text-secondary)' }}>
                        {profile.mods.length} mod{profile.mods.length !== 1 ? 's' : ''}
                      </span>
                    </div>

                    {/* Tags */}
                    {profile.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {profile.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-xs px-2 py-1 rounded-full"
                            style={{
                              backgroundColor: 'var(--ui-hover)',
                              color: 'var(--text-secondary)',
                            }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-2 border-t" style={{ borderColor: 'var(--border-color)' }}>
                      {activeProfile?.id !== profile.id && (
                        <button
                          onClick={() => activateProfile(profile.id)}
                          disabled={isLoading}
                          className="flex-1 px-3 py-2 rounded text-sm transition-colors font-medium text-white"
                          style={{
                            backgroundColor: '#46C89B',
                            opacity: isLoading ? 0.5 : 1,
                          }}
                        >
                          Activate
                        </button>
                      )}
                      <button
                        onClick={() => handleStartEdit(profile.id, profile.name, profile.description)}
                        disabled={isLoading}
                        className="flex items-center justify-center gap-1 px-3 py-2 rounded text-sm transition-colors"
                        style={{
                          backgroundColor: 'var(--ui-hover)',
                          color: 'var(--text-secondary)',
                          opacity: isLoading ? 0.5 : 1,
                        }}
                      >
                        <PencilSimple size={16} />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleDeleteProfile(profile.id)}
                        disabled={isLoading || activeProfile?.id === profile.id}
                        className="flex items-center justify-center gap-1 px-3 py-2 rounded text-sm transition-colors"
                        style={{
                          color: '#ef4444',
                          opacity: isLoading || activeProfile?.id === profile.id ? 0.5 : 1,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <Trash size={16} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Profile Modal */}
      {showCreateModal && (
        <CreateProfileModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
}
