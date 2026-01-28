import fs from 'fs';
import path from 'path';
import { pool } from './database';
import logger from './logger';

async function runMigrations(): Promise<void> {
  const migrationsDir = path.join(__dirname, '../../migrations');
  
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const result = await pool.query(
        'SELECT id FROM migrations WHERE name = $1',
        [file]
      );

      if (result.rows.length === 0) {
        logger.info({ migration: file }, 'Running migration');
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
        
        await pool.query(sql);
        await pool.query(
          'INSERT INTO migrations (name) VALUES ($1)',
          [file]
        );
        
        logger.info({ migration: file }, 'Migration completed');
      } else {
        logger.debug({ migration: file }, 'Skipping (already run)');
      }
    }

    logger.info('All migrations complete');
  } catch (error) {
    logger.error({ err: error }, 'Migration failed');
    throw error;
  }
}

runMigrations()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
