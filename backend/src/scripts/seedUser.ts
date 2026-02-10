import { pool } from '../config/database';
import bcrypt from 'bcryptjs';
import logger from '../config/logger';
import type { UserRole } from '../models/user';

interface SeedOptions {
  email: string;
  name: string;
  role: UserRole;
  timezone: string;
  password: string | null;
  verifyEmail: boolean;
}

const getSeedOptions = (): SeedOptions => ({
  email: process.env.SEED_USER_EMAIL || 'demo@intelliplan.local',
  name: process.env.SEED_USER_NAME || 'Demo User',
  role: (process.env.SEED_USER_ROLE as UserRole) || 'single',
  timezone: process.env.SEED_USER_TIMEZONE || 'UTC',
  password: process.env.SEED_USER_PASSWORD || null,
  verifyEmail: process.env.SEED_USER_VERIFY_EMAIL !== 'false',
});

async function seedUser(): Promise<void> {
  const options = getSeedOptions();
  const passwordHash = options.password ? await bcrypt.hash(options.password, 10) : null;
  const emailVerifiedAt = options.verifyEmail ? new Date() : null;

  const result = await pool.query<{ id: string; email_verified: boolean; has_password: boolean }>(
    `INSERT INTO users (email, name, role, timezone, password_hash, email_verified_at, email_verification_token, email_verification_expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, NULL, NULL)
     ON CONFLICT (email)
     DO UPDATE SET
       name = EXCLUDED.name,
       role = EXCLUDED.role,
       timezone = EXCLUDED.timezone,
       password_hash = COALESCE(EXCLUDED.password_hash, users.password_hash),
       email_verified_at = CASE
         WHEN EXCLUDED.email_verified_at IS NOT NULL THEN COALESCE(users.email_verified_at, EXCLUDED.email_verified_at)
         ELSE users.email_verified_at
       END,
       email_verification_token = CASE
         WHEN EXCLUDED.email_verified_at IS NOT NULL THEN NULL
         ELSE users.email_verification_token
       END,
       email_verification_expires_at = CASE
         WHEN EXCLUDED.email_verified_at IS NOT NULL THEN NULL
         ELSE users.email_verification_expires_at
       END,
       updated_at = NOW()
     RETURNING id, email_verified_at IS NOT NULL AS email_verified, password_hash IS NOT NULL AS has_password`,
    [options.email, options.name, options.role, options.timezone, passwordHash, emailVerifiedAt]
  );

  const seeded = result.rows[0];
  logger.info({
    userId: seeded?.id,
    email: options.email,
    role: options.role,
    timezone: options.timezone,
    emailVerified: seeded?.email_verified ?? false,
    hasPassword: seeded?.has_password ?? false,
  }, 'Seed user ready');
}

seedUser()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.error({ err: error }, 'Seed user failed');
    process.exit(1);
  });
