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

  // Database
  DATABASE_HOST: z.string().default('localhost'),
  DATABASE_PORT: z.string().default('5432').transform(Number),
  DATABASE_NAME: z.string(),
  DATABASE_USER: z.string(),
  DATABASE_PASSWORD: z.string(),

  // JWT
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('30d'),

  // File Upload
  UPLOAD_PATH: z.string().default('./uploads'),
  MAX_FILE_SIZE: z.string().default('104857600').transform(Number),
  ALLOWED_FILE_TYPES: z.string().default('.package,.ts4script,.zip'),

  // CORS
  ALLOWED_ORIGINS: z.string().transform((val) => val.split(',')),

  // Payment
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  PLATFORM_COMMISSION_RATE: z
    .string()
    .default('0.15')
    .transform(Number),

  // Email
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().transform(Number).optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  EMAIL_FROM: z.string().optional(),

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

  // Encryption
  ENCRYPTION_KEY: z.string().length(64, 'ENCRYPTION_KEY must be 64 hex characters (32 bytes)'),
});

export type Environment = z.infer<typeof envSchema>;

/**
 * Validates and exports environment variables.
 * Throws error if validation fails.
 */
export const env: Environment = envSchema.parse(process.env);
