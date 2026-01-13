import { z } from 'zod';

/**
 * Schema for creating a new mod.
 */
export const createModSchema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title must be at most 200 characters'),
  description: z.string().max(5000, 'Description must be at most 5000 characters').optional(),
  accessType: z
    .enum(['free', 'early_access'], {
      errorMap: () => ({ message: 'Access type must be either free or early_access' }),
    })
    .optional(),
  earlyAccessPrice: z
    .number()
    .positive('Price must be positive')
    .max(999.99, 'Price must be at most 999.99')
    .optional(),
  categoryIds: z.array(z.number().positive()).optional(),
  tagIds: z.array(z.number().positive()).optional(),
});

export type CreateModInput = z.infer<typeof createModSchema>;

/**
 * Schema for updating a mod.
 */
export const updateModSchema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title must be at most 200 characters')
    .optional(),
  description: z.string().max(5000, 'Description must be at most 5000 characters').nullable().optional(),
  accessType: z
    .enum(['free', 'early_access'], {
      errorMap: () => ({ message: 'Access type must be either free or early_access' }),
    })
    .optional(),
  earlyAccessPrice: z
    .number()
    .positive('Price must be positive')
    .max(999.99, 'Price must be at most 999.99')
    .nullable()
    .optional(),
  status: z
    .enum(['draft', 'published', 'hidden', 'removed'], {
      errorMap: () => ({ message: 'Status must be one of: draft, published, hidden, removed' }),
    })
    .optional(),
  categoryIds: z.array(z.number().positive()).optional(),
  tagIds: z.array(z.number().positive()).optional(),
});

export type UpdateModInput = z.infer<typeof updateModSchema>;

/**
 * Schema for creating a mod version.
 */
export const createModVersionSchema = z.object({
  versionNumber: z
    .string()
    .regex(/^\d+\.\d+(\.\d+)?$/, 'Version must be in format X.Y or X.Y.Z'),
  changelog: z.string().max(5000, 'Changelog must be at most 5000 characters').optional(),
});

export type CreateModVersionInput = z.infer<typeof createModVersionSchema>;

/**
 * Schema for adding screenshots to a mod.
 */
export const addScreenshotSchema = z.object({
  caption: z.string().max(500, 'Caption must be at most 500 characters').optional(),
  displayOrder: z.number().nonnegative('Display order must be 0 or greater').optional(),
});

export type AddScreenshotInput = z.infer<typeof addScreenshotSchema>;

/**
 * Schema for pagination/filtering published mods.
 */
export const getPublishedModsSchema = z.object({
  page: z.coerce.number().positive().default(1),
  limit: z.coerce.number().positive().max(100).default(20),
  search: z.string().max(500).optional(),
  categoryIds: z
    .union([z.string(), z.array(z.coerce.number())])
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      if (typeof val === 'string') return val.split(',').map((v) => parseInt(v));
      return val;
    }),
  tagIds: z
    .union([z.string(), z.array(z.coerce.number())])
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      if (typeof val === 'string') return val.split(',').map((v) => parseInt(v));
      return val;
    }),
  sortBy: z.enum(['downloads', 'date', 'trending']).default('date'),
});

export type GetPublishedModsInput = z.infer<typeof getPublishedModsSchema>;
