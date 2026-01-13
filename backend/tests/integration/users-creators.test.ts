import request from 'supertest';
import { createApp } from '@/app';

/**
 * User and Creator API integration tests.
 * Tests complete flows: profile management and creator registration.
 */
describe('Users and Creators API', () => {
  const app = createApp();
  let accessToken: string;
  let userId: number;

  beforeAll(async () => {
    // Register and login test user
    const registerResponse = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'usercreator@example.com',
        username: 'usercreator',
        password: 'TestPassword123!',
      });

    accessToken = registerResponse.body.data.tokens.accessToken;
    userId = registerResponse.body.data.user.id;
  });

  describe('User Profile', () => {
    describe('GET /api/v1/users/me', () => {
      it('should get authenticated user profile', async () => {
        const response = await request(app)
          .get('/api/v1/users/me')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('id');
        expect(response.body.data).toHaveProperty('email');
        expect(response.body.data).toHaveProperty('username');
        expect(response.body.data).toHaveProperty('role');
        expect(response.body.data.email).toBe('usercreator@example.com');
        expect(response.body.data.username).toBe('usercreator');
        // Should not return password hash
        expect(response.body.data).not.toHaveProperty('passwordHash');
      });

      it('should fail without authentication', async () => {
        const response = await request(app).get('/api/v1/users/me');

        expect(response.status).toBe(401);
        expect(response.body.error).toBeDefined();
      });

      it('should fail with invalid token', async () => {
        const response = await request(app)
          .get('/api/v1/users/me')
          .set('Authorization', 'Bearer invalid.token.here');

        expect(response.status).toBe(401);
        expect(response.body.error).toBeDefined();
      });
    });

    describe('PATCH /api/v1/users/me', () => {
      it('should update user profile successfully', async () => {
        const response = await request(app)
          .patch('/api/v1/users/me')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            username: 'updatedusername',
            preferredLanguage: 'fr',
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.username).toBe('updatedusername');
        expect(response.body.data.preferredLanguage).toBe('fr');
      });

      it('should fail with invalid username (too short)', async () => {
        const response = await request(app)
          .patch('/api/v1/users/me')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            username: 'ab',
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toBeDefined();
      });

      it('should fail with invalid language code', async () => {
        const response = await request(app)
          .patch('/api/v1/users/me')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            preferredLanguage: 'xx',
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toBeDefined();
      });

      it('should fail without authentication', async () => {
        const response = await request(app)
          .patch('/api/v1/users/me')
          .send({
            username: 'newusername',
          });

        expect(response.status).toBe(401);
        expect(response.body.error).toBeDefined();
      });

      it('should allow avatar URL update', async () => {
        const response = await request(app)
          .patch('/api/v1/users/me')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            avatarUrl: 'https://example.com/avatar.jpg',
          });

        expect(response.status).toBe(200);
        expect(response.body.data.avatarUrl).toBe('https://example.com/avatar.jpg');
      });
    });
  });

  describe('Creator Registration & Profile', () => {
    let creatorAccessToken: string;
    let creatorUserId: number;

    beforeAll(async () => {
      // Register separate creator test user
      const registerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'creator@example.com',
          username: 'testcreator',
          password: 'TestPassword123!',
        });

      creatorAccessToken = registerResponse.body.data.tokens.accessToken;
      creatorUserId = registerResponse.body.data.user.id;
    });

    describe('POST /api/v1/creators/register', () => {
      it('should register user as creator successfully', async () => {
        const response = await request(app)
          .post('/api/v1/creators/register')
          .set('Authorization', `Bearer ${creatorAccessToken}`)
          .send({
            displayName: 'Amazing Creator',
            bio: 'I create amazing Sims 4 mods',
          });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('id');
        expect(response.body.data).toHaveProperty('userId');
        expect(response.body.data.displayName).toBe('Amazing Creator');
        expect(response.body.data.bio).toBe('I create amazing Sims 4 mods');
        expect(response.body.data.userId).toBe(creatorUserId);
      });

      it('should fail without display name', async () => {
        const response = await request(app)
          .post('/api/v1/creators/register')
          .set('Authorization', `Bearer ${creatorAccessToken}`)
          .send({
            bio: 'Some bio',
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toBeDefined();
      });

      it('should fail with short display name', async () => {
        const response = await request(app)
          .post('/api/v1/creators/register')
          .set('Authorization', `Bearer ${creatorAccessToken}`)
          .send({
            displayName: 'A',
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toBeDefined();
      });

      it('should fail without authentication', async () => {
        const response = await request(app)
          .post('/api/v1/creators/register')
          .send({
            displayName: 'Creator Name',
          });

        expect(response.status).toBe(401);
        expect(response.body.error).toBeDefined();
      });

      it('should fail if user is already a creator', async () => {
        // Try to register again
        const response = await request(app)
          .post('/api/v1/creators/register')
          .set('Authorization', `Bearer ${creatorAccessToken}`)
          .send({
            displayName: 'Another Name',
          });

        expect(response.status).toBe(409);
        expect(response.body.error).toBeDefined();
      });
    });

    describe('GET /api/v1/creators/me', () => {
      it('should get own creator profile', async () => {
        const response = await request(app)
          .get('/api/v1/creators/me')
          .set('Authorization', `Bearer ${creatorAccessToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.displayName).toBe('Amazing Creator');
        expect(response.body.data.bio).toBe('I create amazing Sims 4 mods');
      });

      it('should fail without authentication', async () => {
        const response = await request(app).get('/api/v1/creators/me');

        expect(response.status).toBe(401);
        expect(response.body.error).toBeDefined();
      });

      it('should fail if user is not a creator', async () => {
        const response = await request(app)
          .get('/api/v1/creators/me')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(404);
        expect(response.body.error).toBeDefined();
      });
    });

    describe('GET /api/v1/creators/:username', () => {
      it('should get public creator profile by username', async () => {
        const response = await request(app).get('/api/v1/creators/testcreator');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.displayName).toBe('Amazing Creator');
        expect(response.body.data.bio).toBe('I create amazing Sims 4 mods');
        // Should not include totalRevenue in public profile
        expect(response.body.data).not.toHaveProperty('totalRevenue');
      });

      it('should fail with non-existent username', async () => {
        const response = await request(app).get('/api/v1/creators/nonexistentusername');

        expect(response.status).toBe(404);
        expect(response.body.error).toBeDefined();
      });
    });

    describe('PATCH /api/v1/creators/me', () => {
      it('should update creator profile successfully', async () => {
        const response = await request(app)
          .patch('/api/v1/creators/me')
          .set('Authorization', `Bearer ${creatorAccessToken}`)
          .send({
            displayName: 'Updated Creator Name',
            bio: 'Updated bio',
            patreonUrl: 'https://patreon.com/creator',
            twitterUrl: 'https://twitter.com/creator',
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.displayName).toBe('Updated Creator Name');
        expect(response.body.data.bio).toBe('Updated bio');
        expect(response.body.data.patreonUrl).toBe('https://patreon.com/creator');
        expect(response.body.data.twitterUrl).toBe('https://twitter.com/creator');
      });

      it('should fail with invalid URL', async () => {
        const response = await request(app)
          .patch('/api/v1/creators/me')
          .set('Authorization', `Bearer ${creatorAccessToken}`)
          .send({
            patreonUrl: 'not-a-valid-url',
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toBeDefined();
      });

      it('should fail without authentication', async () => {
        const response = await request(app)
          .patch('/api/v1/creators/me')
          .send({
            displayName: 'Updated Name',
          });

        expect(response.status).toBe(401);
        expect(response.body.error).toBeDefined();
      });

      it('should fail if user is not a creator', async () => {
        const response = await request(app)
          .patch('/api/v1/creators/me')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            displayName: 'Updated Name',
          });

        expect(response.status).toBe(404);
        expect(response.body.error).toBeDefined();
      });
    });
  });
});
