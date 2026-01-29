export interface Project {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  include_weekends: boolean;
  workday_start: string;
  workday_end: string;
  work_template: string;
  task_template_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectResponse {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  includeWeekends: boolean;
  workdayStart: string;
  workdayEnd: string;
  workTemplate: string;
  taskTemplateId: string | null;
  createdAt: string;
  updatedAt: string;
}

export const toProjectResponse = (project: Project): ProjectResponse => ({
  id: project.id,
  name: project.name,
  description: project.description,
  ownerId: project.owner_id,
  includeWeekends: project.include_weekends,
  workdayStart: project.workday_start,
  workdayEnd: project.workday_end,
  workTemplate: project.work_template,
  taskTemplateId: project.task_template_id,
  createdAt: project.created_at,
  updatedAt: project.updated_at,
});
