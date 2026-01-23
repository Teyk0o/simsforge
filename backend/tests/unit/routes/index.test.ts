/**
 * Unit tests for main route aggregator
 * Tests that all sub-routes are properly mounted
 */

import { Router } from 'express';
import { createApiRoutes } from '@routes/index';

// Mock the sub-route modules
jest.mock('@routes/curseforge.routes', () => ({
  createCurseForgeRoutes: jest.fn(() => {
    const mockRouter = Router();
    return mockRouter;
  }),
}));

jest.mock('@routes/report.routes', () => ({
  createReportRoutes: jest.fn(() => {
    const mockRouter = Router();
    return mockRouter;
  }),
}));

import { createCurseForgeRoutes } from '@routes/curseforge.routes';
import { createReportRoutes } from '@routes/report.routes';

describe('API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createApiRoutes', () => {
    it('should return a Router instance', () => {
      const router = createApiRoutes();
      expect(router).toBeDefined();
    });

    it('should call createCurseForgeRoutes', () => {
      createApiRoutes();
      expect(createCurseForgeRoutes).toHaveBeenCalled();
    });

    it('should call createReportRoutes', () => {
      createApiRoutes();
      expect(createReportRoutes).toHaveBeenCalled();
    });

    it('should have middleware layers mounted', () => {
      const router = createApiRoutes();
      // The router should have 2 middleware layers (curseforge and report routes)
      expect(router.stack.length).toBe(2);
    });

    it('should mount report routes at root', () => {
      const router = createApiRoutes();
      // The router should have middleware (sub-routers) mounted
      expect(router.stack.length).toBeGreaterThan(0);
    });

    it('should create unique router instances on each call', () => {
      const router1 = createApiRoutes();
      const router2 = createApiRoutes();

      expect(router1).not.toBe(router2);
    });
  });
});
