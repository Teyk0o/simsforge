import { z } from 'zod';

/**
 * Zod schemas for user-related request validation.
 */

/**
 * Update user profile schema
 */
export const updateUserProfileSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be less than 50 characters')
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      'Username can only contain letters, numbers, underscores, and hyphens'
    )
    .optional(),
  preferredLanguage: z
    .enum(['en', 'fr', 'es', 'de', 'it', 'pt', 'ja', 'zh'])
    .optional(),
  avatarUrl: z
    .string()
    .url('Invalid URL')
    .max(500, 'Avatar URL must be less than 500 characters')
    .nullable()
    .optional(),
});

export type UpdateUserProfileRequest = z.infer<typeof updateUserProfileSchema>;
