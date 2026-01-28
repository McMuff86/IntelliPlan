import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// ---------------------------------------------------------------------------
// Mocks – must be declared before imports that trigger side-effects
// ---------------------------------------------------------------------------

// 1. Database pool
vi.mock('../../config/database', () => ({
  pool: { query: vi.fn() },
}));

// 2. bcryptjs – fast stubs instead of real hashing
vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn(async (pw: string) => `hashed:${pw}`),
    compare: vi.fn(async (pw: string, hash: string) => hash === `hashed:${pw}`),
  },
}));

// 3. Rate limiters – pass-through so tests aren't throttled
vi.mock('../../middleware/rateLimiter', () => ({
  globalLimiter: (_req: any, _res: any, next: any) => next(),
  authLimiter: (_req: any, _res: any, next: any) => next(),
}));

// 4. Email service – no-op
vi.mock('../../services/emailService', () => ({
  sendVerificationEmail: vi.fn(async () => true),
  sendPasswordResetEmail: vi.fn(async () => true),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------
import app from '../../app';
import { pool } from '../../config/database';
import { clearTokenBlacklist } from '../../services/authService';

const mockedPool = vi.mocked(pool);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_UUID = 'a1b2c3d4-e5f6-1a2b-8c3d-4e5f6a7b8c9d';

const makeUser = (overrides: Record<string, any> = {}) => ({
  id: VALID_UUID,
  email: 'test@example.com',
  name: 'Test User',
  role: 'single',
  team_id: null,
  timezone: 'UTC',
  password_hash: 'hashed:Password123',
  email_verified_at: new Date(),
  email_verification_token: null,
  email_verification_expires_at: null,
  password_reset_token: null,
  password_reset_expires_at: null,
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides,
});

/** Obtain a valid JWT by performing a login with mocked DB */
async function loginAndGetToken(): Promise<string> {
  const user = makeUser();

  // getUserByEmail
  mockedPool.query.mockResolvedValueOnce({ rows: [user], rowCount: 1 } as any);

  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'test@example.com', password: 'Password123' });

  return res.body.data.token;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Auth Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearTokenBlacklist();
  });

  // -----------------------------------------------------------------------
  // 1. Registration
  // -----------------------------------------------------------------------
  describe('POST /api/auth/register', () => {
    it('should register a new user and return 201 with token and user', async () => {
      const user = makeUser({ email: 'new@example.com', name: 'New User' });

      // getUserByEmail → no existing user
      mockedPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);
      // createUser → returns the new user
      mockedPool.query.mockResolvedValueOnce({ rows: [user], rowCount: 1 } as any);

      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'New User', email: 'new@example.com', password: 'Password123' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.email).toBe('new@example.com');
    });

    it('should return 409 when email is already registered', async () => {
      const existing = makeUser();

      // getUserByEmail → user exists
      mockedPool.query.mockResolvedValueOnce({ rows: [existing], rowCount: 1 } as any);

      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Test', email: 'test@example.com', password: 'Password123' });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/already registered/i);
    });

    it('should return 400 for invalid email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Test', email: 'not-an-email', password: 'Password123' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 for short password (< 8 chars)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Test', email: 'short@example.com', password: '123' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 when required fields are missing', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // 2. Login
  // -----------------------------------------------------------------------
  describe('POST /api/auth/login', () => {
    it('should login with valid credentials and return 200 with token', async () => {
      const user = makeUser();

      // getUserByEmail
      mockedPool.query.mockResolvedValueOnce({ rows: [user], rowCount: 1 } as any);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'Password123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(typeof res.body.data.token).toBe('string');
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.email).toBe('test@example.com');
    });

    it('should return 401 for wrong password', async () => {
      const user = makeUser();

      // getUserByEmail
      mockedPool.query.mockResolvedValueOnce({ rows: [user], rowCount: 1 } as any);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'WrongPassword' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/invalid credentials/i);
    });

    it('should return 401 for non-existent email', async () => {
      // getUserByEmail → no user
      mockedPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nobody@example.com', password: 'Password123' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // 3. Token validation – GET /api/auth/me
  // -----------------------------------------------------------------------
  describe('GET /api/auth/me', () => {
    it('should return 200 with user data for valid token', async () => {
      const user = makeUser();

      // Login first to get a valid token
      mockedPool.query.mockResolvedValueOnce({ rows: [user], rowCount: 1 } as any);

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'Password123' });

      const token = loginRes.body.data.token;

      // getUserById for /me
      mockedPool.query.mockResolvedValueOnce({ rows: [user], rowCount: 1 } as any);

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(VALID_UUID);
      expect(res.body.data.email).toBe('test@example.com');
    });

    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 401 with invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid.token.here');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // 4. Profile update
  // -----------------------------------------------------------------------
  describe('PUT /api/auth/profile', () => {
    it('should update profile with valid data and return 200', async () => {
      const token = await loginAndGetToken();
      const updatedUser = makeUser({ name: 'Updated Name', timezone: 'Europe/Berlin' });

      // updateUserProfile query
      mockedPool.query.mockResolvedValueOnce({ rows: [updatedUser], rowCount: 1 } as any);

      const res = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated Name', timezone: 'Europe/Berlin' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });

    it('should return 401 without authentication', async () => {
      const res = await request(app)
        .put('/api/auth/profile')
        .send({ name: 'Sneaky' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // 5. Logout (last – blacklist is an in-memory Set that persists across tests)
  // -----------------------------------------------------------------------
  describe('POST /api/auth/logout', () => {
    it('should logout and blacklist the token', async () => {
      const token = await loginAndGetToken();

      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toMatch(/logged out/i);
    });

    it('should reject a blacklisted token on subsequent requests', async () => {
      const token = await loginAndGetToken();

      // Logout → blacklists token
      await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      // Try to access /me with the same (now blacklisted) token
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});
