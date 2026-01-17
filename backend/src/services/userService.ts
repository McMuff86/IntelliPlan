import { pool } from '../config/database';
import { User } from '../models/user';

export async function getUserByEmail(email: string): Promise<User | null> {
  const result = await pool.query<User>(
    `SELECT * FROM users WHERE email = $1`,
    [email]
  );

  return result.rows[0] || null;
}

export async function createUser(data: {
  email: string;
  name: string;
  role: string;
  timezone: string;
  password_hash: string | null;
}): Promise<User> {
  const result = await pool.query<User>(
    `INSERT INTO users (email, name, role, timezone, password_hash)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [data.email, data.name, data.role, data.timezone, data.password_hash]
  );

  return result.rows[0];
}

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
