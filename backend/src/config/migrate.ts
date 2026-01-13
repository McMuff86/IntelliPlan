import fs from 'fs';
import path from 'path';
import { pool } from './database';

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
        console.log(`Running migration: ${file}`);
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
        
        await pool.query(sql);
        await pool.query(
          'INSERT INTO migrations (name) VALUES ($1)',
          [file]
        );
        
        console.log(`Completed: ${file}`);
      } else {
        console.log(`Skipping (already run): ${file}`);
      }
    }

    console.log('All migrations complete');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

runMigrations()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
