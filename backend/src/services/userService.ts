import { pool } from '../config/database';
import { User } from '../models/user';

export async function getUserById(id: string): Promise<User | null> {
  const result = await pool.query<User>(
    `SELECT * FROM users WHERE id = $1`,
    [id]
  );

  return result.rows[0] || null;
}

export async function getUserRole(userId: string): Promise<string | null> {
  const result = await pool.query<{ role: string }>(
    `SELECT role FROM users WHERE id = $1`,
    [userId]
  );

  return result.rows[0]?.role || null;
}

export async function getUserTeamId(userId: string): Promise<string | null> {
  const result = await pool.query<{ team_id: string | null }>(
    `SELECT team_id FROM users WHERE id = $1`,
    [userId]
  );

  return result.rows[0]?.team_id || null;
}
