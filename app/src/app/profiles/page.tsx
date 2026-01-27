'use client';

import React, { useState } from 'react';
import { useProfiles } from '@/context/ProfileContext';
import { useToast } from '@/context/ToastContext';
import CreateProfileModal from '@/components/profile/CreateProfileModal';
import ConfirmationModal from '@/components/ui/ConfirmationModal';
import { Trash, PencilSimple, CheckCircle, Plus } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import Layout from '@/components/layouts/Layout';

export default function ProfilesPage() {
  const { t } = useTranslation();
  const { profiles, activeProfile, activateProfile, deleteProfile, updateProfile, isLoading, isInitialized } =
    useProfiles();
  const { showToast } = useToast();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    profileId: string | null;
    profileName: string;
    isLoading: boolean;
  }>({
    isOpen: false,
    profileId: null,
    profileName: '',
    isLoading: false,
  });

  const handleDeleteClick = (profileId: string, profileName: string) => {
    setDeleteModal({
      isOpen: true,
      profileId,
      profileName,
      isLoading: false,
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.profileId) return;

    setDeleteModal((prev) => ({ ...prev, isLoading: true }));

    try {
      await deleteProfile(deleteModal.profileId);
      setDeleteModal({
        isOpen: false,
        profileId: null,
        profileName: '',
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to delete profile:', error);
      setDeleteModal((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModal({
      isOpen: false,
      profileId: null,
      profileName: '',
      isLoading: false,
    });
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
        title: t('profiles.card.validation_error'),
        message: t('profiles.card.name_required'),
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
        title: t('profiles.card.update_failed'),
        message: error.message,
        duration: 3000,
      });
    }
  };

  return (
    <Layout>
      <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <header
        className="h-16 flex items-center justify-between border-b px-8"
        style={{ borderColor: 'var(--border-color)' }}
      >
        <h1
          className="text-xl font-bold"
          style={{ color: 'var(--text-primary)' }}
        >
          {t('profiles.title')}
        </h1>

        <button
          onClick={() => setShowCreateModal(true)}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer"
          style={{
            backgroundColor: '#46C89B',
            color: '#fff',
            opacity: isLoading ? 0.6 : 1,
            cursor: isLoading ? 'not-allowed' : 'pointer',
          }}
          onMouseEnter={(e) => {
            if (!isLoading) {
              e.currentTarget.style.backgroundColor = '#3fb889';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#46C89B';
          }}
        >
          <Plus size={18} weight="fill" />
          {t('profiles.create_profile')}
        </button>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {isLoading ? (
          <div
            className="flex items-center justify-center h-64"
            style={{ color: 'var(--text-secondary)' }}
          >
            {t('profiles.loading')}
          </div>
        ) : profiles.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center h-64 text-center"
            style={{ color: 'var(--text-secondary)' }}
          >
            <p className="text-lg mb-4">{t('profiles.empty.title')}</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 rounded-md transition-colors font-medium text-white cursor-pointer"
              style={{ backgroundColor: '#46C89B' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#3fb889';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#46C89B';
              }}
            >
              {t('profiles.empty.button')}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {profiles.map((profile) => {
              const isActive = activeProfile?.id === profile.id;
              return (
              <div
                key={profile.id}
                className="rounded-lg border-2 p-4 transition-all hover:shadow-lg flex flex-col"
                style={{
                  backgroundColor: 'var(--ui-panel)',
                  borderColor: isActive ? '#46C89B' : 'var(--border-color)',
                  boxShadow: isActive ? '0 0 0 1px #46C89B' : 'none',
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
                      placeholder={t('profiles.card.description_placeholder')}
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
                        className="flex-1 px-3 py-2 rounded text-sm transition-colors cursor-pointer"
                        style={{
                          backgroundColor: 'var(--ui-hover)',
                          color: 'var(--text-secondary)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.opacity = '0.8';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.opacity = '1';
                        }}
                      >
                        {t('common.cancel')}
                      </button>
                      <button
                        onClick={() => handleSaveEdit(profile.id)}
                        className="flex-1 px-3 py-2 rounded text-sm transition-colors font-medium text-white cursor-pointer"
                        style={{ backgroundColor: '#46C89B' }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#3fb889';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#46C89B';
                        }}
                      >
                        {t('common.save')}
                      </button>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <div className="flex flex-col h-full">
                    {/* Header with Active Badge */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div
                          className="w-4 h-4 rounded-full flex-shrink-0"
                          style={{ backgroundColor: profile.iconColor }}
                        />
                        <h3
                          className="font-bold text-sm truncate"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {profile.name}
                        </h3>
                      </div>
                      {isActive && (
                        <div title={t('profiles.active_tooltip')} className="flex-shrink-0">
                          <CheckCircle
                            size={22}
                            weight="fill"
                            color="#46C89B"
                          />
                        </div>
                      )}
                    </div>

                    {/* Description - Fixed height */}
                    <div className="mb-3 min-h-[40px]">
                      {profile.description && (
                        <p
                          className="text-xs line-clamp-2"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          {profile.description}
                        </p>
                      )}
                    </div>

                    {/* Mods Count */}
                    <div
                      className="text-xs mb-3 py-2 px-2 rounded"
                      style={{ backgroundColor: 'var(--ui-hover)' }}
                    >
                      <span style={{ color: 'var(--text-secondary)' }}>
                        {profile.mods.length === 1
                          ? t('profiles.card.mods_count', { count: profile.mods.length })
                          : t('profiles.card.mods_count_plural', { count: profile.mods.length })}
                      </span>
                    </div>

                    {/* Tags - Fixed height */}
                    <div className="mb-3 min-h-[28px]">
                      {profile.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
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
                    </div>

                    {/* Actions - Push to bottom */}
                    <div className="flex gap-2 pt-3 border-t mt-auto" style={{ borderColor: 'var(--border-color)' }}>
                      {isActive ? (
                        <div
                          className="flex-1 px-3 py-2 rounded text-sm text-center font-semibold"
                          style={{
                            backgroundColor: 'rgba(70, 200, 155, 0.15)',
                            color: '#46C89B',
                            border: '1px solid #46C89B',
                          }}
                        >
                          {t('profiles.card.active')}
                        </div>
                      ) : (
                        <button
                          onClick={() => activateProfile(profile.id)}
                          disabled={isLoading || !isInitialized}
                          className="flex-1 px-3 py-2 rounded text-sm transition-colors font-medium text-white cursor-pointer"
                          style={{
                            backgroundColor: '#46C89B',
                            opacity: isLoading || !isInitialized ? 0.5 : 1,
                            cursor: isLoading || !isInitialized ? 'not-allowed' : 'pointer',
                          }}
                          onMouseEnter={(e) => {
                            if (!isLoading && isInitialized) {
                              e.currentTarget.style.backgroundColor = '#3fb889';
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#46C89B';
                          }}
                        >
                          {t('profiles.card.activate')}
                        </button>
                      )}
                      <button
                        onClick={() => handleStartEdit(profile.id, profile.name, profile.description)}
                        disabled={isLoading}
                        className="flex items-center justify-center gap-1 px-3 py-2 rounded text-sm transition-colors cursor-pointer"
                        style={{
                          backgroundColor: 'var(--ui-hover)',
                          color: 'var(--text-secondary)',
                          opacity: isLoading ? 0.5 : 1,
                          cursor: isLoading ? 'not-allowed' : 'pointer',
                        }}
                        onMouseEnter={(e) => {
                          if (!isLoading) {
                            e.currentTarget.style.opacity = '0.8';
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.opacity = isLoading ? '0.5' : '1';
                        }}
                      >
                        <PencilSimple size={16} />
                        <span>{t('profiles.card.edit')}</span>
                      </button>
                      <button
                        onClick={() => handleDeleteClick(profile.id, profile.name)}
                        disabled={isLoading || activeProfile?.id === profile.id}
                        className="flex items-center justify-center gap-1 px-3 py-2 rounded text-sm transition-colors cursor-pointer"
                        style={{
                          color: '#ef4444',
                          opacity: isLoading || activeProfile?.id === profile.id ? 0.5 : 1,
                          cursor: isLoading || activeProfile?.id === profile.id ? 'not-allowed' : 'pointer',
                        }}
                        onMouseEnter={(e) => {
                          if (!isLoading && activeProfile?.id !== profile.id) {
                            e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <Trash size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
              );
            })}
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

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title={t('profiles.card.delete_confirmation_title')}
        message={t('profiles.card.delete_confirmation_message', { name: deleteModal.profileName })}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        isDangerous={true}
        isLoading={deleteModal.isLoading}
      />
    </div>
    </Layout>
  );
}
