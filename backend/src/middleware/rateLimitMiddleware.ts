import rateLimit from 'express-rate-limit';
import { env } from '@config/environment';

/**
 * Global API rate limiter.
 * Limits requests across all endpoints to prevent abuse.
 */
export const apiLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS, // Time window (default: 15 minutes)
  max: env.RATE_LIMIT_MAX_REQUESTS, // Max requests per window (default: 100)
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in RateLimit-* headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
});
