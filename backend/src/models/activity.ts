export type ActivityEntityType = 'project' | 'task' | 'work_slot' | 'dependency';

export interface ProjectActivity {
  id: string;
  project_id: string;
  actor_user_id: string | null;
  entity_type: ActivityEntityType;
  action: string;
  summary: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface ProjectActivityResponse {
  id: string;
  projectId: string;
  actorUserId: string | null;
  entityType: ActivityEntityType;
  action: string;
  summary: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export const toProjectActivityResponse = (activity: ProjectActivity): ProjectActivityResponse => ({
  id: activity.id,
  projectId: activity.project_id,
  actorUserId: activity.actor_user_id,
  entityType: activity.entity_type,
  action: activity.action,
  summary: activity.summary,
  metadata: activity.metadata,
  createdAt: activity.created_at,
});
