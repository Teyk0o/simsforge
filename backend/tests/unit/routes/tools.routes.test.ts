/**
 * Unit tests for Tools routes
 * Tests route configuration and endpoint registration
 */

import { Router } from 'express';
import { createToolsRoutes } from '@routes/tools.routes';

// Mock the controller
jest.mock('@controllers/ToolsController', () => ({
  toolsController: {
    getMetadata: jest.fn(),
    downloadFile: jest.fn(),
    listFiles: jest.fn(),
  },
}));

// Mock the middleware
jest.mock('@middleware/errorMiddleware', () => ({
  asyncHandler: (fn: any) => fn,
}));

/**
 * Helper to extract routes from router
 */
function getRoutes(router: Router): any[] {
  const routes: any[] = [];

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

describe('Tools Routes', () => {
  describe('createToolsRoutes', () => {
    it('should return a Router instance', () => {
      const router = createToolsRoutes();
      expect(router).toBeDefined();
    });

    it('should register GET /:toolId/metadata route', () => {
      const router = createToolsRoutes();
      const routes = getRoutes(router);

      expect(routes.some((r: any) => r.path === '/:toolId/metadata' && r.methods.get)).toBe(true);
    });

    it('should register GET /:toolId/files route', () => {
      const router = createToolsRoutes();
      const routes = getRoutes(router);

      expect(routes.some((r: any) => r.path === '/:toolId/files' && r.methods.get)).toBe(true);
    });

    it('should register GET /:toolId/download/:filename route', () => {
      const router = createToolsRoutes();
      const routes = getRoutes(router);

      expect(routes.some((r: any) => r.path === '/:toolId/download/:filename' && r.methods.get)).toBe(true);
    });

    it('should register exactly 3 routes', () => {
      const router = createToolsRoutes();
      const routes = getRoutes(router);

      expect(routes).toHaveLength(3);
    });
  });
});
