'use client';

import React, { useState } from 'react';
import { X } from '@phosphor-icons/react';
import { useProfiles } from '@/context/ProfileContext';

interface CreateProfileModalProps {
  onClose: () => void;
  onCreated?: () => void;
}

export default function CreateProfileModal({
  onClose,
  onCreated,
}: CreateProfileModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { createProfile } = useProfiles();

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!name.trim()) {
      setError('Profile name is required');
      return;
    }

    try {
      setIsLoading(true);
      console.log('[CreateProfileModal] Creating profile:', { name, description, tags });

      const newProfile = await createProfile(name.trim(), description.trim(), tags);

      console.log('[CreateProfileModal] Profile created successfully:', newProfile);
      setName('');
      setDescription('');
      setTags([]);
      onCreated?.();
      onClose();
    } catch (error: any) {
      console.error('[CreateProfileModal] Error creating profile:', error);
      setError(error.message || 'Failed to create profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={onClose}
    >
      <div
        className="rounded-lg shadow-xl max-w-md w-full border"
        style={{
          backgroundColor: 'var(--ui-panel)',
          borderColor: 'var(--border-color)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-4 border-b"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <h2
            className="text-lg font-bold"
            style={{ color: 'var(--text-primary)' }}
          >
            Create Profile
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded transition-colors"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#ef4444';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleCreateProfile} className="p-4 space-y-4">
          {/* Name Field */}
          <div>
            <label
              htmlFor="profile-name"
              className="block text-sm font-medium mb-1"
              style={{ color: 'var(--text-primary)' }}
            >
              Profile Name *
            </label>
            <input
              id="profile-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Gameplay Realistic"
              disabled={isLoading}
              className="w-full px-3 py-2 rounded border transition-colors"
              style={{
                backgroundColor: 'var(--ui-input-bg)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#46C89B';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-color)';
              }}
            />
          </div>

          {/* Description Field */}
          <div>
            <label
              htmlFor="profile-description"
              className="block text-sm font-medium mb-1"
              style={{ color: 'var(--text-primary)' }}
            >
              Description
            </label>
            <textarea
              id="profile-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description of this profile..."
              disabled={isLoading}
              rows={3}
              className="w-full px-3 py-2 rounded border transition-colors resize-none"
              style={{
                backgroundColor: 'var(--ui-input-bg)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#46C89B';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-color)';
              }}
            />
          </div>

          {/* Tags Field */}
          <div>
            <label
              htmlFor="profile-tags"
              className="block text-sm font-medium mb-1"
              style={{ color: 'var(--text-primary)' }}
            >
              Tags
            </label>
            <div className="flex gap-2 mb-2">
              <input
                id="profile-tags"
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="Add tag and press Enter"
                disabled={isLoading}
                className="flex-1 px-3 py-2 rounded border transition-colors"
                style={{
                  backgroundColor: 'var(--ui-input-bg)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)',
                }}
              />
              <button
                type="button"
                onClick={handleAddTag}
                disabled={isLoading || !tagInput.trim()}
                className="px-3 py-2 rounded transition-colors font-medium"
                style={{
                  backgroundColor: '#46C89B',
                  color: 'white',
                  opacity: isLoading || !tagInput.trim() ? 0.5 : 1,
                }}
              >
                Add
              </button>
            </div>

            {/* Tags Display */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <div
                    key={tag}
                    className="flex items-center gap-2 px-2.5 py-1 rounded-full text-sm"
                    style={{ backgroundColor: 'var(--ui-hover)' }}
                  >
                    <span style={{ color: 'var(--text-primary)' }}>{tag}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      disabled={isLoading}
                      className="p-0.5 rounded transition-colors"
                      style={{ color: 'var(--text-secondary)' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = '#ef4444';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = 'var(--text-secondary)';
                      }}
                    >
                      <X size={14} weight="bold" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div
              className="p-3 rounded text-sm"
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                color: '#ef4444',
              }}
            >
              {error}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-4 py-2 rounded transition-colors font-medium"
              style={{
                backgroundColor: 'var(--ui-hover)',
                color: 'var(--text-primary)',
                opacity: isLoading ? 0.5 : 1,
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !name.trim()}
              className="flex-1 px-4 py-2 rounded transition-colors font-medium text-white"
              style={{
                backgroundColor: '#46C89B',
                opacity: isLoading || !name.trim() ? 0.5 : 1,
              }}
            >
              {isLoading ? 'Creating...' : 'Create Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
