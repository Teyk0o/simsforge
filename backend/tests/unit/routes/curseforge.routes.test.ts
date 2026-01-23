/**
 * Unit tests for CurseForge routes
 * Tests route configuration and endpoint registration
 */

import { Router } from 'express';
import { createCurseForgeRoutes } from '@routes/curseforge.routes';

// Mock the controller
jest.mock('@controllers/CurseForgeController', () => ({
  curseForgeController: {
    getCategories: jest.fn(),
    searchMods: jest.fn(),
    getMod: jest.fn(),
    getDownloadUrl: jest.fn(),
    getLatestVersions: jest.fn(),
  },
}));

// Mock the middleware
jest.mock('@middleware/errorMiddleware', () => ({
  asyncHandler: (fn: any) => fn,
}));

describe('CurseForge Routes', () => {
  describe('createCurseForgeRoutes', () => {
    it('should return a Router instance', () => {
      const router = createCurseForgeRoutes();
      expect(router).toBeDefined();
    });

    it('should register GET /categories route', () => {
      const router = createCurseForgeRoutes();
      const routes = getRoutes(router);

      expect(routes.some((r: any) => r.path === '/categories' && r.methods.get)).toBe(true);
    });

    it('should register GET /search route', () => {
      const router = createCurseForgeRoutes();
      const routes = getRoutes(router);

      expect(routes.some((r: any) => r.path === '/search' && r.methods.get)).toBe(true);
    });

    it('should register GET /:modId route', () => {
      const router = createCurseForgeRoutes();
      const routes = getRoutes(router);

      expect(routes.some((r: any) => r.path === '/:modId' && r.methods.get)).toBe(true);
    });

    it('should register POST /download-url route', () => {
      const router = createCurseForgeRoutes();
      const routes = getRoutes(router);

      expect(routes.some((r: any) => r.path === '/download-url' && r.methods.post)).toBe(true);
    });

    it('should register POST /batch-versions route', () => {
      const router = createCurseForgeRoutes();
      const routes = getRoutes(router);

      expect(routes.some((r: any) => r.path === '/batch-versions' && r.methods.post)).toBe(true);
    });

    it('should have exactly 5 routes', () => {
      const router = createCurseForgeRoutes();
      const routes = getRoutes(router);

      expect(routes.length).toBe(5);
    });
  });

  describe('route handlers delegation', () => {
    const { curseForgeController } = require('@controllers/CurseForgeController');

    const mockReq = {} as any;
    const mockRes = {} as any;

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should delegate GET /categories to controller.getCategories', () => {
      const router = createCurseForgeRoutes();
      const handler = getHandler(router, '/categories', 'get');

      handler(mockReq, mockRes);

      expect(curseForgeController.getCategories).toHaveBeenCalledWith(mockReq, mockRes);
    });

    it('should delegate GET /search to controller.searchMods', () => {
      const router = createCurseForgeRoutes();
      const handler = getHandler(router, '/search', 'get');

      handler(mockReq, mockRes);

      expect(curseForgeController.searchMods).toHaveBeenCalledWith(mockReq, mockRes);
    });

    it('should delegate GET /:modId to controller.getMod', () => {
      const router = createCurseForgeRoutes();
      const handler = getHandler(router, '/:modId', 'get');

      handler(mockReq, mockRes);

      expect(curseForgeController.getMod).toHaveBeenCalledWith(mockReq, mockRes);
    });

    it('should delegate POST /download-url to controller.getDownloadUrl', () => {
      const router = createCurseForgeRoutes();
      const handler = getHandler(router, '/download-url', 'post');

      handler(mockReq, mockRes);

      expect(curseForgeController.getDownloadUrl).toHaveBeenCalledWith(mockReq, mockRes);
    });

    it('should delegate POST /batch-versions to controller.getLatestVersions', () => {
      const router = createCurseForgeRoutes();
      const handler = getHandler(router, '/batch-versions', 'post');

      handler(mockReq, mockRes);

      expect(curseForgeController.getLatestVersions).toHaveBeenCalledWith(mockReq, mockRes);
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
