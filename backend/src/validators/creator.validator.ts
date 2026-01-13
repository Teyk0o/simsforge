import { z } from 'zod';

/**
 * Zod schemas for creator-related request validation.
 */

/**
 * Register as creator schema
 */
export const registerCreatorSchema = z.object({
  displayName: z
    .string()
    .min(2, 'Display name must be at least 2 characters')
    .max(100, 'Display name must be less than 100 characters'),
  bio: z
    .string()
    .max(500, 'Bio must be less than 500 characters')
    .optional(),
});

export type RegisterCreatorRequest = z.infer<typeof registerCreatorSchema>;

/**
 * Update creator profile schema
 */
export const updateCreatorProfileSchema = z.object({
  displayName: z
    .string()
    .min(2, 'Display name must be at least 2 characters')
    .max(100, 'Display name must be less than 100 characters')
    .optional(),
  bio: z
    .string()
    .max(500, 'Bio must be less than 500 characters')
    .nullable()
    .optional(),
  patreonUrl: z
    .string()
    .url('Invalid Patreon URL')
    .max(500, 'Patreon URL must be less than 500 characters')
    .nullable()
    .optional(),
  twitterUrl: z
    .string()
    .url('Invalid Twitter URL')
    .max(500, 'Twitter URL must be less than 500 characters')
    .nullable()
    .optional(),
  discordUrl: z
    .string()
    .url('Invalid Discord URL')
    .max(500, 'Discord URL must be less than 500 characters')
    .nullable()
    .optional(),
  websiteUrl: z
    .string()
    .url('Invalid website URL')
    .max(500, 'Website URL must be less than 500 characters')
    .nullable()
    .optional(),
});

export type UpdateCreatorProfileRequest = z.infer<typeof updateCreatorProfileSchema>;
