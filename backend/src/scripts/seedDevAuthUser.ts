import { pool } from '../config/database';
import logger from '../config/logger';
import bcrypt from 'bcryptjs';
import type { UserRole } from '../models/user';

interface DevSeedOptions {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  timezone: string;
}

const getOptions = (): DevSeedOptions => ({
  email: process.env.DEV_AUTH_EMAIL || 'dev@intelliplan.ch',
  password: process.env.DEV_AUTH_PASSWORD || 'Dev12345',
  name: process.env.DEV_AUTH_NAME || 'Dev User',
  role: (process.env.DEV_AUTH_ROLE as UserRole) || 'admin',
  timezone: process.env.DEV_AUTH_TIMEZONE || 'Europe/Zurich',
});

async function seedDevAuthUser(): Promise<void> {
  const options = getOptions();
  const passwordHash = await bcrypt.hash(options.password, 10);

  const result = await pool.query<{ id: string }>(
    `INSERT INTO users (email, name, role, timezone, password_hash, email_verified_at, email_verification_token, email_verification_expires_at)
     VALUES ($1, $2, $3, $4, $5, NOW(), NULL, NULL)
     ON CONFLICT (email)
     DO UPDATE SET
       name = EXCLUDED.name,
       role = EXCLUDED.role,
       timezone = EXCLUDED.timezone,
       password_hash = EXCLUDED.password_hash,
       email_verified_at = COALESCE(users.email_verified_at, NOW()),
       email_verification_token = NULL,
       email_verification_expires_at = NULL,
       updated_at = NOW()
     RETURNING id`,
    [options.email, options.name, options.role, options.timezone, passwordHash]
  );

  logger.info(
    {
      userId: result.rows[0]?.id,
      email: options.email,
      role: options.role,
      timezone: options.timezone,
    },
    'Dev auth user seeded'
  );
}

seedDevAuthUser()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.error({ err: error }, 'Seed dev auth user failed');
    process.exit(1);
  });
