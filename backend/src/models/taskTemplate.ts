export type TaskCategory =
  | 'planning'
  | 'procurement'
  | 'production'
  | 'treatment'
  | 'assembly'
  | 'delivery'
  | 'approval'
  | 'documentation';

export interface TemplateTask {
  id: string;
  order: number;
  code?: string;
  name: string;
  description?: string;
  estimatedDuration?: number;
  durationUnit: 'hours' | 'days';
  dependsOn?: string[];
  category: TaskCategory;
  isOptional: boolean;
  defaultAssignee?: string;
  checklistItems?: string[];
}

export interface TaskTemplate {
  id: string;
  product_type_id: string;
  name: string;
  description: string | null;
  tasks: TemplateTask[];
  is_default: boolean;
  is_system: boolean;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskTemplateResponse {
  id: string;
  productTypeId: string;
  name: string;
  description: string | null;
  tasks: TemplateTask[];
  isDefault: boolean;
  isSystem: boolean;
  ownerId: string | null;
  createdAt: string;
  updatedAt: string;
}

export const toTaskTemplateResponse = (t: TaskTemplate): TaskTemplateResponse => ({
  id: t.id,
  productTypeId: t.product_type_id,
  name: t.name,
  description: t.description,
  tasks: t.tasks,
  isDefault: t.is_default,
  isSystem: t.is_system,
  ownerId: t.owner_id,
  createdAt: t.created_at,
  updatedAt: t.updated_at,
});
