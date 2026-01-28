import { pool } from '../config/database';
import { hashPassword } from '../services/authService';
import logger from '../config/logger';

interface SeedOptions {
  email: string;
  name: string;
  role: 'admin' | 'single' | 'team';
  timezone: string;
  password: string | null;
}

const getSeedOptions = (): SeedOptions => ({
  email: process.env.SEED_USER_EMAIL || 'demo@intelliplan.local',
  name: process.env.SEED_USER_NAME || 'Demo User',
  role: (process.env.SEED_USER_ROLE as SeedOptions['role']) || 'single',
  timezone: process.env.SEED_USER_TIMEZONE || 'UTC',
  password: process.env.SEED_USER_PASSWORD || null,
});

async function seedUser(): Promise<void> {
  const options = getSeedOptions();
  const passwordHash = options.password ? await hashPassword(options.password) : null;

  const result = await pool.query<{ id: string }>(
    `INSERT INTO users (email, name, role, timezone, password_hash)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (email)
     DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role, timezone = EXCLUDED.timezone, password_hash = EXCLUDED.password_hash, updated_at = NOW()
     RETURNING id`,
    [options.email, options.name, options.role, options.timezone, passwordHash]
  );

  const userId = result.rows[0]?.id;
  logger.info({
    userId,
    email: options.email,
    role: options.role,
    timezone: options.timezone,
  }, 'Seed user ready');
}

seedUser()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.error({ err: error }, 'Seed user failed');
    process.exit(1);
  });
