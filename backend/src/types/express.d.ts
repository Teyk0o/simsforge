import { Request } from 'express';

/**
 * Extended Express Request object with authenticated user data.
 * Set by authMiddleware when JWT is verified.
 */
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
        username: string;
        role: 'user' | 'creator' | 'admin';
        isActive: boolean;
      };
    }
  }
}
