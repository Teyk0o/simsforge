import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Environment variables validation schema using Zod.
 * All required variables are validated at startup.
 * Application will fail fast if any required variable is missing or invalid.
 */
const envSchema = z.object({
  // Server
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.string().default('5000').transform(Number),
  API_BASE_URL: z.string().url().default('http://localhost:5000'),

  // CORS
  ALLOWED_ORIGINS: z.string().transform((val) => val.split(',')),

  // Redis (for caching)
  REDIS_URL: z.string().optional(),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z
    .string()
    .default('900000')
    .transform(Number),
  RATE_LIMIT_MAX_REQUESTS: z
    .string()
    .default('100')
    .transform(Number),

  // Logging
  LOG_LEVEL: z
    .enum(['error', 'warn', 'info', 'debug', 'verbose', 'silly'])
    .default('info'),
});

export type Environment = z.infer<typeof envSchema>;

/**
 * Validates and exports environment variables.
 * Throws error if validation fails.
 */
export const env: Environment = envSchema.parse(process.env);
