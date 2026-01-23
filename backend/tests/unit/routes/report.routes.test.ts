/**
 * Unit tests for Report routes
 * Tests route configuration and endpoint registration
 */

import { Router } from 'express';
import { createReportRoutes } from '@routes/report.routes';

// Mock the controller
jest.mock('@controllers/ReportController', () => ({
  reportController: {
    submitReport: jest.fn(),
    getWarningStatus: jest.fn(),
    getBatchWarnings: jest.fn(),
    getCreatorBanStatus: jest.fn(),
  },
}));

// Mock the middleware
jest.mock('@middleware/errorMiddleware', () => ({
  asyncHandler: (fn: any) => fn,
}));

describe('Report Routes', () => {
  describe('createReportRoutes', () => {
    it('should return a Router instance', () => {
      const router = createReportRoutes();
      expect(router).toBeDefined();
    });

    it('should register POST /reports/:modId route', () => {
      const router = createReportRoutes();
      const routes = getRoutes(router);

      expect(routes.some((r: any) => r.path === '/reports/:modId' && r.methods.post)).toBe(true);
    });

    it('should register GET /mods/:modId/warning route', () => {
      const router = createReportRoutes();
      const routes = getRoutes(router);

      expect(routes.some((r: any) => r.path === '/mods/:modId/warning' && r.methods.get)).toBe(true);
    });

    it('should register POST /mods/batch-warnings route', () => {
      const router = createReportRoutes();
      const routes = getRoutes(router);

      expect(routes.some((r: any) => r.path === '/mods/batch-warnings' && r.methods.post)).toBe(true);
    });

    it('should register GET /creators/:id/ban-status route', () => {
      const router = createReportRoutes();
      const routes = getRoutes(router);

      expect(routes.some((r: any) => r.path === '/creators/:id/ban-status' && r.methods.get)).toBe(true);
    });

    it('should have exactly 4 routes', () => {
      const router = createReportRoutes();
      const routes = getRoutes(router);

      expect(routes.length).toBe(4);
    });
  });
});

/**
 * Helper to extract routes from an Express router
 */
function getRoutes(router: Router): Array<{ path: string; methods: Record<string, boolean> }> {
  const routes: Array<{ path: string; methods: Record<string, boolean> }> = [];

  router.stack.forEach((layer: any) => {
    if (layer.route) {
      routes.push({
        path: layer.route.path,
        methods: layer.route.methods,
      });
    }
  });

  return routes;
}
