import { pool } from '../config/database';

interface SeedOptions {
  email: string;
  name: string;
  role: 'admin' | 'single' | 'team';
  timezone: string;
}

const getSeedOptions = (): SeedOptions => ({
  email: process.env.SEED_USER_EMAIL || 'demo@intelliplan.local',
  name: process.env.SEED_USER_NAME || 'Demo User',
  role: (process.env.SEED_USER_ROLE as SeedOptions['role']) || 'single',
  timezone: process.env.SEED_USER_TIMEZONE || 'UTC',
});

async function seedUser(): Promise<void> {
  const options = getSeedOptions();

  const result = await pool.query<{ id: string }>(
    `INSERT INTO users (email, name, role, timezone)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (email)
     DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role, timezone = EXCLUDED.timezone, updated_at = NOW()
     RETURNING id`,
    [options.email, options.name, options.role, options.timezone]
  );

  const userId = result.rows[0]?.id;
  console.log('Seed user ready');
  console.log(`User ID: ${userId}`);
  console.log(`Email: ${options.email}`);
  console.log(`Role: ${options.role}`);
  console.log(`Timezone: ${options.timezone}`);
}

seedUser()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Seed user failed:', error);
    process.exit(1);
  });
