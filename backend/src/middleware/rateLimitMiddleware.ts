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
  // Store in memory (in production, use Redis)
});

/**
 * Stricter rate limiter for authentication endpoints.
 * Prevents brute force attacks on login.
 * 5 attempts per 15 minutes.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts max
  message:
    'Too many authentication attempts. Please try again after 15 minutes.',
  skipSuccessfulRequests: false, // Don't skip on successful login
  skipFailedRequests: false, // Don't skip on failed login
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for password reset requests.
 * Prevents spam of password reset emails.
 * 3 attempts per hour.
 */
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message:
    'Too many password reset requests. Please try again after 1 hour.',
  skipSuccessfulRequests: true, // Only count failed attempts
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for file uploads.
 * Prevents spam uploads from single IP.
 * 10 uploads per hour per user.
 */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message:
    'Too many uploads. Maximum 10 uploads per hour.',
  standardHeaders: true,
  legacyHeaders: false,
});
