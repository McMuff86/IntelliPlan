export type TaskStatus = 'planned' | 'in_progress' | 'blocked' | 'done';
export type SchedulingMode = 'manual' | 'auto';
export type DependencyType = 'finish_start' | 'start_start' | 'finish_finish';
export type ResourceType = 'person' | 'machine' | 'vehicle';
export type PhaseCode = 'ZUS' | 'CNC' | 'PROD' | 'VORBEH' | 'NACHBEH' | 'BESCHL' | 'TRANS' | 'MONT';

export const VALID_PHASE_CODES: PhaseCode[] = ['ZUS', 'CNC', 'PROD', 'VORBEH', 'NACHBEH', 'BESCHL', 'TRANS', 'MONT'];

export interface Task {
  id: string;
  project_id: string;
  owner_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  scheduling_mode: SchedulingMode;
  duration_minutes: number | null;
  resource_label: string | null;
  resource_id: string | null;
  start_date: string | null;
  due_date: string | null;
  reminder_enabled: boolean;
  phase_code: PhaseCode | null;
  planned_week: number | null;
  planned_year: number | null;
  created_at: string;
  updated_at: string;
}

export interface TaskResponse {
  id: string;
  projectId: string;
  ownerId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  schedulingMode: SchedulingMode;
  durationMinutes: number | null;
  resourceLabel: string | null;
  resourceId: string | null;
  resourceName?: string | null;
  resourceType?: ResourceType | null;
  startDate: string | null;
  dueDate: string | null;
  reminderEnabled: boolean;
  phaseCode: PhaseCode | null;
  plannedWeek: number | null;
  plannedYear: number | null;
  createdAt: string;
  updatedAt: string;
  isBlocked?: boolean;
}

export interface CreateTaskDTO {
  project_id: string;
  owner_id: string;
  title: string;
  description?: string;
  status?: TaskStatus;
  scheduling_mode?: SchedulingMode;
  duration_minutes?: number | null;
  resource_label?: string | null;
  resource_id?: string | null;
  start_date?: string | null;
  due_date?: string | null;
  reminder_enabled?: boolean;
  phase_code?: PhaseCode | null;
  planned_week?: number | null;
  planned_year?: number | null;
}

export interface UpdateTaskDTO {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  scheduling_mode?: SchedulingMode;
  duration_minutes?: number | null;
  resource_label?: string | null;
  resource_id?: string | null;
  start_date?: string | null;
  due_date?: string | null;
  reminder_enabled?: boolean;
  phase_code?: PhaseCode | null;
  planned_week?: number | null;
  planned_year?: number | null;
}

export interface TaskDependency {
  id: string;
  task_id: string;
  depends_on_task_id: string;
  dependency_type: DependencyType;
  created_at: string;
}

export interface TaskDependencyResponse {
  id: string;
  taskId: string;
  dependsOnTaskId: string;
  dependencyType: DependencyType;
  createdAt: string;
}

export interface TaskWorkSlot {
  id: string;
  task_id: string;
  start_time: string;
  end_time: string;
  is_fixed: boolean;
  is_all_day: boolean;
  reminder_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface TaskWorkSlotResponse {
  id: string;
  taskId: string;
  startTime: string;
  endTime: string;
  isFixed: boolean;
  isAllDay: boolean;
  reminderEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export const toTaskResponse = (
  task: Task & {
    is_blocked?: boolean | null;
    resource_name?: string | null;
    resource_type?: ResourceType | null;
  }
): TaskResponse => ({
  id: task.id,
  projectId: task.project_id,
  ownerId: task.owner_id,
  title: task.title,
  description: task.description,
  status: task.status,
  schedulingMode: task.scheduling_mode,
  durationMinutes: task.duration_minutes,
  resourceLabel: task.resource_label,
  resourceId: task.resource_id,
  resourceName: task.resource_name ?? null,
  resourceType: task.resource_type ?? null,
  startDate: task.start_date,
  dueDate: task.due_date,
  reminderEnabled: task.reminder_enabled,
  phaseCode: task.phase_code,
  plannedWeek: task.planned_week,
  plannedYear: task.planned_year,
  createdAt: task.created_at,
  updatedAt: task.updated_at,
  isBlocked: task.is_blocked ?? undefined,
});

export const toTaskDependencyResponse = (dependency: TaskDependency): TaskDependencyResponse => ({
  id: dependency.id,
  taskId: dependency.task_id,
  dependsOnTaskId: dependency.depends_on_task_id,
  dependencyType: dependency.dependency_type,
  createdAt: dependency.created_at,
});

export const toTaskWorkSlotResponse = (slot: TaskWorkSlot): TaskWorkSlotResponse => ({
  id: slot.id,
  taskId: slot.task_id,
  startTime: slot.start_time,
  endTime: slot.end_time,
  isFixed: slot.is_fixed,
  isAllDay: slot.is_all_day,
  reminderEnabled: slot.reminder_enabled,
  createdAt: slot.created_at,
  updatedAt: slot.updated_at,
});
