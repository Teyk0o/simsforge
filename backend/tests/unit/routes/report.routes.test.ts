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

  describe('route handlers delegation', () => {
    const { reportController } = require('../../../src/controllers/ReportController');

    const mockReq = {} as any;
    const mockRes = {} as any;

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should delegate POST /reports/:modId to controller.submitReport', () => {
      const router = createReportRoutes();
      const handler = getHandler(router, '/reports/:modId', 'post');

      handler(mockReq, mockRes);

      expect(reportController.submitReport).toHaveBeenCalledWith(mockReq, mockRes);
    });

    it('should delegate GET /mods/:modId/warning to controller.getWarningStatus', () => {
      const router = createReportRoutes();
      const handler = getHandler(router, '/mods/:modId/warning', 'get');

      handler(mockReq, mockRes);

      expect(reportController.getWarningStatus).toHaveBeenCalledWith(mockReq, mockRes);
    });

    it('should delegate POST /mods/batch-warnings to controller.getBatchWarnings', () => {
      const router = createReportRoutes();
      const handler = getHandler(router, '/mods/batch-warnings', 'post');

      handler(mockReq, mockRes);

      expect(reportController.getBatchWarnings).toHaveBeenCalledWith(mockReq, mockRes);
    });

    it('should delegate GET /creators/:id/ban-status to controller.getCreatorBanStatus', () => {
      const router = createReportRoutes();
      const handler = getHandler(router, '/creators/:id/ban-status', 'get');

      handler(mockReq, mockRes);

      expect(reportController.getCreatorBanStatus).toHaveBeenCalledWith(mockReq, mockRes);
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

/**
 * Helper to extract a route handler function from a router
 */
function getHandler(router: Router, path: string, method: string): Function {
  const layer = (router as any).stack.find(
    (l: any) => l.route && l.route.path === path && l.route.methods[method]
  );
  return layer.route.stack[0].handle;
}
