import { pool } from '../config/database';
import type { ActivityEntityType, ProjectActivity } from '../models/activity';

export interface CreateProjectActivityDTO {
  project_id: string;
  actor_user_id: string | null;
  entity_type: ActivityEntityType;
  action: string;
  summary: string;
  metadata?: Record<string, unknown> | null;
}

export async function createProjectActivity(data: CreateProjectActivityDTO): Promise<ProjectActivity> {
  const result = await pool.query<ProjectActivity>(
    `INSERT INTO project_activity (
        project_id,
        actor_user_id,
        entity_type,
        action,
        summary,
        metadata
     ) VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      data.project_id,
      data.actor_user_id,
      data.entity_type,
      data.action,
      data.summary,
      data.metadata ?? null,
    ]
  );

  return result.rows[0];
}

export async function listProjectActivity(projectId: string, ownerId: string): Promise<ProjectActivity[]> {
  const result = await pool.query<ProjectActivity>(
    `SELECT pa.*
     FROM project_activity pa
     JOIN projects p ON pa.project_id = p.id
     WHERE pa.project_id = $1 AND p.owner_id = $2
     ORDER BY pa.created_at DESC`,
    [projectId, ownerId]
  );

  return result.rows;
}
