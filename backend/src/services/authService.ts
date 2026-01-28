import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt, { type Secret } from 'jsonwebtoken';

if (!process.env.JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable is not set. Aborting startup.');
}

const JWT_SECRET: Secret = process.env.JWT_SECRET;
const TOKEN_EXPIRY = process.env.JWT_EXPIRY || '7d';

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY } as jwt.SignOptions);
}

export function verifyToken(token: string): string | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub?: string; userId?: string };
    return payload.sub || payload.userId || null;
  } catch {
    return null;
  }
}

export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
