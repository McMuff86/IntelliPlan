export type ProjectPriority = 'low' | 'normal' | 'high' | 'urgent';
export type ProjectRiskLevel = 'low' | 'medium' | 'high' | 'critical';

export const VALID_PROJECT_PRIORITIES: ProjectPriority[] = ['low', 'normal', 'high', 'urgent'];
export const VALID_PROJECT_RISK_LEVELS: ProjectRiskLevel[] = ['low', 'medium', 'high', 'critical'];

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
  order_number: string | null;
  customer_name: string | null;
  installation_location: string | null;
  color: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  needs_callback: boolean;
  sachbearbeiter: string | null;
  worker_count: number | null;
  helper_count: number | null;
  remarks: string | null;
  target_end_date: string | null;
  priority: ProjectPriority;
  risk_level: ProjectRiskLevel;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
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
  orderNumber: string | null;
  customerName: string | null;
  installationLocation: string | null;
  color: string | null;
  contactName: string | null;
  contactPhone: string | null;
  needsCallback: boolean;
  sachbearbeiter: string | null;
  workerCount: number | null;
  helperCount: number | null;
  remarks: string | null;
  targetEndDate: string | null;
  priority: ProjectPriority;
  riskLevel: ProjectRiskLevel;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
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
  orderNumber: project.order_number,
  customerName: project.customer_name,
  installationLocation: project.installation_location,
  color: project.color,
  contactName: project.contact_name,
  contactPhone: project.contact_phone,
  needsCallback: project.needs_callback,
  sachbearbeiter: project.sachbearbeiter,
  workerCount: project.worker_count ? Number(project.worker_count) : null,
  helperCount: project.helper_count ? Number(project.helper_count) : null,
  remarks: project.remarks,
  targetEndDate: project.target_end_date,
  priority: project.priority ?? 'normal',
  riskLevel: project.risk_level ?? 'medium',
  createdAt: project.created_at,
  updatedAt: project.updated_at,
  deletedAt: project.deleted_at,
});
