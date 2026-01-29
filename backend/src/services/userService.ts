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
  email_verification_token?: string | null;
  email_verification_expires_at?: Date | null;
  email_verified_at?: Date | null;
}): Promise<User> {
  const result = await pool.query<User>(
    `INSERT INTO users (
        email,
        name,
        role,
        timezone,
        password_hash,
        email_verification_token,
        email_verification_expires_at,
        email_verified_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      data.email,
      data.name,
      data.role,
      data.timezone,
      data.password_hash,
      data.email_verification_token ?? null,
      data.email_verification_expires_at ?? null,
      data.email_verified_at ?? null,
    ]
  );

  return result.rows[0];
}

export async function getUserByEmailVerificationToken(token: string): Promise<User | null> {
  const result = await pool.query<User>(
    `SELECT * FROM users
     WHERE email_verification_token = $1
       AND email_verification_expires_at > NOW()`,
    [token]
  );

  return result.rows[0] || null;
}

export async function markUserEmailVerified(userId: string): Promise<void> {
  await pool.query(
    `UPDATE users
     SET email_verified_at = NOW(),
         email_verification_token = NULL,
         email_verification_expires_at = NULL,
         updated_at = NOW()
     WHERE id = $1`,
    [userId]
  );
}

export async function setPasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<void> {
  await pool.query(
    `UPDATE users
     SET password_reset_token = $1,
         password_reset_expires_at = $2,
         updated_at = NOW()
     WHERE id = $3`,
    [token, expiresAt, userId]
  );
}

export async function getUserByPasswordResetToken(token: string): Promise<User | null> {
  const result = await pool.query<User>(
    `SELECT * FROM users
     WHERE password_reset_token = $1
       AND password_reset_expires_at > NOW()`,
    [token]
  );

  return result.rows[0] || null;
}

export async function updateUserPassword(userId: string, passwordHash: string): Promise<void> {
  await pool.query(
    `UPDATE users
     SET password_hash = $1,
         password_reset_token = NULL,
         password_reset_expires_at = NULL,
         updated_at = NOW()
     WHERE id = $2`,
    [passwordHash, userId]
  );
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

export async function updateUserIndustry(userId: string, industryId: string | null): Promise<User> {
  const result = await pool.query<User>(
    `UPDATE users SET industry_id = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [industryId, userId]
  );
  return result.rows[0];
}

export async function updateUserProfile(
  userId: string,
  data: { name?: string; timezone?: string }
): Promise<User> {
  const updates: string[] = [];
  const values: (string | Date)[] = [];
  let paramIndex = 1;

  if (data.name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    values.push(data.name);
  }

  if (data.timezone !== undefined) {
    updates.push(`timezone = $${paramIndex++}`);
    values.push(data.timezone);
  }

  updates.push(`updated_at = $${paramIndex++}`);
  values.push(new Date());

  values.push(userId);

  const result = await pool.query<User>(
    `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );

  return result.rows[0];
}

export async function getUserAllData(userId: string): Promise<Record<string, unknown>> {
  const userResult = await pool.query(
    `SELECT id, email, name, role, team_id, timezone, created_at, updated_at FROM users WHERE id = $1`,
    [userId]
  );
  const appointmentsResult = await pool.query(
    `SELECT id, title, description, start_time, end_time, timezone, created_at, updated_at FROM appointments WHERE user_id = $1 AND deleted_at IS NULL`,
    [userId]
  );
  const projectsResult = await pool.query(
    `SELECT id, name, description, include_weekends, workday_start, workday_end, created_at, updated_at FROM projects WHERE owner_id = $1 AND deleted_at IS NULL`,
    [userId]
  );
  const tasksResult = await pool.query(
    `SELECT t.id, t.title, t.description, t.status, t.duration_minutes, t.start_date, t.due_date, t.created_at, t.updated_at
     FROM tasks t JOIN projects p ON t.project_id = p.id WHERE p.owner_id = $1 AND t.deleted_at IS NULL`,
    [userId]
  );
  const remindersResult = await pool.query(
    `SELECT id, title, description, remind_at, is_recurring, recurrence_pattern, created_at FROM reminders WHERE user_id = $1`,
    [userId]
  );
  const auditResult = await pool.query(
    `SELECT action, entity_type, created_at FROM audit_logs WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );

  return {
    exportDate: new Date().toISOString(),
    gdprArticle: 'Article 20 - Right to Data Portability',
    user: userResult.rows[0] || null,
    appointments: appointmentsResult.rows,
    projects: projectsResult.rows,
    tasks: tasksResult.rows,
    reminders: remindersResult.rows,
    auditLog: auditResult.rows,
  };
}

export async function softDeleteUser(userId: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`UPDATE appointments SET deleted_at = NOW() WHERE user_id = $1 AND deleted_at IS NULL`, [userId]);
    const projectIds = await client.query<{ id: string }>(`SELECT id FROM projects WHERE owner_id = $1 AND deleted_at IS NULL`, [userId]);
    for (const row of projectIds.rows) {
      await client.query(`UPDATE tasks SET deleted_at = NOW() WHERE project_id = $1 AND deleted_at IS NULL`, [row.id]);
    }
    await client.query(`UPDATE projects SET deleted_at = NOW() WHERE owner_id = $1 AND deleted_at IS NULL`, [userId]);
    await client.query(`DELETE FROM reminders WHERE user_id = $1`, [userId]);
    await client.query(
      `UPDATE users SET name = 'Deleted User', email = 'deleted_' || id || '@deleted.local', password_hash = NULL, email_verification_token = NULL, password_reset_token = NULL, updated_at = NOW() WHERE id = $1`,
      [userId]
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
