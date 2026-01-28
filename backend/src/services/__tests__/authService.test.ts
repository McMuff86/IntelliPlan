import { describe, it, expect, beforeAll } from 'vitest';

// Must set JWT_SECRET before importing authService (it checks on load)
process.env.JWT_SECRET = 'test-secret-for-vitest-unit-tests';

import {
  hashPassword,
  verifyPassword,
  signToken,
  verifyToken,
  generateToken,
  hashToken,
} from '../authService';

describe('authService', () => {
  describe('hashPassword / verifyPassword', () => {
    it('should hash a password and verify it successfully', async () => {
      const password = 'SuperSecret123!';
      const hashed = await hashPassword(password);

      expect(hashed).not.toBe(password);
      expect(hashed).toMatch(/^\$2[aby]?\$/); // bcrypt hash prefix

      const isValid = await verifyPassword(password, hashed);
      expect(isValid).toBe(true);
    });

    it('should reject wrong password', async () => {
      const hashed = await hashPassword('correct-password');
      const isValid = await verifyPassword('wrong-password', hashed);
      expect(isValid).toBe(false);
    });

    it('should produce different hashes for same password (salt)', async () => {
      const password = 'SamePassword';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('signToken / verifyToken', () => {
    it('should sign and verify a JWT token', () => {
      const userId = 'user-abc-123';
      const token = signToken(userId);

      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts

      const result = verifyToken(token);
      expect(result).toBe(userId);
    });

    it('should return null for invalid token', () => {
      const result = verifyToken('invalid.token.here');
      expect(result).toBeNull();
    });

    it('should return null for tampered token', () => {
      const token = signToken('user-123');
      const tampered = token.slice(0, -5) + 'XXXXX';
      const result = verifyToken(tampered);
      expect(result).toBeNull();
    });
  });

  describe('generateToken', () => {
    it('should generate a 64-char hex string (32 bytes)', () => {
      const token = generateToken();
      expect(token).toHaveLength(64);
      expect(token).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should generate unique tokens', () => {
      const tokens = new Set(Array.from({ length: 100 }, () => generateToken()));
      expect(tokens.size).toBe(100);
    });
  });

  describe('hashToken', () => {
    it('should produce a SHA-256 hex hash', () => {
      const token = 'some-token-value';
      const hashed = hashToken(token);

      expect(hashed).toHaveLength(64); // SHA-256 = 64 hex chars
      expect(hashed).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should produce same hash for same input (deterministic)', () => {
      const token = 'deterministic-test';
      expect(hashToken(token)).toBe(hashToken(token));
    });

    it('should produce different hashes for different inputs', () => {
      expect(hashToken('token-a')).not.toBe(hashToken('token-b'));
    });
  });
});
