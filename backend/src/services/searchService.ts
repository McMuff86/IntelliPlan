import { pool } from '../config/database';
import type { Appointment } from '../models/appointment';
import type { Project } from '../models/project';
import type { Task } from '../models/task';

export interface PaginatedSearchResult<T> {
  items: T[];
  total: number;
  page: number;
  totalPages: number;
}

export interface SearchAppointmentsOptions {
  userId: string;
  q?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export async function searchAppointments(
  options: SearchAppointmentsOptions
): Promise<PaginatedSearchResult<Appointment>> {
  const { userId, q, from, to, page = 1, limit = 20 } = options;
  const offset = (page - 1) * limit;

  const params: (string | number)[] = [userId];
  let paramIndex = 2;
  let whereClause = 'WHERE user_id = $1 AND deleted_at IS NULL';

  if (q) {
    whereClause += ` AND (title ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
    params.push(`%${q}%`);
    paramIndex++;
  }

  if (from) {
    whereClause += ` AND start_time >= $${paramIndex}`;
    params.push(from);
    paramIndex++;
  }

  if (to) {
    whereClause += ` AND end_time <= $${paramIndex}`;
    params.push(to);
    paramIndex++;
  }

  const countResult = await pool.query<{ count: string }>(
    `SELECT COUNT(*) as count FROM appointments ${whereClause}`,
    params
  );

  const total = parseInt(countResult.rows[0].count, 10);

  params.push(limit, offset);
  const result = await pool.query<Appointment>(
    `SELECT * FROM appointments ${whereClause} ORDER BY start_time ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    params
  );

  return {
    items: result.rows,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

export interface SearchProjectsOptions {
  userId: string;
  q?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export async function searchProjects(
  options: SearchProjectsOptions
): Promise<PaginatedSearchResult<Project>> {
  const { userId, q, status, page = 1, limit = 20 } = options;
  const offset = (page - 1) * limit;

  const params: (string | number)[] = [userId];
  let paramIndex = 2;
  let whereClause = 'WHERE owner_id = $1 AND deleted_at IS NULL';

  if (q) {
    whereClause += ` AND (name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
    params.push(`%${q}%`);
    paramIndex++;
  }

  // Projects don't have a status column in DB, but we can filter logically
  // For now, status filter is a no-op placeholder for future use
  if (status) {
    // Reserved for future implementation when status column is added
    void status;
  }

  const countResult = await pool.query<{ count: string }>(
    `SELECT COUNT(*) as count FROM projects ${whereClause}`,
    params
  );

  const total = parseInt(countResult.rows[0].count, 10);

  params.push(limit, offset);
  const result = await pool.query<Project>(
    `SELECT * FROM projects ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    params
  );

  return {
    items: result.rows,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

export interface SearchTasksOptions {
  userId: string;
  q?: string;
  projectId?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export async function searchTasks(
  options: SearchTasksOptions
): Promise<PaginatedSearchResult<Task>> {
  const { userId, q, projectId, status, page = 1, limit = 20 } = options;
  const offset = (page - 1) * limit;

  const params: (string | number)[] = [userId];
  let paramIndex = 2;
  let whereClause = 'WHERE owner_id = $1 AND deleted_at IS NULL';

  if (q) {
    whereClause += ` AND (title ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
    params.push(`%${q}%`);
    paramIndex++;
  }

  if (projectId) {
    whereClause += ` AND project_id = $${paramIndex}`;
    params.push(projectId);
    paramIndex++;
  }

  if (status) {
    whereClause += ` AND status = $${paramIndex}`;
    params.push(status);
    paramIndex++;
  }

  const countResult = await pool.query<{ count: string }>(
    `SELECT COUNT(*) as count FROM tasks ${whereClause}`,
    params
  );

  const total = parseInt(countResult.rows[0].count, 10);

  params.push(limit, offset);
  const result = await pool.query<Task>(
    `SELECT * FROM tasks ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    params
  );

  return {
    items: result.rows,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}
