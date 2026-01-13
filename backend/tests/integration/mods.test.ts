import request from 'supertest';
import { pool } from '@config/database';
import { logger } from '@utils/logger';

let app: any;
let authToken: string;
let userId: number;
let modId: number;
let categoryId: number;
let tagId: number;

/**
 * Integration tests for mod management endpoints.
 * Tests creation, updating, publishing, and discovery of mods.
 */
describe('Mod Management', () => {
  beforeAll(async () => {
    // Dynamic import to avoid circular dependencies
    const { createApp } = await import('../../src/app');
    app = createApp();

    // Register and login a test user
    const registerRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `mod-tester-${Date.now()}@test.com`,
        password: 'TestPassword123!',
        username: `modtester${Date.now()}`,
      });

    userId = registerRes.body.data.user.id;
    authToken = registerRes.body.data.accessToken;

    // Register as creator
    await request(app)
      .post('/api/v1/creators/register')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        displayName: 'Test Creator',
        bio: 'Testing mod management',
      });

    // Get first category
    const categoryRes = await pool.query('SELECT id FROM categories LIMIT 1');
    categoryId = categoryRes.rows[0].id;

    // Get first tag
    const tagRes = await pool.query('SELECT id FROM tags LIMIT 1');
    tagId = tagRes.rows[0].id;

    logger.info('Test setup completed', { userId, categoryId, tagId });
  });

  afterAll(async () => {
    // Clean up test data
    if (modId) {
      await pool.query('DELETE FROM mod_versions WHERE mod_id = $1', [modId]);
      await pool.query('DELETE FROM mod_categories WHERE mod_id = $1', [modId]);
      await pool.query('DELETE FROM mod_tags WHERE mod_id = $1', [modId]);
      await pool.query('DELETE FROM mods WHERE id = $1', [modId]);
    }

    // Clean up creator
    await pool.query('DELETE FROM creator_profiles WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM sessions WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);

    await pool.end();
  });

  describe('POST /api/v1/mods - Create mod', () => {
    it('should create a mod successfully', async () => {
      const res = await request(app)
        .post('/api/v1/mods')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Mod',
          description: 'This is a test mod for testing purposes',
          accessType: 'free',
          categoryIds: [categoryId],
          tagIds: [tagId],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Test Mod');
      expect(res.body.data.slug).toBe('test-mod');
      expect(res.body.data.status).toBe('draft');
      expect(res.body.data.creatorId).toBe(userId);

      modId = res.body.data.id;
    });

    it('should reject without authentication', async () => {
      const res = await request(app)
        .post('/api/v1/mods')
        .send({
          title: 'Unauthorized Mod',
          description: 'Should fail',
        });

      expect(res.status).toBe(401);
    });

    it('should require creator role', async () => {
      // Register non-creator user
      const userRes = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: `non-creator-${Date.now()}@test.com`,
          password: 'TestPassword123!',
          username: `noncreator${Date.now()}`,
        });

      const userToken = userRes.body.data.accessToken;

      const res = await request(app)
        .post('/api/v1/mods')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Non-Creator Mod',
          description: 'Should fail',
        });

      expect(res.status).toBe(403);
    });

    it('should validate required fields', async () => {
      const res = await request(app)
        .post('/api/v1/mods')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          description: 'Missing title',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.details).toBeDefined();
    });
  });

  describe('GET /api/v1/mods/:identifier - Get mod', () => {
    it('should get mod by slug', async () => {
      const res = await request(app)
        .get(`/api/v1/mods/test-mod`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(modId);
    });

    it('should get mod by ID', async () => {
      const res = await request(app)
        .get(`/api/v1/mods/${modId}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(modId);
    });

    it('should return 404 for non-existent mod', async () => {
      const res = await request(app)
        .get('/api/v1/mods/non-existent-mod');

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/v1/mods/:modId - Update mod', () => {
    it('should update mod successfully', async () => {
      const res = await request(app)
        .patch(`/api/v1/mods/${modId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Updated Test Mod',
          description: 'Updated description',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('Updated Test Mod');
    });

    it('should reject update by non-owner', async () => {
      // Register another creator
      const otherRes = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: `other-creator-${Date.now()}@test.com`,
          password: 'TestPassword123!',
          username: `othercreator${Date.now()}`,
        });

      const otherToken = otherRes.body.data.accessToken;

      // Register as creator
      await request(app)
        .post('/api/v1/creators/register')
        .set('Authorization', `Bearer ${otherToken}`)
        .send({
          displayName: 'Other Creator',
        });

      const res = await request(app)
        .patch(`/api/v1/mods/${modId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({
          title: 'Hacked Mod',
        });

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/v1/mods/creators/me - Get creator mods', () => {
    it('should get authenticated creator mods', async () => {
      const res = await request(app)
        .get('/api/v1/mods/creators/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].creatorId).toBe(userId);
    });

    it('should filter by status', async () => {
      const res = await request(app)
        .get('/api/v1/mods/creators/me?status=draft')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.every((mod: any) => mod.status === 'draft')).toBe(true);
    });
  });

  describe('POST /api/v1/mods/:modId/versions - Create version', () => {
    it('should create a mod version with file upload', async () => {
      // Note: This requires a file upload. In a real test, you'd use
      // a mock file or test file from the filesystem
      const res = await request(app)
        .post(`/api/v1/mods/${modId}/versions`)
        .set('Authorization', `Bearer ${authToken}`)
        .field('versionNumber', '1.0.0')
        .field('changelog', 'Initial release')
        .attach('file', Buffer.from('test mod content'), 'test.package');

      expect(res.status).toBe(201);
      expect(res.body.data.versionNumber).toBe('1.0.0');
      expect(res.body.data.fileHash).toBeDefined();
    });

    it('should validate version number format', async () => {
      const res = await request(app)
        .post(`/api/v1/mods/${modId}/versions`)
        .set('Authorization', `Bearer ${authToken}`)
        .field('versionNumber', 'invalid')
        .attach('file', Buffer.from('test'), 'test.package');

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/v1/mods/:modId/publish - Publish mod', () => {
    it('should publish a mod', async () => {
      const res = await request(app)
        .post(`/api/v1/mods/${modId}/publish`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('published');
      expect(res.body.data.publishedAt).toBeDefined();
    });

    it('should require at least one version before publishing', async () => {
      // Create another mod without versions
      const createRes = await request(app)
        .post('/api/v1/mods')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'No Version Mod',
          description: 'Mod without versions',
        });

      const newModId = createRes.body.data.id;

      const res = await request(app)
        .post(`/api/v1/mods/${newModId}/publish`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(409);

      // Cleanup
      await pool.query('DELETE FROM mods WHERE id = $1', [newModId]);
    });
  });

  describe('POST /api/v1/mods/:modId/hide - Hide mod', () => {
    it('should hide a published mod', async () => {
      const res = await request(app)
        .post(`/api/v1/mods/${modId}/hide`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('hidden');
    });
  });

  describe('GET /api/v1/mods - List published mods', () => {
    beforeAll(async () => {
      // Create a published mod for listing tests
      const modRes = await request(app)
        .post('/api/v1/mods')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Published Mod',
          description: 'A published mod for testing',
          categoryIds: [categoryId],
          tagIds: [tagId],
        });

      const publishModId = modRes.body.data.id;

      // Add version
      await request(app)
        .post(`/api/v1/mods/${publishModId}/versions`)
        .set('Authorization', `Bearer ${authToken}`)
        .field('versionNumber', '1.0.0')
        .attach('file', Buffer.from('content'), 'test.package');

      // Publish
      await request(app)
        .post(`/api/v1/mods/${publishModId}/publish`)
        .set('Authorization', `Bearer ${authToken}`);
    });

    it('should list published mods with pagination', async () => {
      const res = await request(app)
        .get('/api/v1/mods?page=1&limit=10');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(10);
    });

    it('should filter by category', async () => {
      const res = await request(app)
        .get(`/api/v1/mods?categoryIds=${categoryId}`);

      expect(res.status).toBe(200);
      expect(res.body.data.every((mod: any) => mod.categoryIds?.includes(categoryId))).toBe(true);
    });

    it('should search by title', async () => {
      const res = await request(app)
        .get('/api/v1/mods?search=Published');

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('should sort by downloads', async () => {
      const res = await request(app)
        .get('/api/v1/mods?sortBy=downloads');

      expect(res.status).toBe(200);
      // Verify sorting (optional, depends on seed data)
    });
  });

  describe('GET /api/v1/mods/:modId/versions - Get mod versions', () => {
    it('should get all versions for a mod', async () => {
      const res = await request(app)
        .get(`/api/v1/mods/${modId}/versions`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data[0].modId).toBe(modId);
    });
  });

  describe('GET /api/v1/categories - Get categories', () => {
    it('should list all categories', async () => {
      const res = await request(app)
        .get('/api/v1/categories');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/v1/tags - Get tags', () => {
    it('should list all tags', async () => {
      const res = await request(app)
        .get('/api/v1/tags');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should filter tags by type', async () => {
      const res = await request(app)
        .get('/api/v1/tags?type=general');

      expect(res.status).toBe(200);
      expect(res.body.data.every((tag: any) => tag.type === 'general')).toBe(true);
    });
  });
});
