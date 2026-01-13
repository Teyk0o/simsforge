import request from 'supertest';
import { createApp } from '@/app';

/**
 * Authentication API integration tests.
 * Tests complete auth flows: register, login, refresh, logout, password reset.
 */
describe('Authentication API', () => {
  const app = createApp();
  const baseUrl = '/api/v1/auth';

  // Test data
  const testUser = {
    email: 'test@example.com',
    username: 'testuser',
    password: 'TestPassword123!',
  };

  const invalidPassword = 'short';

  describe('POST /register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app).post(`${baseUrl}/register`).send(testUser);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('tokens');
      expect(response.body.data.user.email).toBe(testUser.email);
      expect(response.body.data.user.username).toBe(testUser.username);
      expect(response.body.data.tokens).toHaveProperty('accessToken');
      expect(response.body.data.tokens).toHaveProperty('refreshToken');
    });

    it('should fail with invalid email', async () => {
      const response = await request(app)
        .post(`${baseUrl}/register`)
        .send({
          email: 'invalid-email',
          username: 'testuser2',
          password: 'TestPassword123!',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    it('should fail with short password', async () => {
      const response = await request(app)
        .post(`${baseUrl}/register`)
        .send({
          email: 'test2@example.com',
          username: 'testuser3',
          password: invalidPassword,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    it('should fail with short username', async () => {
      const response = await request(app)
        .post(`${baseUrl}/register`)
        .send({
          email: 'test3@example.com',
          username: 'ab',
          password: 'TestPassword123!',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    it('should fail if email already exists', async () => {
      // First registration
      await request(app).post(`${baseUrl}/register`).send(testUser);

      // Attempt duplicate email
      const response = await request(app)
        .post(`${baseUrl}/register`)
        .send({
          email: testUser.email,
          username: 'differentuser',
          password: 'TestPassword123!',
        });

      expect(response.status).toBe(409);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('POST /login', () => {
    beforeAll(async () => {
      // Register test user
      await request(app).post(`${baseUrl}/register`).send(testUser);
    });

    it('should login successfully with correct credentials', async () => {
      const response = await request(app)
        .post(`${baseUrl}/login`)
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('tokens');
      expect(response.body.data.user.email).toBe(testUser.email);
      expect(response.body.data.tokens).toHaveProperty('accessToken');
      expect(response.body.data.tokens).toHaveProperty('refreshToken');
    });

    it('should fail with invalid email', async () => {
      const response = await request(app)
        .post(`${baseUrl}/login`)
        .send({
          email: 'nonexistent@example.com',
          password: testUser.password,
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBeDefined();
    });

    it('should fail with incorrect password', async () => {
      const response = await request(app)
        .post(`${baseUrl}/login`)
        .send({
          email: testUser.email,
          password: 'WrongPassword123!',
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBeDefined();
    });

    it('should fail if email is missing', async () => {
      const response = await request(app)
        .post(`${baseUrl}/login`)
        .send({
          password: testUser.password,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    it('should fail if password is missing', async () => {
      const response = await request(app)
        .post(`${baseUrl}/login`)
        .send({
          email: testUser.email,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('POST /refresh', () => {
    let refreshToken: string;

    beforeAll(async () => {
      // Register and login to get refresh token
      const registerResponse = await request(app)
        .post(`${baseUrl}/register`)
        .send({
          email: 'refreshtest@example.com',
          username: 'refreshtestuser',
          password: 'TestPassword123!',
        });

      refreshToken = registerResponse.body.data.tokens.refreshToken;
    });

    it('should refresh tokens successfully', async () => {
      const response = await request(app)
        .post(`${baseUrl}/refresh`)
        .send({
          refreshToken,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
    });

    it('should fail with invalid refresh token', async () => {
      const response = await request(app)
        .post(`${baseUrl}/refresh`)
        .send({
          refreshToken: 'invalid.token.here',
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBeDefined();
    });

    it('should fail if refresh token is missing', async () => {
      const response = await request(app).post(`${baseUrl}/refresh`).send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('POST /logout', () => {
    let accessToken: string;
    let refreshToken: string;

    beforeAll(async () => {
      // Register and login to get tokens
      const loginResponse = await request(app)
        .post(`${baseUrl}/register`)
        .send({
          email: 'logouttest@example.com',
          username: 'logouttestuser',
          password: 'TestPassword123!',
        });

      accessToken = loginResponse.body.data.tokens.accessToken;
      refreshToken = loginResponse.body.data.tokens.refreshToken;
    });

    it('should logout successfully', async () => {
      const response = await request(app)
        .post(`${baseUrl}/logout`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          refreshToken,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .post(`${baseUrl}/logout`)
        .send({
          refreshToken,
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('POST /forgot-password', () => {
    beforeAll(async () => {
      // Register test user
      await request(app)
        .post(`${baseUrl}/register`)
        .send({
          email: 'forgotpassword@example.com',
          username: 'forgotpassworduser',
          password: 'TestPassword123!',
        });
    });

    it('should request password reset successfully', async () => {
      const response = await request(app)
        .post(`${baseUrl}/forgot-password`)
        .send({
          email: 'forgotpassword@example.com',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBeDefined();
    });

    it('should not reveal if email exists', async () => {
      const response = await request(app)
        .post(`${baseUrl}/forgot-password`)
        .send({
          email: 'nonexistent@example.com',
        });

      // Should still return 200 to prevent email enumeration
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should fail with invalid email format', async () => {
      const response = await request(app)
        .post(`${baseUrl}/forgot-password`)
        .send({
          email: 'invalid-email',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('POST /reset-password', () => {
    it('should fail with invalid reset token', async () => {
      const response = await request(app)
        .post(`${baseUrl}/reset-password`)
        .send({
          token: 'invalid.reset.token',
          newPassword: 'NewPassword123!',
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBeDefined();
    });

    it('should fail with short new password', async () => {
      const response = await request(app)
        .post(`${baseUrl}/reset-password`)
        .send({
          token: 'valid.token.format.but.invalid',
          newPassword: 'short',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });
  });
});
